-- Copy ALL lines below into Supabase → SQL Editor → New query → Run.
-- Do NOT paste the filename; paste this SQL only.
-- App keys stored in value jsonb: monthly_targets, prompt_store, targets_history, ai_insights.

create table if not exists public.clickman_kv (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.clickman_kv enable row level security;

comment on table public.clickman_kv is 'Click-Man app data: monthly_targets, prompt_store, targets_history JSON payloads';

-- API route cache (add when migrating off Blob storage)
create table if not exists public.api_cache (
  source       text        not null,
  cache_key    text        not null,
  data         jsonb       not null,
  cached_at    timestamptz not null default now(),
  ttl_minutes  integer     not null default 1440,
  primary key (source, cache_key)
);
create index if not exists api_cache_expiry on public.api_cache (source, cache_key, cached_at);
alter table public.api_cache enable row level security;
