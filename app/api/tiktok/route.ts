import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/api-cache';

const TT_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

function getConfig() {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const advertiserId = process.env.TIKTOK_ADVERTISER_ID;
  if (!accessToken || !advertiserId) {
    throw new Error('Missing TIKTOK_ACCESS_TOKEN or TIKTOK_ADVERTISER_ID');
  }
  return { accessToken, advertiserId };
}

async function ttFetch(endpoint: string, params: Record<string, string>, token: string) {
  const url = new URL(`${TT_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { 'Access-Token': token },
  });
  if (!res.ok) throw new Error(`TikTok API ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (body.code !== 0) throw new Error(`TikTok API error ${body.code}: ${body.message}`);
  return body.data;
}

// Paginate through all results
async function ttFetchAll(endpoint: string, params: Record<string, string>, token: string) {
  const all: any[] = [];
  let page = 1;
  const pageSize = 100;
  while (true) {
    const data = await ttFetch(endpoint, { ...params, page: String(page), page_size: String(pageSize) }, token);
    if (data.list) all.push(...data.list);
    if (!data.page_info || page >= data.page_info.total_page) break;
    page++;
  }
  return all;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'overview';
    const startDate = searchParams.get('startDate') || '2026-03-01';
    const endDate = searchParams.get('endDate') || '2026-03-31';
    const forceRefresh = searchParams.get('refresh') === 'true';
    const cacheParams = `${startDate}_${endDate}_${mode}`;

    if (!forceRefresh) {
      const hit = await getCached('tiktok', cacheParams);
      if (hit !== null) {
        return NextResponse.json({ ...(hit as Record<string, unknown>), _fromCache: true });
      }
    }

    const { accessToken, advertiserId } = getConfig();

    if (mode === 'campaigns') {
      // Get all campaigns
      const campaigns = await ttFetchAll('/campaign/get/', {
        advertiser_id: advertiserId,
        fields: JSON.stringify(['campaign_id', 'campaign_name', 'operation_status', 'objective_type', 'budget', 'create_time']),
      }, accessToken);

      const body = { success: true, data: campaigns };
      setCache('tiktok', cacheParams, body).catch(() => {});
      return NextResponse.json(body);
    }

    if (mode === 'ads') {
      // Get all ads with metadata
      const ads = await ttFetchAll('/ad/get/', {
        advertiser_id: advertiserId,
        fields: JSON.stringify(['ad_id', 'ad_name', 'campaign_id', 'campaign_name', 'adgroup_name', 'operation_status', 'create_time']),
      }, accessToken);

      const body = { success: true, data: ads };
      setCache('tiktok', cacheParams, body).catch(() => {});
      return NextResponse.json(body);
    }

    if (mode === 'ad-performance') {
      // Get ad-level performance data for date range
      const report = await ttFetchAll('/report/integrated/get/', {
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        data_level: 'AUCTION_AD',
        dimensions: JSON.stringify(['ad_id']),
        metrics: JSON.stringify([
          'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
          'conversion', 'cost_per_conversion', 'complete_payment',
          'complete_payment_roas',
        ]),
        start_date: startDate,
        end_date: endDate,
      }, accessToken);

      const body = { success: true, data: report };
      setCache('tiktok', cacheParams, body).catch(() => {});
      return NextResponse.json(body);
    }

    if (mode === 'daily') {
      // Daily campaign-level data for time series
      const report = await ttFetchAll('/report/integrated/get/', {
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        data_level: 'AUCTION_CAMPAIGN',
        dimensions: JSON.stringify(['campaign_id', 'stat_time_day']),
        metrics: JSON.stringify([
          'spend', 'impressions', 'clicks', 'conversion',
          'cost_per_conversion', 'complete_payment_roas',
        ]),
        start_date: startDate,
        end_date: endDate,
      }, accessToken);

      const body = { success: true, data: report };
      setCache('tiktok', cacheParams, body).catch(() => {});
      return NextResponse.json(body);
    }

    if (mode === 'overview') {
      // Combined overview: campaigns + ad performance + ad metadata
      const [campaigns, ads, adPerformance] = await Promise.all([
        ttFetchAll('/campaign/get/', {
          advertiser_id: advertiserId,
          fields: JSON.stringify(['campaign_id', 'campaign_name', 'operation_status', 'objective_type', 'budget']),
        }, accessToken),
        ttFetchAll('/ad/get/', {
          advertiser_id: advertiserId,
          fields: JSON.stringify(['ad_id', 'ad_name', 'campaign_id', 'campaign_name', 'adgroup_name', 'operation_status', 'create_time']),
        }, accessToken),
        ttFetchAll('/report/integrated/get/', {
          advertiser_id: advertiserId,
          report_type: 'BASIC',
          data_level: 'AUCTION_AD',
          dimensions: JSON.stringify(['ad_id']),
          metrics: JSON.stringify([
            'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
            'conversion', 'cost_per_conversion', 'complete_payment',
            'complete_payment_roas',
          ]),
          start_date: startDate,
          end_date: endDate,
        }, accessToken),
      ]);

      // Build ad lookup for merging metadata with performance
      const adMap = new Map(ads.map((a: any) => [a.ad_id, a]));

      // Merge ad metadata with performance data
      const mergedAds = adPerformance.map((p: any) => {
        const meta = adMap.get(p.dimensions.ad_id) || {};
        const m = p.metrics;
        return {
          adId: p.dimensions.ad_id,
          adName: (meta as any).ad_name || 'Unknown',
          campaignId: (meta as any).campaign_id || '',
          campaignName: (meta as any).campaign_name || 'Unknown',
          adgroupName: (meta as any).adgroup_name || '',
          status: (meta as any).operation_status || 'UNKNOWN',
          createTime: (meta as any).create_time || '',
          spend: parseFloat(m.spend) || 0,
          impressions: parseInt(m.impressions) || 0,
          clicks: parseInt(m.clicks) || 0,
          ctr: parseFloat(m.ctr) || 0,
          cpc: parseFloat(m.cpc) || 0,
          cpm: parseFloat(m.cpm) || 0,
          conversions: parseInt(m.conversion) || 0,
          cpa: parseFloat(m.cost_per_conversion) || 0,
          purchases: parseInt(m.complete_payment) || 0,
          roas: parseFloat(m.complete_payment_roas) || 0,
        };
      });

      // Sort by spend descending
      mergedAds.sort((a: any, b: any) => b.spend - a.spend);

      // Summary stats
      const totalSpend = mergedAds.reduce((s: number, a: any) => s + a.spend, 0);
      const totalConversions = mergedAds.reduce((s: number, a: any) => s + a.conversions, 0);
      const totalImpressions = mergedAds.reduce((s: number, a: any) => s + a.impressions, 0);
      const totalClicks = mergedAds.reduce((s: number, a: any) => s + a.clicks, 0);

      const body = {
        success: true,
        data: {
          summary: {
            totalAds: mergedAds.length,
            activeAds: mergedAds.filter((a: any) => a.status === 'ENABLE').length,
            totalSpend,
            totalConversions,
            totalImpressions,
            totalClicks,
            avgCpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
            avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            overallRoas: totalSpend > 0 ? mergedAds.reduce((s: number, a: any) => s + (a.roas * a.spend), 0) / totalSpend : 0,
          },
          campaigns: campaigns.map((c: any) => ({
            id: c.campaign_id,
            name: c.campaign_name,
            status: c.operation_status,
            objective: c.objective_type,
            budget: c.budget,
          })),
          ads: mergedAds,
          dateRange: { startDate, endDate },
        },
      };
      setCache('tiktok', cacheParams, body).catch(() => {});
      return NextResponse.json(body);
    }

    return NextResponse.json({ success: false, error: 'Invalid mode. Use: overview | campaigns | ads | ad-performance | daily' }, { status: 400 });
  } catch (error: any) {
    console.error('TikTok API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
