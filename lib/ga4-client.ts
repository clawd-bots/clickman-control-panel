/**
 * GA4 API client for front-end data fetching.
 * Calls our internal Next.js API route which proxies to GA4 Data API.
 */

export interface GA4Summary {
  sessions: number | null;
  totalUsers: number | null;
  newUsers: number | null;
  activeUsers: number | null;
  screenPageViews: number | null;
  screenPageViewsPerSession: number | null;
  averageSessionDuration: number | null;
  bounceRate: number | null;
  engagedSessions: number | null;
  engagementRate: number | null;
  sessionsPerUser: number | null;
  conversions: number | null;
  eventCount: number | null;
  ecommercePurchases: number | null;
  purchaseRevenue: number | null;
  addToCarts: number | null;
  checkouts: number | null;
  itemsViewed: number | null;
  cartToViewRate: number | null;
  purchaseToViewRate: number | null;
}

export interface GA4DailyRow {
  date: string;
  sessions: number;
  totalUsers: number;
  newUsers: number;
  screenPageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  engagementRate: number;
  conversions: number;
  ecommercePurchases: number;
  purchaseRevenue: number;
}

export interface GA4TrafficSource {
  channel: string;
  sessions: number;
  totalUsers: number;
  newUsers: number;
  engagementRate: number;
  averageSessionDuration: number;
  conversions: number;
  ecommercePurchases: number;
  purchaseRevenue: number;
}

export interface GA4Data {
  summary?: GA4Summary;
  daily?: GA4DailyRow[];
  trafficSources?: GA4TrafficSource[];
  /** IANA timezone from GA4 Data API metadata — same calendar as the GA4 property reporting timezone. */
  reportingTimeZone?: string | null;
}

export interface GA4Response {
  success: boolean;
  source: string;
  dateRange: { startDate: string; endDate: string };
  data: GA4Data;
  error?: string;
}

type FetchLike = typeof fetch;

/**
 * Fetch GA4 data for a date range.
 */
export async function fetchGA4Data(
  startDate: string,
  endDate: string,
  mode: 'summary' | 'daily' | 'traffic' | 'all' = 'all',
  fetchImpl: FetchLike = fetch
): Promise<GA4Data> {
  const params = new URLSearchParams({ startDate, endDate, mode });
  const res = await fetchImpl(`/api/ga4?${params.toString()}`);
  const json: GA4Response = await res.json();

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch GA4 data');
  }

  return json.data;
}

export interface GA4EventRow {
  eventName: string;
  /** Total event count in the date range (not per day). */
  eventCount: number;
}

/**
 * All distinct event names with counts for the range (same basis as GA4 Explorations event report).
 */
export async function fetchGA4EventBreakdown(
  startDate: string,
  endDate: string,
  fetchImpl: FetchLike = fetch
): Promise<GA4EventRow[]> {
  const params = new URLSearchParams({ startDate, endDate, mode: 'events' });
  const res = await fetchImpl(`/api/ga4?${params.toString()}`);
  const json = (await res.json()) as {
    success: boolean;
    data?: { events?: GA4EventRow[] };
    error?: string;
  };
  if (!json.success || !json.data?.events) {
    throw new Error(json.error || 'Failed to fetch GA4 events');
  }
  return json.data.events;
}

/**
 * Get a GA4 summary metric value.
 */
export function getGA4Metric(data: GA4Data | null, key: keyof GA4Summary, fallback: number = 0): number {
  if (!data?.summary) return fallback;
  return (data.summary[key] as number) ?? fallback;
}
