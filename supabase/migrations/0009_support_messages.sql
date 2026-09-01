-- Support messages. Saved before emailing so nothing is ever lost.
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  user_id uuid references public.profiles (id) on delete set null,
  ip_address text,
  created_at timestamptz not null default now(),
  handled boolean not null default false
);
alter table public.support_messages enable row level security;
drop policy if exists "admins read support" on public.support_messages;
create policy "admins read support" on public.support_messages
  for select using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "admins update support" on public.support_messages;
create policy "admins update support" on public.support_messages
  for update using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create index if not exists support_ip_idx on public.support_messages (ip_address, created_at);
