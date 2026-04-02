import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/api-cache';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getConfig() {
  const accessToken = process.env.META_ACCESS_TOKEN?.trim();
  const adAccountId = process.env.META_AD_ACCOUNT_ID?.trim();
  if (!accessToken || !adAccountId) {
    throw new Error('Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID');
  }
  // Ensure act_ prefix
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  return { accessToken, accountId };
}

async function metaFetch(path: string, params: Record<string, string> = {}): Promise<any> {
  const { accessToken } = getConfig();
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set('access_token', accessToken);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(`Meta API ${res.status}: ${err.error?.message || JSON.stringify(err)}`);
  }
  return res.json();
}

// Paginate through all results
async function metaFetchAll(path: string, params: Record<string, string> = {}, maxPages = 10): Promise<any[]> {
  const all: any[] = [];
  let nextUrl: string | null = null;
  let page = 0;

  const firstPage = await metaFetch(path, { ...params, limit: '100' });
  all.push(...(firstPage.data || []));
  nextUrl = firstPage.paging?.next || null;

  while (nextUrl && page < maxPages) {
    page++;
    const res = await fetch(nextUrl);
    if (!res.ok) break;
    const data = await res.json();
    all.push(...(data.data || []));
    nextUrl = data.paging?.next || null;
  }

  return all;
}

function extractPurchases(actions: any[]): number {
  if (!actions) return 0;
  const purchase = actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
  return purchase ? parseInt(purchase.value) || 0 : 0;
}

function extractCostPerPurchase(costPerAction: any[]): number {
  if (!costPerAction) return 0;
  const purchase = costPerAction.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
  return purchase ? parseFloat(purchase.value) || 0 : 0;
}

export async function GET(request: NextRequest) {
  try {
    const { accountId } = getConfig();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'overview';
    const startDate = searchParams.get('startDate') || '2026-03-01';
    const endDate = searchParams.get('endDate') || '2026-03-31';
    const timeRange = JSON.stringify({ since: startDate, until: endDate });

    const forceRefresh = searchParams.get('refresh') === 'true';
    if (mode === 'overview' && !forceRefresh) {
      const cached = await getCached('meta', `${startDate}_${endDate}_${mode}`);
      if (cached !== null) return NextResponse.json({ ...cached, _fromCache: true });
    }

    if (mode === 'account') {
      const data = await metaFetch(`/${accountId}`, {
        fields: 'name,currency,timezone_name,account_status,amount_spent',
      });
      return NextResponse.json({ success: true, data });
    }

    if (mode === 'campaigns') {
      const campaigns = await metaFetchAll(`/${accountId}/campaigns`, {
        fields: 'name,status,objective,created_time,updated_time',
      });
      return NextResponse.json({ success: true, data: campaigns });
    }

    if (mode === 'ad-performance') {
      const insights = await metaFetchAll(`/${accountId}/insights`, {
        fields: 'ad_id,ad_name,campaign_id,campaign_name,adset_name,spend,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type,action_values',
        level: 'ad',
        time_range: timeRange,
      });
      return NextResponse.json({ success: true, data: insights });
    }

    if (mode === 'overview') {
      // Fetch campaigns + ad performance in parallel
      const [campaigns, adInsights, accountInfo] = await Promise.all([
        metaFetchAll(`/${accountId}/campaigns`, {
          fields: 'name,status,objective,created_time',
        }),
        metaFetchAll(`/${accountId}/insights`, {
          fields: 'ad_id,ad_name,campaign_id,campaign_name,adset_name,spend,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type,action_values',
          level: 'ad',
          time_range: timeRange,
        }),
        metaFetch(`/${accountId}`, {
          fields: 'name,currency,timezone_name',
        }),
      ]);

      // Process ad insights into a clean format
      const ads = adInsights.map((ad: any) => ({
        adId: ad.ad_id,
        adName: ad.ad_name || 'Unknown',
        campaignId: ad.campaign_id,
        campaignName: ad.campaign_name || 'Unknown',
        adsetName: ad.adset_name || '',
        spend: parseFloat(ad.spend) || 0,
        impressions: parseInt(ad.impressions) || 0,
        clicks: parseInt(ad.clicks) || 0,
        ctr: parseFloat(ad.ctr) || 0,
        cpc: parseFloat(ad.cpc) || 0,
        cpm: parseFloat(ad.cpm) || 0,
        purchases: extractPurchases(ad.actions),
        cpa: extractCostPerPurchase(ad.cost_per_action_type),
        roas: 0, // Will calculate below
      }));

      // Calculate ROAS from action_values
      adInsights.forEach((ad: any, i: number) => {
        if (ad.action_values) {
          const purchaseValue = ad.action_values.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
          if (purchaseValue && ads[i].spend > 0) {
            ads[i].roas = parseFloat(purchaseValue.value) / ads[i].spend;
          }
        }
      });

      // Sort by spend descending
      ads.sort((a: any, b: any) => b.spend - a.spend);

      // Summary
      const totalSpend = ads.reduce((s: number, a: any) => s + a.spend, 0);
      const totalPurchases = ads.reduce((s: number, a: any) => s + a.purchases, 0);
      const totalImpressions = ads.reduce((s: number, a: any) => s + a.impressions, 0);
      const totalClicks = ads.reduce((s: number, a: any) => s + a.clicks, 0);

      const response = {
        success: true,
        data: {
          account: {
            name: accountInfo.name,
            currency: accountInfo.currency,
            timezone: accountInfo.timezone_name,
          },
          summary: {
            totalAds: ads.length,
            totalCampaigns: campaigns.length,
            activeCampaigns: campaigns.filter((c: any) => c.status === 'ACTIVE').length,
            totalSpend,
            totalPurchases,
            totalImpressions,
            totalClicks,
            avgCpa: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
            avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            overallRoas: totalSpend > 0 ? ads.reduce((s: number, a: any) => s + (a.roas * a.spend), 0) / totalSpend : 0,
          },
          campaigns: campaigns.map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            objective: c.objective,
            createdTime: c.created_time,
          })),
          ads,
          dateRange: { startDate, endDate },
        },
      };
      setCache('meta', `${startDate}_${endDate}_overview`, response).catch(() => {});
      return NextResponse.json(response);
    }

    return NextResponse.json({ success: false, error: 'Invalid mode. Use: overview | account | campaigns | ad-performance' }, { status: 400 });
  } catch (error: any) {
    console.error('Meta API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
