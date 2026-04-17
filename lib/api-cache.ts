/**
 * API response cache — Supabase `api_cache` table when configured; otherwise no server cache.
 *
 * Pattern: Check cache → if fresh, return cached → otherwise fetch live, cache, return.
 * Per-source TTL: defaults below; overrides via `cache_config` in clickman_kv (/api/cache-config).
 */
import { createSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';
import { kvGet, kvUpsert } from '@/lib/supabase/kv';
import { KV_KEYS } from '@/lib/supabase/kv-keys';

const CONFIG_TTL_KEY = KV_KEYS.CACHE_CONFIG;

// Default TTL in minutes per data source
const DEFAULT_TTLS: Record<string, number> = {
  'triple-whale': 1440,
  ga4: 1440,
  meta: 1440,
  'google-sheets': 720,
  'google-ads': 1440,
  tiktok: 1440,
  reddit: 1440,
  'tw-ads': 1440,
  'tw-attribution': 1440,
  'tw-cohorts': 1440,
};

interface CacheConfig {
  ttls: Record<string, number>;
  lastCleared?: number;
}

function normalizeCacheKey(params: string): string {
  return params.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 200);
}

// ─── Config (KV, same Supabase project) ───

export async function getCacheConfig(): Promise<CacheConfig> {
  try {
    if (!isSupabaseConfigured()) {
      return { ttls: { ...DEFAULT_TTLS } };
    }
    const row = await kvGet<CacheConfig>(CONFIG_TTL_KEY);
    if (!row || typeof row !== 'object' || !row.ttls || typeof row.ttls !== 'object') {
      return { ttls: { ...DEFAULT_TTLS } };
    }
    return {
      ttls: { ...DEFAULT_TTLS, ...row.ttls },
      lastCleared: row.lastCleared,
    };
  } catch {
    return { ttls: { ...DEFAULT_TTLS } };
  }
}

export async function saveCacheConfig(config: CacheConfig): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await kvUpsert(CONFIG_TTL_KEY, config);
}

// ─── Cache Read/Write (Supabase) ───

export async function getCached(source: string, params: string): Promise<unknown | null> {
  if (!isSupabaseConfigured()) return null;

  const cacheKey = normalizeCacheKey(params);
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('api_cache')
      .select('data, cached_at, ttl_minutes')
      .eq('source', source)
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error || !data) return null;

    const config = await getCacheConfig();
    const ttlMinutes = config.ttls[source] ?? DEFAULT_TTLS[source] ?? 1440;
    const rowTtl = typeof data.ttl_minutes === 'number' ? data.ttl_minutes : ttlMinutes;
    const effectiveTtl = rowTtl;
    const cachedAt = new Date(data.cached_at as string).getTime();
    if (Number.isNaN(cachedAt)) return null;
    const ageMs = Date.now() - cachedAt;
    const ttlMs = effectiveTtl * 60 * 1000;
    if (ageMs > ttlMs) return null;

    return data.data;
  } catch {
    return null;
  }
}

export async function setCache(source: string, params: string, data: unknown): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const cacheKey = normalizeCacheKey(params);
  const config = await getCacheConfig();
  const ttlMinutes = config.ttls[source] ?? DEFAULT_TTLS[source] ?? 1440;

  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from('api_cache').upsert(
      {
        source,
        cache_key: cacheKey,
        data: data as object,
        cached_at: new Date().toISOString(),
        ttl_minutes: ttlMinutes,
      },
      { onConflict: 'source,cache_key' }
    );
    if (error) {
      console.error('[api_cache] set', source, error.message);
    }
  } catch (e) {
    console.error('[api_cache] set', source, e);
  }
}

/** Remove all rows (used by cache admin / clear). */
export async function clearAllApiCacheRows(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from('api_cache').delete().neq('source', '');
    if (error) {
      console.error('[api_cache] clearAll', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[api_cache] clearAll', e);
    return false;
  }
}

// ─── Helper: cached fetch pattern ───

export async function cachedFetch<T>(
  source: string,
  params: string,
  fetchFn: () => Promise<T>,
  forceRefresh: boolean = false
): Promise<{ data: T; fromCache: boolean; cachedAt?: number }> {
  if (!forceRefresh) {
    const cached = await getCached(source, params);
    if (cached !== null) {
      return { data: cached as T, fromCache: true, cachedAt: Date.now() };
    }
  }

  const data = await fetchFn();

  setCache(source, params, data).catch((err) => console.error(`Failed to cache ${source}:`, err));

  return { data, fromCache: false, cachedAt: Date.now() };
}
