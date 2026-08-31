-- Claim removal (frees inventory) and emails on profiles so followers
-- can be notified about new drops.

-- Store the account email on the profile so new drop announcements can
-- reach followers, not just newsletter subscribers.
alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Sellers can remove a claim (no show, buyer canceled by text). Deletes the
-- claim and returns the quantity to the drop in one atomic step. Only the
-- drop's own seller can do it.
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
begin
  select drop_id, quantity into v_drop, v_qty
  from claims where id = p_claim;

  if v_drop is null then
    raise exception 'not_found';
  end if;

  select seller_id into v_seller from drops where id = v_drop;

  if v_seller is null or v_seller <> auth.uid() then
    raise exception 'not_allowed';
  end if;

  delete from claims where id = p_claim;

  update drops set claimed = greatest(0, claimed - v_qty)
  where id = v_drop;
end;
$$;
