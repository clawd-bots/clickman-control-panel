-- API response cache (replaces Vercel Blob for route-level caching).
-- Run in Supabase SQL Editor or via CLI migration.

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

comment on table public.api_cache is 'Server-side JSON cache for integration API routes (TTL via ttl_minutes + cached_at)';
