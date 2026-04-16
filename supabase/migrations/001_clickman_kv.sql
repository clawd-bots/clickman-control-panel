-- Run in Supabase SQL Editor: paste the SQL *statements* below, not this file path.
-- Easiest: open `paste-in-sql-editor.sql` in this folder and copy its full contents.
-- Stores app JSON blobs keyed by string (targets, prompts, history).

create table if not exists public.clickman_kv (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS: block direct access via anon key; API routes use service role (bypasses RLS).
alter table public.clickman_kv enable row level security;

-- Optional: no policies for anon/authenticated → no row access from PostgREST with anon key.

comment on table public.clickman_kv is 'Click-Man app data: monthly_targets, prompt_store, targets_history JSON payloads';
