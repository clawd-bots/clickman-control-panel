-- Copy ALL lines below into Supabase → SQL Editor → New query → Run.
-- Do NOT paste the filename; paste this SQL only.

create table if not exists public.clickman_kv (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.clickman_kv enable row level security;

comment on table public.clickman_kv is 'Click-Man app data: monthly_targets, prompt_store, targets_history JSON payloads';
