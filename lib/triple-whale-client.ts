/**
 * Triple Whale API client for front-end data fetching.
 * Calls our internal Next.js API route which proxies to TW's Summary Page API.
 *
 * All derived metrics (MER, ROAS, CPA, etc.) come pre-calculated from TW.
 * We do NOT calculate any metrics client-side — this prevents the P&L bug class.
 */

export interface TWMetricValue {
  current: number | null;
  previous: number | null;
  delta: number;
  type: string;
}

export interface TWDailyPoint {
  date: string;
  value: number;
}

export interface TWData {
  summary: Record<string, TWMetricValue>;
  daily: Record<string, TWDailyPoint[]>;
}

export interface TWResponse {
  success: boolean;
  source: string;
  dateRange: { startDate: string; endDate: string };
  data: TWData;
  error?: string;
}

/**
 * Fetch Triple Whale data for a date range.
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 * @param mode 'summary' | 'daily' | 'all'
 */
export async function fetchTripleWhaleData(
  startDate: string,
  endDate: string,
  mode: 'summary' | 'daily' | 'all' = 'all'
): Promise<TWData> {
  const params = new URLSearchParams({ startDate, endDate, mode });
  const res = await fetch(`/api/triple-whale?${params.toString()}`);
  const json: TWResponse = await res.json();

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch Triple Whale data');
  }

  return json.data;
}

/**
 * Get a metric's current value, with fallback.
 */
export function getMetric(data: TWData | null, key: string, fallback: number = 0): number {
  return data?.summary?.[key]?.current ?? fallback;
}

/**
 * Get a metric's previous period value, with fallback.
 */
export function getPrevMetric(data: TWData | null, key: string, fallback: number = 0): number {
  return data?.summary?.[key]?.previous ?? fallback;
}

/**
 * Get delta (percentage change) for a metric.
 */
export function getDelta(data: TWData | null, key: string): number {
  return data?.summary?.[key]?.delta ?? 0;
}

/**
 * Get daily chart data for a metric.
 * Returns array of { date, value } or empty array.
 */
export function getDailyData(data: TWData | null, key: string): TWDailyPoint[] {
  return data?.daily?.[key] ?? [];
}

/**
 * Triple Whale ad-level data (from pixel_joined_tvf).
 */
export interface TWAd {
  adId: string;
  adName: string;
  campaignName: string;
  platform: string;
  channelId: string;
  spend: number;
  cpa: number;
  ncCpa: number;
  roas: number;
  ncRoas: number;
  orders: number;
  ncOrders: number;
  revenue: number;
  ncRevenue: number;
  clicks: number;
  impressions: number;
}

export interface TWAdsResponse {
  success: boolean;
  model: string;
  window: string;
  dateRange: { startDate: string; endDate: string };
  totalAds: number;
  data: TWAd[];
  error?: string;
}

/**
 * Fetch ad-level data from Triple Whale for account control chart.
 */
export async function fetchTWAds(
  startDate: string,
  endDate: string,
  model: string = 'Linear All',
  window: string = 'Lifetime',
  platform?: string
): Promise<TWAd[]> {
  const params = new URLSearchParams({ startDate, endDate, model, window });
  if (platform) params.set('platform', platform);
  const res = await fetch(`/api/triple-whale/ads?${params.toString()}`);
  const json: TWAdsResponse = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch TW ad data');
  }
  return json.data;
}

/** Row from Orcabase cohort SQL (avg cumulative LTV by cohort month, aligned with TW Cohort Analysis). */
export interface TWCohortApiRow {
  cohortMonth: string;
  cohortLabel: string;
  customers: number;
  ncpa: number;
  rpr: number;
  firstOrderAov: number;
  ltvByMonth: (number | null)[];
  customersByMonth: (number | null)[];
  maxValidMonth?: number;
}

export interface TWCohortsResponse {
  success: boolean;
  source?: string;
  dateRange: { startDate: string; endDate: string };
  model?: string;
  attributionWindow?: string;
  cohorts: TWCohortApiRow[];
  error?: string;
}

/**
 * Cohort retention / LTV grid from Triple Whale (shop orders + pixel NCPA).
 */
export async function fetchTWCohorts(
  startDate: string,
  endDate: string,
  model: string = 'Triple Attribution',
  window: string = 'Lifetime',
  refresh: boolean = false
): Promise<TWCohortApiRow[]> {
  const params = new URLSearchParams({ startDate, endDate, model, window });
  if (refresh) params.set('refresh', 'true');
  const res = await fetch(`/api/triple-whale/cohorts?${params.toString()}`);
  const json: TWCohortsResponse = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch TW cohort data');
  }
  return json.cohorts ?? [];
}

/**
 * Format a number as currency (PHP ₱ or USD $).
 */
export function formatCurrency(value: number | null, currency: 'PHP' | 'USD' = 'PHP'): string {
  if (value === null || value === undefined) return '—';
  const symbol = currency === 'PHP' ? '₱' : '$';
  if (Math.abs(value) >= 1_000_000) {
    return `${symbol}${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${symbol}${(value / 1_000).toFixed(1)}K`;
  }
  return `${symbol}${value.toFixed(2)}`;
}

/**
 * Format a number with compact notation.
 */
export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(2)}%`;
}

/**
 * Format a ratio (ROAS, MER, etc.)
 */
export function formatRatio(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(2);
}

/**
 * Get default date range (last 30 days).
 */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  // Use local date components to avoid UTC timezone shift
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return {
    startDate: fmt(start),
    endDate: fmt(end),
  };
}
