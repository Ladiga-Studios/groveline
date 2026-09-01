-- The free tier is "your first three drops", but it was enforced by
-- counting the rows in `drops` that still exist. Delete a drop and the
-- count goes down, so three free drops became unlimited free drops for
-- anyone willing to delete as they went. Deleting a whole shop cascaded
-- its drops away and reset the count even faster.
--
-- This counter only ever goes up. It's incremented when a drop is created
-- and never touched again, so deleting a drop, or a shop, or reposting,
-- can't hand a free slot back.

alter table public.profiles
  add column if not exists drops_created integer not null default 0;

-- Backfill from what each seller currently has. This undercounts anyone
-- who already deleted a drop, which is the fair way round: nobody loses a
-- slot they thought they had because of a change made after the fact.
update public.profiles p
set drops_created = coalesce((
  select count(*)
  from public.drops d
  join public.shops s on s.id = d.seller_id
  where s.owner_id = p.id
), 0)
where p.drops_created = 0;

-- Bump the counter from the database rather than the route, so it stays
-- correct no matter which code path creates a drop.
create or replace function public.bump_drops_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set drops_created = drops_created + 1
  where id = (select owner_id from shops where id = new.seller_id);
  return new;
end;
$$;

drop trigger if exists drops_bump_created on public.drops;
create trigger drops_bump_created
  after insert on public.drops
  for each row
  execute function public.bump_drops_created();

comment on column public.profiles.drops_created is
  'Lifetime count of drops ever posted. Never decremented; gates the free tier.';
