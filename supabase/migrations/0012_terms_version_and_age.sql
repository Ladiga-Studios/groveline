-- Record what people actually agreed to, not just that they agreed.
--
-- Before this, an acceptance was a boolean and a timestamp. If the terms
-- change, there's no way to show which wording a given person accepted.
-- Storing the version alongside it fixes that for every future change.
--
-- Age is stored the same way: the confirmation the person gave, at the
-- time they gave it. Contracts with minors are generally voidable by the
-- minor, so an agreement with no age gate is weaker than it looks.

alter table public.profiles
  add column if not exists terms_version text,
  add column if not exists age_confirmed_at timestamptz;

alter table public.claims
  add column if not exists terms_version text,
  add column if not exists age_confirmed boolean not null default false;

-- Existing rows accepted the wording that was live before versioning
-- started. Mark them so they're distinguishable from rows that were never
-- asked, rather than backfilling them with today's version, which would
-- claim they agreed to text they never saw.
update public.profiles
  set terms_version = 'pre-2026-09-01'
  where terms_version is null and accepted_terms_at is not null;

update public.claims
  set terms_version = 'pre-2026-09-01'
  where terms_version is null and accepted_terms = true;

comment on column public.profiles.terms_version is
  'TERMS_VERSION from src/lib/policy.ts that was live when this person accepted.';
comment on column public.claims.terms_version is
  'TERMS_VERSION that was live when this reservation was placed.';
