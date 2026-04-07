/**
 * Meta Ads client — fetches data from our /api/meta route.
 */

export interface MetaAd {
  adId: string;
  adName: string;
  campaignId: string;
  campaignName: string;
  adsetName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  cpa: number;
  roas: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  createdTime: string;
}

export interface MetaSummary {
  totalAds: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: number;
  totalPurchases: number;
  totalImpressions: number;
  totalClicks: number;
  avgCpa: number;
  avgCtr: number;
  overallRoas: number;
}

export interface MetaOverview {
  account: { name: string; currency: string; timezone: string };
  summary: MetaSummary;
  campaigns: MetaCampaign[];
  ads: MetaAd[];
  dateRange: { startDate: string; endDate: string };
}

export async function fetchMetaOverview(startDate: string, endDate: string): Promise<MetaOverview | null> {
  try {
    const res = await fetch(`/api/meta?mode=overview&startDate=${startDate}&endDate=${endDate}`);
    const json = await res.json();
    if (json.success) return json.data;
    console.error('Meta API error:', json.error);
    return null;
  } catch (err) {
    console.error('Meta fetch error:', err);
    return null;
  }
}

/**
 * Classify an ad into account control zones based on spend and CPA thresholds.
 */
export function classifyMetaAdZone(ad: MetaAd, cpaTarget: number, spendThreshold: number = 500): string {
  const highSpend = ad.spend >= spendThreshold;
  
  // If no purchases, classify based on spend alone
  if (ad.purchases === 0) {
    // High spend with no purchases = zombie (wasting budget)
    if (highSpend) return 'zombie';
    // Low spend with no purchases = still testing
    return 'testing';
  }
  
  // Has purchases — classify by CPA vs target
  const highCpa = ad.cpa > cpaTarget;
  
  if (highSpend && !highCpa) return 'scaling';
  if (highSpend && highCpa) return 'zombie';
  if (!highSpend && !highCpa) return 'untapped';
  return 'testing';
}
