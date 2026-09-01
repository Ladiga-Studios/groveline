-- Safeguards around money and cancellations. Timestamps for records,
-- tracking numbers for shipped orders, how a card was charged, and a
-- reason when a seller cancels a whole drop.

alter table public.claims
  add column if not exists picked_up_at timestamptz,
  add column if not exists tracking text,
  add column if not exists capture_mode text not null default 'manual';

alter table public.drops
  add column if not exists cancel_reason text,
  add column if not exists cancelled_at timestamptz;

create index if not exists claims_authorized_idx on public.claims (payment_status) where payment_status = 'authorized';
