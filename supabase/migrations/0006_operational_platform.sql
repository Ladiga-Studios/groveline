-- The operational platform pass. Expanded categories, pickup addresses with
-- coordinates, seller profile fields, Stripe billing, buyer-linked claims
-- with self-cancel tokens, reports, and the functions that support them.

-- ============================================================
-- Drops: categories, pickup location, views, removed status
-- ============================================================

alter table public.drops drop constraint if exists drops_category_check;

update public.drops set category = case category
  when 'baked' then 'bread'
  when 'produce' then 'vegetables'
  when 'meat' then 'beef'
  when 'plants' then 'seedlings'
  when 'crafts' then 'other-handmade'
  when 'plates' then 'plate-sale'
  else category end
where category in ('baked', 'produce', 'meat', 'plants', 'crafts', 'plates');

alter table public.drops
  add column if not exists pickup_address text,
  add column if not exists pickup_city text,
  add column if not exists pickup_state text,
  add column if not exists pickup_zip text,
  add column if not exists pickup_lat double precision,
  add column if not exists pickup_lng double precision,
  add column if not exists views integer not null default 0;

update public.drops d
set pickup_city = p.town, pickup_state = p.state
from public.profiles p
where p.id = d.seller_id and d.pickup_city is null;

alter table public.drops drop constraint if exists drops_status_check;
alter table public.drops
  add constraint drops_status_check check (status in ('active', 'closed', 'removed'));

create index if not exists drops_pickup_state_idx on public.drops (pickup_state, pickup_city);

-- ============================================================
-- Profiles: avatar, admin flag, notification preference, payouts flag
-- ============================================================

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists is_admin boolean not null default false,
  add column if not exists notify_on_claim boolean not null default true,
  add column if not exists payouts_enabled boolean not null default false;

-- ============================================================
-- Billing: Stripe ids live here, readable only by the owner
-- ============================================================

create table if not exists public.billing (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text,
  subscription_status text not null default 'none',
  stripe_account_id text,
  updated_at timestamptz not null default now()
);
alter table public.billing enable row level security;
drop policy if exists "owner reads billing" on public.billing;
create policy "owner reads billing" on public.billing
  for select using (auth.uid() = profile_id);

-- ============================================================
-- Claims: buyer account link, cancel token, payment tracking, reminders
-- ============================================================

alter table public.claims
  add column if not exists buyer_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists cancel_token text not null default md5(random()::text || clock_timestamp()::text || random()::text),
  add column if not exists payment_intent_id text,
  add column if not exists payment_status text not null default 'none',
  add column if not exists reminded_at timestamptz,
  add column if not exists cancelled_at timestamptz;

create index if not exists claims_token_idx on public.claims (cancel_token);
create index if not exists claims_buyer_idx on public.claims (buyer_user_id);
create index if not exists claims_pi_idx on public.claims (payment_intent_id);

drop policy if exists "buyers read own claims" on public.claims;
create policy "buyers read own claims" on public.claims
  for select using (auth.uid() = buyer_user_id);

-- ============================================================
-- Reports on listings
-- ============================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops (id) on delete cascade,
  reason text not null,
  details text,
  reporter_email text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "admins read reports" on public.reports;
create policy "admins read reports" on public.reports
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );
drop policy if exists "admins update reports" on public.reports;
create policy "admins update reports" on public.reports
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- ============================================================
-- Functions
-- ============================================================

-- Claim v2: records payment method and the buyer's account when logged in,
-- and returns the cancel token so the buyer gets a page they can manage.
create or replace function public.claim_drop_v2(
  p_drop uuid,
  p_qty integer,
  p_name text,
  p_phone text,
  p_email text,
  p_method text,
  p_buyer uuid
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_id uuid;
  v_token text;
  v_position integer;
begin
  update drops
  set claimed = claimed + p_qty
  where id = p_drop
    and status = 'active'
    and claimed + p_qty <= quantity;

  if not found then
    raise exception 'not_enough';
  end if;

  insert into claims (drop_id, buyer_name, buyer_phone, buyer_email, quantity, method, buyer_user_id, payment_status)
  values (p_drop, p_name, p_phone, p_email, p_qty, coalesce(p_method, 'cash'), p_buyer,
          case when p_method = 'card' then 'pending' else 'none' end)
  returning id, cancel_token into v_claim_id, v_token;

  select count(*) into v_position from claims where drop_id = p_drop and cancelled_at is null;

  return json_build_object('claim_id', v_claim_id, 'position', v_position, 'cancel_token', v_token);
end;
$$;

-- Soft-cancels a claim and returns the items to the drop. Service role only:
-- called by the buyer's own cancel page (token verified server side), by the
-- Stripe webhook when an unpaid checkout expires, and by the daily cleanup.
create or replace function public.release_claim(p_claim uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drop uuid;
  v_qty integer;
  v_cancelled timestamptz;
  v_picked boolean;
begin
  select drop_id, quantity, cancelled_at, picked_up
  into v_drop, v_qty, v_cancelled, v_picked
  from claims where id = p_claim;

  if v_drop is null or v_cancelled is not null or v_picked then
    return false;
  end if;

  update claims
  set cancelled_at = now(),
      payment_status = case when payment_status in ('pending', 'authorized') then 'cancelled' else payment_status end
  where id = p_claim;

  update drops set claimed = greatest(0, claimed - v_qty) where id = v_drop;
  return true;
end;
$$;
revoke execute on function public.release_claim(uuid) from public, anon, authenticated;
grant execute on function public.release_claim(uuid) to service_role;

-- Page view counter. Service role only, called from the drop page server side.
create or replace function public.increment_views(p_drop uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update drops set views = views + 1 where id = p_drop;
$$;
revoke execute on function public.increment_views(uuid) from public, anon, authenticated;
grant execute on function public.increment_views(uuid) to service_role;

-- Public stats for a seller's profile page. Counts only, no private data.
create or replace function public.seller_stats(p_seller uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'followers', (select count(*) from follows where seller_id = p_seller),
    'subscribers', (select count(*) from newsletter_subscribers where seller_id = p_seller),
    'drops_posted', (select count(*) from drops where seller_id = p_seller and status <> 'removed'),
    'items_sold', (select coalesce(sum(c.quantity), 0) from claims c
                   join drops d on d.id = c.drop_id
                   where d.seller_id = p_seller and c.cancelled_at is null),
    'sold_out', (select count(*) from drops where seller_id = p_seller and claimed >= quantity and quantity > 0),
    'member_since', (select created_at from profiles where id = p_seller)
  );
$$;

-- remove_claim (seller side) should also soft-cancel so payment records survive.
create or replace function public.remove_claim(p_claim uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drop uuid;
  v_qty integer;
  v_seller uuid;
  v_cancelled timestamptz;
begin
  select drop_id, quantity, cancelled_at into v_drop, v_qty, v_cancelled
  from claims where id = p_claim;

  if v_drop is null then
    raise exception 'not_found';
  end if;

  select seller_id into v_seller from drops where id = v_drop;
  if v_seller is null or v_seller <> auth.uid() then
    raise exception 'not_allowed';
  end if;

  if v_cancelled is not null then
    return;
  end if;

  update claims
  set cancelled_at = now(),
      payment_status = case when payment_status in ('pending', 'authorized') then 'cancelled' else payment_status end
  where id = p_claim;

  update drops set claimed = greatest(0, claimed - v_qty) where id = v_drop;
end;
$$;
