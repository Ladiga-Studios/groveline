-- Account and shop deletion.
--
-- Two things this needs that the schema didn't have:
--
-- 1. A marker on claims whose buyer details were stripped when that buyer
--    closed their account. The row stays as the seller's record of a sale;
--    the person is gone from it. Without the marker there's no way to tell
--    an anonymized row from one that was always sparse.
--
-- 2. A small log of deletions. When someone emails asking whether their
--    data is really gone, or a seller asks what happened to a shop, this
--    is the only evidence left once the rows are cascaded away. It holds
--    no personal detail beyond the email, which is what people write in
--    from.

alter table public.claims
  add column if not exists anonymized_at timestamptz;

create table if not exists public.deletion_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('account', 'shop')),
  -- Not a foreign key on purpose: the row it refers to is gone.
  subject_id uuid not null,
  subject_name text,
  contact_email text,
  claims_anonymized integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.deletion_log enable row level security;
-- No policies: service role only. Nobody reads this through the API.

comment on table public.deletion_log is
  'Record that a deletion happened, after the rows themselves are gone.';
comment on column public.claims.anonymized_at is
  'Set when the buyer closed their account and their details were stripped.';
