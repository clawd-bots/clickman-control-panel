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

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}
