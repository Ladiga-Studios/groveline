-- v1 launch pass: shipping, terms acceptance, seller contact info,
-- notification digests, and update broadcasts.

-- Drops: pickup, shipping, or both. Shipping-only drops have no pickup
-- place, so it becomes nullable. pickup_start/end double as the order
-- deadline for shipping-only drops.
alter table public.drops
  add column if not exists fulfillment text not null default 'pickup',
  add column if not exists shipping_cents integer not null default 0,
  add column if not exists last_broadcast_at timestamptz;
alter table public.drops drop constraint if exists drops_fulfillment_check;
alter table public.drops
  add constraint drops_fulfillment_check check (fulfillment in ('pickup', 'shipping', 'both'));
alter table public.drops alter column pickup_place drop not null;

-- Claims: how it's being delivered, where to, and the terms checkbox.
alter table public.claims
  add column if not exists delivery text not null default 'pickup',
  add column if not exists ship_address text,
  add column if not exists accepted_terms boolean not null default false,
  add column if not exists seller_notified_at timestamptz;

-- Profiles: optional public contact info, terms acceptance, digest preference.
alter table public.profiles
  add column if not exists contact_phone text,
  add column if not exists social_url text,
  add column if not exists accepted_terms_at timestamptz,
  add column if not exists notify_digest boolean not null default true;

-- Claim v3 adds delivery method, shipping address, and terms acceptance.
create or replace function public.claim_drop_v3(
  p_drop uuid,
  p_qty integer,
  p_name text,
  p_phone text,
  p_email text,
  p_method text,
  p_buyer uuid,
  p_delivery text,
  p_ship_address text,
  p_terms boolean
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

  insert into claims (drop_id, buyer_name, buyer_phone, buyer_email, quantity, method, buyer_user_id,
                      payment_status, delivery, ship_address, accepted_terms)
  values (p_drop, p_name, p_phone, p_email, p_qty, coalesce(p_method, 'cash'), p_buyer,
          case when p_method = 'card' then 'pending' else 'none' end,
          coalesce(p_delivery, 'pickup'), p_ship_address, coalesce(p_terms, false))
  returning id, cancel_token into v_claim_id, v_token;

  select count(*) into v_position from claims where drop_id = p_drop and cancelled_at is null;

  return json_build_object('claim_id', v_claim_id, 'position', v_position, 'cancel_token', v_token);
end;
$$;
