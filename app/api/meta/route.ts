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

const PURCHASE_ACTION_TYPES = [
  'purchase', 'omni_purchase',
  'onsite_conversion.purchase', 'onsite_web_purchase', 'onsite_web_app_purchase',
  'offsite_conversion.fb_pixel_purchase',
];

function extractPurchases(actions: any[]): number {
  if (!actions) return 0;
  // Prefer omni_purchase (deduplicated), then fall back to others
  for (const type of PURCHASE_ACTION_TYPES) {
    const match = actions.find((a: any) => a.action_type === type);
    if (match) return parseInt(match.value) || 0;
  }
  return 0;
}

function extractCostPerPurchase(costPerAction: any[]): number {
  if (!costPerAction) return 0;
  for (const type of PURCHASE_ACTION_TYPES) {
    const match = costPerAction.find((a: any) => a.action_type === type);
    if (match) return parseFloat(match.value) || 0;
  }
  return 0;
}

function extractPurchaseRoas(actionValues: any[], spend: number): number {
  if (!actionValues || spend <= 0) return 0;
  // Look for purchase revenue in action_values
  for (const type of PURCHASE_ACTION_TYPES) {
    const match = actionValues.find((a: any) => a.action_type === type);
    if (match) return (parseFloat(match.value) || 0) / spend;
  }
  return 0;
}

/**
 * Ads Insights `actions` mix many action_type values. For parity with Events Manager (web Pixel + CAPI),
 * keep only offsite pixel / custom-conversion rows — not on-Facebook `onsite_conversion.*` (post save,
 * messaging threads, etc.), which is why those looked "wrong" next to PageView / custom pixel names.
 */
function isOffsitePixelActionType(actionType: string): boolean {
  const t = actionType;
  return (
    t.startsWith('offsite_conversion.fb_pixel_custom.') ||
    t.startsWith('offsite_conversion.fb_pixel_') ||
    t.startsWith('offsite_conversion.custom.')
  );
}

/** Standard event names roughly aligned with Meta Events Manager UI labels */
const FB_PIXEL_STANDARD_EVENT_LABELS: Record<string, string> = {
  page_view: 'PageView',
  view_content: 'View content',
  search: 'Search',
  add_to_cart: 'Add to cart',
  add_to_wishlist: 'Add to wishlist',
  initiate_checkout: 'Initiate checkout',
  add_payment_info: 'Add payment info',
  purchase: 'Purchase',
  lead: 'Lead',
  complete_registration: 'Complete registration',
  contact: 'Contact',
  customize_product: 'Customize product',
  donate: 'Donate',
  find_location: 'Find location',
  schedule: 'Schedule',
  start_trial: 'Start trial',
  submit_application: 'Submit application',
  subscribe: 'Subscribe',
};

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
        fields: 'ad_id,ad_name,campaign_id,campaign_name,adset_name,spend,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type,action_values,website_purchase_roas',
        level: 'ad',
        time_range: timeRange,
      });
      return NextResponse.json({ success: true, data: insights });
    }

    if (mode === 'tracking-events') {
      const cacheParams = `${startDate}_${endDate}_tracking-events-v2`;
      if (!forceRefresh) {
        const cached = await getCached('meta', cacheParams);
        if (cached !== null) return NextResponse.json({ ...cached, _fromCache: true });
      }
      const { accountId } = getConfig();

      const formatOffsitePixelLabel = (actionType: string): string => {
        const t = actionType;
        if (t.startsWith('offsite_conversion.fb_pixel_custom.')) {
          return t.slice('offsite_conversion.fb_pixel_custom.'.length);
        }
        if (t.startsWith('offsite_conversion.custom.')) {
          const id = t.slice('offsite_conversion.custom.'.length);
          return id ? `Custom conversion (${id})` : 'Custom conversion';
        }
        if (t.startsWith('offsite_conversion.fb_pixel_')) {
          let rest = t.slice('offsite_conversion.fb_pixel_'.length);
          const norm = rest.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
          if (FB_PIXEL_STANDARD_EVENT_LABELS[norm]) {
            return FB_PIXEL_STANDARD_EVENT_LABELS[norm];
          }
          const under = norm.replace(/-/g, '_');
          if (FB_PIXEL_STANDARD_EVENT_LABELS[under]) {
            return FB_PIXEL_STANDARD_EVENT_LABELS[under];
          }
          // Fallback: snake_case → Title Case (unknown standard names)
          return rest
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }
        return t.replace(/_/g, ' ');
      };

      try {
        const insights = await metaFetch(`/${accountId}/insights`, {
          fields: 'actions',
          level: 'account',
          time_range: timeRange,
        });
        const row = insights.data?.[0];
        const actions = row?.actions || [];
        const allParsed = (actions as { action_type?: string; value?: string }[])
          .map((a) => ({
            rawType: String(a.action_type || ''),
            count: parseInt(String(a.value ?? '0'), 10) || 0,
          }))
          .filter((a) => a.count > 0 && a.rawType);

        const pixelOnly = allParsed
          .filter((a) => isOffsitePixelActionType(a.rawType))
          .sort((a, b) => b.count - a.count);

        const events = pixelOnly.slice(0, 80).map((a) => ({
          event: formatOffsitePixelLabel(a.rawType),
          rawType: a.rawType,
          count: a.count,
        }));

        const payload = {
          success: true,
          data: {
            events,
            /** Offsite pixel / custom conversion rows only (excludes onsite_conversion.*) */
            actionTypesIncluded: pixelOnly.length,
            actionTypesExcluded: Math.max(0, allParsed.length - pixelOnly.length),
            actionTypesTotal: allParsed.length,
            dateRange: { startDate, endDate },
            note:
              'Counts come from Ads Insights (account-level), attribution windows can differ slightly from Events Manager totals.',
          },
        };
        setCache('meta', cacheParams, payload).catch(() => {});
        return NextResponse.json(payload);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Meta tracking-events failed';
        return NextResponse.json({ success: false, error: msg }, { status: 502 });
      }
    }

    if (mode === 'overview') {
      // Fetch campaigns + ad performance in parallel
      const [campaigns, adInsights, accountInfo] = await Promise.all([
        metaFetchAll(`/${accountId}/campaigns`, {
          fields: 'name,status,objective,created_time',
        }),
        metaFetchAll(`/${accountId}/insights`, {
          fields: 'ad_id,ad_name,campaign_id,campaign_name,adset_name,spend,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type,action_values,website_purchase_roas,cost_per_unique_action_type',
          level: 'ad',
          time_range: timeRange,
        }),
        metaFetch(`/${accountId}`, {
          fields: 'name,currency,timezone_name',
        }),
      ]);

      // Process ad insights into a clean format
      const ads = adInsights.map((ad: any) => {
        const purchaseCpa = extractCostPerPurchase(ad.cost_per_action_type);
        const purchases = extractPurchases(ad.actions);
        
        // "Cost per result" — use purchase CPA if available, otherwise use the first 
        // cost_per_action_type entry (which matches Meta's "Cost per result" column)
        let cpa = purchaseCpa;
        let resultType = purchases > 0 ? 'purchase' : '';
        if (cpa === 0 && ad.cost_per_action_type && ad.cost_per_action_type.length > 0) {
          // Use first cost_per_action_type as "Cost per result" 
          const first = ad.cost_per_action_type[0];
          cpa = parseFloat(first.value) || 0;
          resultType = first.action_type || '';
        }
        
        return {
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
          purchases,
          cpa,
          resultType,
          roas: 0, // Will calculate below
        };
      });

      // Calculate ROAS: prefer website_purchase_roas, then action_values, then compute from purchases * CPA
      adInsights.forEach((ad: any, i: number) => {
        // Method 1: website_purchase_roas field (most reliable)
        if (ad.website_purchase_roas) {
          const roasEntry = ad.website_purchase_roas.find((r: any) => r.action_type === 'omni_purchase' || r.action_type === 'offsite_conversion.fb_pixel_purchase');
          if (roasEntry) {
            ads[i].roas = parseFloat(roasEntry.value) || 0;
            return;
          }
        }
        // Method 2: action_values purchase revenue / spend
        if (ad.action_values && ads[i].spend > 0) {
          const roas = extractPurchaseRoas(ad.action_values, ads[i].spend);
          if (roas > 0) {
            ads[i].roas = roas;
            return;
          }
        }
        // Method 3: If we have purchases and CPA, derive approximate revenue
        // (this is a rough fallback)
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

    return NextResponse.json({
      success: false,
      error: 'Invalid mode. Use: overview | account | campaigns | ad-performance | tracking-events',
    }, { status: 400 });
  } catch (error: any) {
    console.error('Meta API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
