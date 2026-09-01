-- Lets a person keep following shops without getting an email each time
-- those shops post.
alter table public.profiles
  add column if not exists follow_emails boolean not null default true;
