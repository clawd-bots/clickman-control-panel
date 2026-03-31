/**
 * GA4 API client for front-end data fetching.
 * Calls our internal Next.js API route which proxies to GA4's Data API.
 *
 * All metrics come pre-calculated from GA4 server-side.
 * We do NOT calculate any metrics client-side.
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
  cartToViewRate: number | null;
  purchaseToViewRate: number | null;
  transactionsPerPurchaser: number | null;
}

export interface GA4DailyPoint {
  date: string;
  [key: string]: string | number | null;
}

export interface GA4TrafficSource {
  channelGroup: string;
  sessions: number;
  users: number;
  newUsers: number;
  engagementRate: number;
  conversions: number;
}

export interface GA4Data {
  summary?: GA4Summary;
  daily?: GA4DailyPoint[];
  traffic?: GA4TrafficSource[];
}

export interface GA4Response {
  success: boolean;
  source: string;
  dateRange: { startDate: string; endDate: string };
  data: GA4Data;
  error?: string;
}

/**
 * Fetch GA4 data for a date range.
 */
export async function fetchGA4Data(
  startDate: string,
  endDate: string,
  mode: 'summary' | 'daily' | 'traffic' | 'all' = 'all'
): Promise<GA4Data> {
  const params = new URLSearchParams({ startDate, endDate, mode });
  const res = await fetch(`/api/ga4?${params.toString()}`);
  const json: GA4Response = await res.json();

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch GA4 data');
  }

  return json.data;
}

/**
 * Get a GA4 summary metric value with fallback.
 */
export function getGA4Metric(data: GA4Data | null, key: keyof GA4Summary, fallback: number = 0): number {
  return data?.summary?.[key] ?? fallback;
}
