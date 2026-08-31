-- Adds state to profiles for browse filtering. Existing profiles default to Alabama.

alter table public.profiles
  add column if not exists state text not null default 'AL';
