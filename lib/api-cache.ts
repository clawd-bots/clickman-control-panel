/**
 * API Response Cache using Vercel Blob.
 * 
 * Pattern: Check cache → if fresh, return cached → otherwise fetch live, cache, return.
 * Default TTL: 24 hours. Configurable per source via /api/cache-config.
 */
import { put, head } from '@vercel/blob';

const CACHE_PREFIX = 'cache/';
const CONFIG_PATH = 'cache/config.json';

// Default TTL in minutes per data source
const DEFAULT_TTLS: Record<string, number> = {
  'triple-whale': 1440, // 24 hours
  'ga4': 1440,
  'meta': 1440,
  'google-sheets': 1440,
  'google-ads': 1440,
  'tiktok': 1440,
  'reddit': 1440,
};

interface CacheEntry {
  data: any;
  cachedAt: number; // timestamp ms
  source: string;
  ttlMinutes: number;
}

interface CacheConfig {
  ttls: Record<string, number>;
  lastCleared?: number;
}

// ─── Config ───

export async function getCacheConfig(): Promise<CacheConfig> {
  try {
    const blob = await head(CONFIG_PATH);
    if (!blob) return { ttls: DEFAULT_TTLS };
    const res = await fetch(blob.url, { cache: 'no-store' });
    return await res.json();
  } catch {
    return { ttls: DEFAULT_TTLS };
  }
}

export async function saveCacheConfig(config: CacheConfig): Promise<void> {
  await put(CONFIG_PATH, JSON.stringify(config, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
}

// ─── Cache Read/Write ───

function getCacheKey(source: string, params: string): string {
  // Create a deterministic key from source + params
  const hash = params.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
  return `${CACHE_PREFIX}${source}/${hash}.json`;
}

export async function getCached(source: string, params: string): Promise<any | null> {
  const key = getCacheKey(source, params);
  try {
    const blob = await head(key);
    if (!blob) return null;
    const res = await fetch(blob.url, { cache: 'no-store' });
    const entry: CacheEntry = await res.json();
    
    // Check TTL
    const config = await getCacheConfig();
    const ttlMinutes = config.ttls[source] ?? DEFAULT_TTLS[source] ?? 1440;
    const ageMs = Date.now() - entry.cachedAt;
    const ttlMs = ttlMinutes * 60 * 1000;

    if (ageMs > ttlMs) {
      return null; // Expired
    }

    return entry.data;
  } catch {
    return null; // Cache miss
  }
}

export async function setCache(source: string, params: string, data: any): Promise<void> {
  const key = getCacheKey(source, params);
  const config = await getCacheConfig();
  const ttlMinutes = config.ttls[source] ?? DEFAULT_TTLS[source] ?? 1440;

  const entry: CacheEntry = {
    data,
    cachedAt: Date.now(),
    source,
    ttlMinutes,
  };

  await put(key, JSON.stringify(entry), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
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
      return { data: cached, fromCache: true, cachedAt: cached.cachedAt };
    }
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache in background (don't block response)
  setCache(source, params, data).catch(err => 
    console.error(`Failed to cache ${source}:`, err)
  );

  return { data, fromCache: false, cachedAt: Date.now() };
}
