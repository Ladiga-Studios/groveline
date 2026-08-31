-- Adds categories to drops. Run once in the Supabase SQL editor.
-- Safe to run on your existing database, keeps all data.

alter table public.drops
  add column if not exists category text not null default 'other';

alter table public.drops
  drop constraint if exists drops_category_check;

alter table public.drops
  add constraint drops_category_check
  check (category in ('baked', 'produce', 'meat', 'plants', 'crafts', 'plates', 'other'));
