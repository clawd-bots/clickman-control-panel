/**
 * TikTok Ads client — fetches data from our /api/tiktok route.
 */

export interface TikTokAd {
  adId: string;
  adName: string;
  campaignId: string;
  campaignName: string;
  adgroupName: string;
  status: string;
  createTime: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cpa: number;
  purchases: number;
  roas: number;
}

export interface TikTokCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
}

export interface TikTokSummary {
  totalAds: number;
  activeAds: number;
  totalSpend: number;
  totalConversions: number;
  totalImpressions: number;
  totalClicks: number;
  avgCpa: number;
  avgCtr: number;
  overallRoas: number;
}

export interface TikTokOverview {
  summary: TikTokSummary;
  campaigns: TikTokCampaign[];
  ads: TikTokAd[];
  dateRange: { startDate: string; endDate: string };
}

type FetchLike = typeof fetch;

export async function fetchTikTokOverview(
  startDate: string,
  endDate: string,
  fetchImpl: FetchLike = fetch
): Promise<TikTokOverview | null> {
  try {
    const res = await fetchImpl(`/api/tiktok?mode=overview&startDate=${startDate}&endDate=${endDate}`);
    const json = await res.json();
    if (json.success) return json.data;
    console.error('TikTok API error:', json.error);
    return null;
  } catch (err) {
    console.error('TikTok fetch error:', err);
    return null;
  }
}

/**
 * Classify an ad into account control zones based on spend and CPA thresholds.
 */
export function classifyAdZone(ad: TikTokAd, cpaTarget: number, spendThreshold: number = 500): string {
  const highSpend = ad.spend >= spendThreshold;
  const highCpa = ad.cpa > cpaTarget || ad.cpa === 0;
  
  if (highSpend && !highCpa && ad.conversions > 0) return 'scaling';
  if (highSpend && highCpa) return 'zombie';
  if (!highSpend && !highCpa && ad.conversions > 0) return 'untapped';
  return 'testing';
}

/**
 * Calculate creative age in days from create_time.
 */
export function getCreativeAgeDays(createTime: string): number {
  if (!createTime) return 999;
  const created = new Date(createTime);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get creative age bracket label.
 */
export function getAgeBracket(days: number): string {
  if (days <= 7) return 'Last 7 Days';
  if (days <= 14) return '8-14 Days';
  if (days <= 30) return '15-30 Days';
  if (days <= 90) return '31-90 Days';
  if (days <= 180) return '91-180 Days';
  return '180+ Days';
}
