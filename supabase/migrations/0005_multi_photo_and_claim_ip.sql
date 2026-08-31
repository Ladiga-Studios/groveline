-- Multiple photos per drop (up to 10, enforced in the app), and an IP
-- address column on claims used for spam rate limiting.

alter table public.drops
  add column if not exists photo_urls text[] not null default '{}';

update public.drops
set photo_urls = array[photo_url]
where photo_url is not null and (photo_urls is null or photo_urls = '{}');

alter table public.claims
  add column if not exists ip_address text;
