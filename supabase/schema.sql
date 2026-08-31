-- Groveline schema. Run this once in the Supabase SQL editor.

-- Profiles: one row per user. Sellers and buyers share the table.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  farm_name text,
  town text not null,
  slug text not null unique,
  is_seller boolean not null default false,
  bio text,
  created_at timestamptz not null default now()
);

-- Drops: one sale event.
create table public.drops (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text,
  photo_url text,
  price_cents integer not null check (price_cents >= 0),
  quantity integer not null check (quantity > 0),
  claimed integer not null default 0 check (claimed >= 0 and claimed <= quantity),
  max_per_buyer integer,
  pickup_place text not null,
  pickup_start timestamptz not null,
  pickup_end timestamptz not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now()
);
create index drops_active_idx on public.drops (status, pickup_end);
create index drops_seller_idx on public.drops (seller_id);

-- Claims: one reservation.
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops (id) on delete cascade,
  buyer_name text not null,
  buyer_phone text not null,
  buyer_email text,
  quantity integer not null check (quantity > 0),
  method text not null default 'cash' check (method in ('cash', 'card')),
  paid boolean not null default false,
  picked_up boolean not null default false,
  created_at timestamptz not null default now()
);
create index claims_drop_idx on public.claims (drop_id);

-- Waitlist for sold out drops.
create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops (id) on delete cascade,
  phone text not null,
  created_at timestamptz not null default now()
);

-- Buyer follows seller.
create table public.follows (
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (buyer_id, seller_id)
);

-- Newsletter subscribers per seller, powered by Resend.
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (seller_id, email)
);

-- Atomic claim. Checks remaining quantity and inserts in one statement so
-- two buyers can never claim the same last loaf.
create or replace function public.claim_drop(
  p_drop uuid,
  p_qty integer,
  p_name text,
  p_phone text,
  p_email text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_id uuid;
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

  insert into claims (drop_id, buyer_name, buyer_phone, buyer_email, quantity)
  values (p_drop, p_name, p_phone, p_email, p_qty)
  returning id into v_claim_id;

  select count(*) into v_position from claims where drop_id = p_drop;

  return json_build_object('claim_id', v_claim_id, 'position', v_position);
end;
$$;

-- Row level security.
alter table public.profiles enable row level security;
alter table public.drops enable row level security;
alter table public.claims enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.follows enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- Profiles: public read, owner writes.
create policy "profiles are public" on public.profiles
  for select using (true);
create policy "users create own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Drops: public read, seller writes own.
create policy "drops are public" on public.drops
  for select using (true);
create policy "sellers create own drops" on public.drops
  for insert with check (auth.uid() = seller_id);
create policy "sellers update own drops" on public.drops
  for update using (auth.uid() = seller_id);
create policy "sellers delete own drops" on public.drops
  for delete using (auth.uid() = seller_id);

-- Claims: sellers see and update claims on their own drops. Inserts happen
-- through the claim_drop function with the service role, never directly.
create policy "sellers read own claims" on public.claims
  for select using (
    exists (
      select 1 from drops where drops.id = claims.drop_id
        and drops.seller_id = auth.uid()
    )
  );
create policy "sellers update own claims" on public.claims
  for update using (
    exists (
      select 1 from drops where drops.id = claims.drop_id
        and drops.seller_id = auth.uid()
    )
  );

-- Waitlist: sellers read their own. Inserts via service role.
create policy "sellers read own waitlist" on public.waitlist_entries
  for select using (
    exists (
      select 1 from drops where drops.id = waitlist_entries.drop_id
        and drops.seller_id = auth.uid()
    )
  );

-- Follows: users manage their own, sellers can count their followers.
create policy "read own follows or followers" on public.follows
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "users follow" on public.follows
  for insert with check (auth.uid() = buyer_id);
create policy "users unfollow" on public.follows
  for delete using (auth.uid() = buyer_id);

-- Newsletter: sellers read their own list. Inserts via service role.
create policy "sellers read own subscribers" on public.newsletter_subscribers
  for select using (auth.uid() = seller_id);

-- Storage: public bucket for drop photos. Sellers upload to their own folder.
insert into storage.buckets (id, name, public) values ('drop-photos', 'drop-photos', true);
create policy "public read drop photos" on storage.objects
  for select using (bucket_id = 'drop-photos');
create policy "sellers upload own photos" on storage.objects
  for insert with check (
    bucket_id = 'drop-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
