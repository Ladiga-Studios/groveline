-- One account, many seller profiles. Every seller-ish thing that used to
-- hang off a profile now hangs off a shop, owned by a profile. Existing
-- sellers get a shop with the same id as their profile so nothing moves.

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null unique,
  bio text,
  avatar_url text,
  town text not null,
  state text not null default 'AL',
  contact_phone text,
  social_url text,
  created_at timestamptz not null default now()
);
create index if not exists shops_owner_idx on public.shops (owner_id);

insert into public.shops (id, owner_id, name, slug, bio, avatar_url, town, state, contact_phone, social_url, created_at)
select p.id, p.id, coalesce(p.farm_name, p.name), p.slug, p.bio, p.avatar_url, p.town, coalesce(p.state, 'AL'),
       p.contact_phone, p.social_url, p.created_at
from public.profiles p
where p.is_seller
   or p.id in (select seller_id from public.drops)
   or p.id in (select seller_id from public.follows)
   or p.id in (select seller_id from public.newsletter_subscribers)
on conflict (id) do nothing;

-- Repoint foreign keys from profiles to shops. Constraint names are kept
-- so PostgREST joins keep working with the new target table.
alter table public.drops drop constraint if exists drops_seller_id_fkey;
alter table public.drops
  add constraint drops_seller_id_fkey foreign key (seller_id) references public.shops (id) on delete cascade;

alter table public.follows drop constraint if exists follows_seller_id_fkey;
alter table public.follows
  add constraint follows_seller_id_fkey foreign key (seller_id) references public.shops (id) on delete cascade;

alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_seller_id_fkey;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_seller_id_fkey foreign key (seller_id) references public.shops (id) on delete cascade;

-- Ownership helper used by every seller-side policy.
create or replace function public.owns_shop(p_shop uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from shops where id = p_shop and owner_id = auth.uid());
$$;

-- Shops policies
alter table public.shops enable row level security;
drop policy if exists "shops are public" on public.shops;
create policy "shops are public" on public.shops for select using (true);
drop policy if exists "owners create shops" on public.shops;
create policy "owners create shops" on public.shops for insert with check (auth.uid() = owner_id);
drop policy if exists "owners update shops" on public.shops;
create policy "owners update shops" on public.shops for update using (auth.uid() = owner_id);
drop policy if exists "owners delete shops" on public.shops;
create policy "owners delete shops" on public.shops for delete using (auth.uid() = owner_id);

-- Drops
drop policy if exists "sellers create own drops" on public.drops;
create policy "sellers create own drops" on public.drops for insert with check (public.owns_shop(seller_id));
drop policy if exists "sellers update own drops" on public.drops;
create policy "sellers update own drops" on public.drops for update using (public.owns_shop(seller_id));
drop policy if exists "sellers delete own drops" on public.drops;
create policy "sellers delete own drops" on public.drops for delete using (public.owns_shop(seller_id));

-- Claims
drop policy if exists "sellers read own claims" on public.claims;
create policy "sellers read own claims" on public.claims for select using (
  exists (select 1 from drops d where d.id = claims.drop_id and public.owns_shop(d.seller_id))
);
drop policy if exists "sellers update own claims" on public.claims;
create policy "sellers update own claims" on public.claims for update using (
  exists (select 1 from drops d where d.id = claims.drop_id and public.owns_shop(d.seller_id))
);

-- Waitlist
drop policy if exists "sellers read own waitlist" on public.waitlist_entries;
create policy "sellers read own waitlist" on public.waitlist_entries for select using (
  exists (select 1 from drops d where d.id = waitlist_entries.drop_id and public.owns_shop(d.seller_id))
);

-- Follows: anyone can see who follows what (it's public on every platform),
-- only the follower can add or remove.
drop policy if exists "read own follows or followers" on public.follows;
drop policy if exists "follows are public" on public.follows;
create policy "follows are public" on public.follows for select using (true);

-- Newsletter subscribers
drop policy if exists "sellers read own subscribers" on public.newsletter_subscribers;
create policy "sellers read own subscribers" on public.newsletter_subscribers for select using (public.owns_shop(seller_id));

-- remove_claim now checks shop ownership
create or replace function public.remove_claim(p_claim uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drop uuid;
  v_qty integer;
  v_shop uuid;
  v_cancelled timestamptz;
begin
  select drop_id, quantity, cancelled_at into v_drop, v_qty, v_cancelled from claims where id = p_claim;
  if v_drop is null then raise exception 'not_found'; end if;
  select seller_id into v_shop from drops where id = v_drop;
  if v_shop is null or not public.owns_shop(v_shop) then raise exception 'not_allowed'; end if;
  if v_cancelled is not null then return; end if;
  update claims
  set cancelled_at = now(),
      payment_status = case when payment_status in ('pending', 'authorized') then 'cancelled' else payment_status end
  where id = p_claim;
  update drops set claimed = greatest(0, claimed - v_qty) where id = v_drop;
end;
$$;

-- seller_stats now describes a shop
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
    'items_sold', (select coalesce(sum(c.quantity), 0) from claims c join drops d on d.id = c.drop_id
                   where d.seller_id = p_seller and c.cancelled_at is null),
    'sold_out', (select count(*) from drops where seller_id = p_seller and claimed >= quantity and quantity > 0),
    'member_since', (select created_at from shops where id = p_seller)
  );
$$;
