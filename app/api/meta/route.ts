import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/api-cache';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getConfig() {
  const accessToken = process.env.META_ACCESS_TOKEN?.trim();
  const adAccountId = process.env.META_AD_ACCOUNT_ID?.trim();
  const pixelId = process.env.META_PIXEL_ID?.trim();
  if (!accessToken || !adAccountId) {
    throw new Error('Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID');
  }
  // Ensure act_ prefix
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  return { accessToken, accountId, pixelId: pixelId || undefined };
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

/** YYYY-MM-DD list inclusive */
function eachCalendarDayInclusive(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const [sY, sM, sD] = startIso.split('-').map(Number);
  const [eY, eM, eD] = endIso.split('-').map(Number);
  if (!sY || !sM || !sD || !eY || !eM || !eD) return out;
  const cur = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);
  while (cur <= end) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    );
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function addActionsToTotals(
  totals: Map<string, number>,
  actions: { action_type?: string; value?: string }[] | undefined
): void {
  for (const a of actions || []) {
    const at = String(a.action_type || '');
    const v = parseInt(String(a.value ?? '0'), 10) || 0;
    if (!at || v <= 0) continue;
    totals.set(at, (totals.get(at) || 0) + v);
  }
}

/** Add `action_type` keys that only appear on ad/campaign rows (account daily rows can omit types). Do not add counts for keys already present — ad sums can exceed account totals (multi-ad attribution). */
function mergeMissingActionKeys(base: Map<string, number>, supplement: Map<string, number>): void {
  for (const [k, v] of supplement) {
    if (!base.has(k) && v > 0) base.set(k, v);
  }
}

/** Drop Meta's undifferentiated custom bucket when per-name custom events are present (avoids one "Custom" row + double-count risk). */
function dropAggregateFbPixelCustomIfGranularExists(
  rows: { rawType: string; count: number }[]
): { rawType: string; count: number }[] {
  const hasGranularCustom = rows.some(
    (r) =>
      r.rawType.startsWith('offsite_conversion.fb_pixel_custom.') &&
      r.rawType.length > 'offsite_conversion.fb_pixel_custom.'.length
  );
  if (!hasGranularCustom) return rows;
  return rows.filter((r) => r.rawType !== 'offsite_conversion.fb_pixel_custom');
}

/** Pixel `/stats` API often caps a single request window (commonly 7 days). */
function unixChunkRangesInclusive(startIso: string, endIso: string, maxDays = 7): { start: number; end: number }[] {
  const chunks: { start: number; end: number }[] = [];
  const startMs = new Date(`${startIso}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${endIso}T23:59:59.999Z`).getTime();
  const maxMs = maxDays * 86400000;
  let cur = startMs;
  while (cur <= endMs) {
    const chunkEnd = Math.min(cur + maxMs - 1, endMs);
    chunks.push({ start: Math.floor(cur / 1000), end: Math.floor(chunkEnd / 1000) });
    cur = chunkEnd + 1;
  }
  return chunks;
}

/**
 * Parses `GET /{ads-pixel-id}/stats?aggregation=event` — each `AdsPixelStatsResult` has nested `data`
 * with `{ value, count }` pairs (event name + fires).
 */
function accumulateAdsPixelStatsResponse(body: { data?: unknown[] }, totals: Map<string, number>): number {
  let added = 0;
  const top = body?.data;
  if (!Array.isArray(top)) return 0;
  for (const block of top) {
    const b = block as {
      data?: { value?: string; key?: string; count?: string | number }[];
      value?: string;
      key?: string;
      count?: string | number;
    };
    const inner = b?.data;
    if (Array.isArray(inner)) {
      for (const cell of inner) {
        const name = String(cell?.value ?? cell?.key ?? '').trim();
        const n = parseInt(String(cell?.count ?? 0), 10) || 0;
        if (!name || n <= 0) continue;
        totals.set(name, (totals.get(name) || 0) + n);
        added += n;
      }
    } else if (b && (b.value != null || b.key != null)) {
      const name = String(b.value ?? b.key ?? '').trim();
      const n = parseInt(String(b.count ?? 0), 10) || 0;
      if (!name || n <= 0) continue;
      totals.set(name, (totals.get(name) || 0) + n);
      added += n;
    }
  }
  return added;
}

async function resolveAdsPixelId(accountId: string, explicit?: string): Promise<string | null> {
  const cleaned = explicit?.replace(/\s/g, '') ?? '';
  if (/^\d{5,}$/.test(cleaned)) return cleaned;
  try {
    const res = await metaFetch(`/${accountId}/adspixels`, { fields: 'id,name', limit: '10' });
    const first = res?.data?.[0];
    if (first?.id) return String(first.id);
  } catch {
    /* no pixels on account */
  }
  return null;
}

/**
 * Events Manager–style breakdown: `/{pixel-id}/stats` with `aggregation=event` (not Ads Insights).
 * Sums WEB + SERVER buckets per chunk so browser + CAPI both appear.
 */
async function fetchPixelEventStatsAggregated(
  pixelId: string,
  startIso: string,
  endIso: string
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  const chunks = unixChunkRangesInclusive(startIso, endIso, 7);

  for (const { start, end } of chunks) {
    const baseParams: Record<string, string> = {
      aggregation: 'event',
      start_time: String(start),
      end_time: String(end),
    };

    let gotAny = false;
    try {
      const combined = await metaFetch(`/${pixelId}/stats`, baseParams);
      if (accumulateAdsPixelStatsResponse(combined, totals) > 0) gotAny = true;
    } catch {
      /* fall through to split sources */
    }

    if (!gotAny) {
      for (const eventSource of ['WEB_ONLY', 'SERVER_ONLY'] as const) {
        try {
          const res = await metaFetch(`/${pixelId}/stats`, {
            ...baseParams,
            event_source: eventSource,
          });
          accumulateAdsPixelStatsResponse(res, totals);
        } catch {
          /* ignore */
        }
      }
    }
  }

  return totals;
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

/** Display label for pixel `/stats` event names (normalize snake_case standard events). */
function labelPixelStatsEventName(name: string): string {
  const n = name.trim();
  if (!n) return n;
  const lower = n.toLowerCase().replace(/-/g, '_');
  if (FB_PIXEL_STANDARD_EVENT_LABELS[lower]) {
    return FB_PIXEL_STANDARD_EVENT_LABELS[lower];
  }
  return n;
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
        fields: 'ad_id,ad_name,campaign_id,campaign_name,adset_name,spend,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type,action_values,website_purchase_roas',
        level: 'ad',
        time_range: timeRange,
      });
      return NextResponse.json({ success: true, data: insights });
    }

    if (mode === 'tracking-events') {
      /** Bump cache key when aggregation / filter logic changes. */
      const cacheParams = `${startDate}_${endDate}_tracking-events-v6-pixel-stats`;
      if (!forceRefresh) {
        const cached = await getCached('meta', cacheParams);
        if (cached !== null) return NextResponse.json({ ...cached, _fromCache: true });
      }
      const cfg = getConfig();
      const { accountId } = cfg;

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
          /** Undifferentiated bucket — not `fb_pixel_custom.EVENT` (handled above). */
          if (t === 'offsite_conversion.fb_pixel_custom') {
            return 'Custom pixel (aggregate)';
          }
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
        /**
         * Primary: `GET /{pixel-id}/stats?aggregation=event` — same family of data as Events Manager
         * (per event name, including custom). Chunked to 7-day windows; WEB + SERVER when needed.
         * Fallback: Ads Insights action_type merge (often truncated to a few rows).
         */
        let pixelOnly: { rawType: string; count: number }[] = [];
        let dataSource: 'pixel-stats' | 'ads-insights' = 'ads-insights';
        let allParsedCount = 0;

        const pixelIdResolved = await resolveAdsPixelId(accountId, cfg.pixelId);
        if (pixelIdResolved) {
          try {
            const pt = await fetchPixelEventStatsAggregated(pixelIdResolved, startDate, endDate);
            if (pt.size > 0) {
              dataSource = 'pixel-stats';
              pixelOnly = [...pt.entries()]
                .map(([name, count]) => ({
                  rawType: `pixel_stats:${name}`,
                  count,
                }))
                .sort((a, b) => b.count - a.count);
              allParsedCount = pixelOnly.length;
            }
          } catch (e) {
            console.warn('Meta pixel /stats failed, will try Ads Insights:', e);
          }
        }

        if (pixelOnly.length === 0) {
          const totals = new Map<string, number>();
          const dayList = eachCalendarDayInclusive(startDate, endDate);
          const maxDailyAccountCalls = 62;

          if (dayList.length > 0 && dayList.length <= maxDailyAccountCalls) {
            const BATCH = 6;
            for (let i = 0; i < dayList.length; i += BATCH) {
              const chunk = dayList.slice(i, i + BATCH);
              const results = await Promise.all(
                chunk.map((d) =>
                  metaFetch(`/${accountId}/insights`, {
                    fields: 'actions',
                    level: 'account',
                    time_range: JSON.stringify({ since: d, until: d }),
                  })
                )
              );
              for (const insights of results) {
                const row = insights.data?.[0];
                addActionsToTotals(totals, row?.actions);
              }
            }
          } else {
            const insights = await metaFetch(`/${accountId}/insights`, {
              fields: 'actions',
              level: 'account',
              time_range: timeRange,
            });
            addActionsToTotals(totals, insights.data?.[0]?.actions);
          }

          const adRows = await metaFetchAll(
            `/${accountId}/insights`,
            {
              fields: 'actions',
              level: 'ad',
              time_range: timeRange,
            },
            100
          );
          const adTotals = new Map<string, number>();
          for (const row of adRows) {
            addActionsToTotals(adTotals, (row as { actions?: { action_type?: string; value?: string }[] }).actions);
          }
          mergeMissingActionKeys(totals, adTotals);

          const campRows = await metaFetchAll(
            `/${accountId}/insights`,
            {
              fields: 'actions',
              level: 'campaign',
              time_range: timeRange,
            },
            100
          );
          const campTotals = new Map<string, number>();
          for (const row of campRows) {
            addActionsToTotals(campTotals, (row as { actions?: { action_type?: string; value?: string }[] }).actions);
          }
          mergeMissingActionKeys(totals, campTotals);

          const allParsed = [...totals.entries()].map(([rawType, count]) => ({ rawType, count }));
          allParsedCount = allParsed.length;

          let rows = allParsed
            .filter((a) => isOffsitePixelActionType(a.rawType))
            .sort((a, b) => b.count - a.count);

          rows = dropAggregateFbPixelCustomIfGranularExists(rows);
          pixelOnly = rows;
        }

        const events = pixelOnly.map((a) => ({
          event: a.rawType.startsWith('pixel_stats:')
            ? labelPixelStatsEventName(a.rawType.slice('pixel_stats:'.length))
            : formatOffsitePixelLabel(a.rawType),
          rawType: a.rawType,
          count: a.count,
        }));

        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );
        const totalPixelEvents = pixelOnly.reduce((s, a) => s + a.count, 0);
        const totalEventsPerDay = Math.round(totalPixelEvents / days);

        const payload = {
          success: true,
          data: {
            events,
            totalEventsPerDay,
            /** Offsite pixel / CAPI web rows only (excludes onsite_conversion.* on-Facebook) */
            actionTypesIncluded: pixelOnly.length,
            actionTypesExcluded: Math.max(0, allParsedCount - pixelOnly.length),
            actionTypesTotal: allParsedCount,
            dateRange: { startDate, endDate },
            dataSource,
            pixelIdResolved: Boolean(pixelIdResolved),
            note:
              dataSource === 'pixel-stats'
                ? 'Counts from Ads Pixel `/stats` with aggregation=event (aligned with Events Manager names). Range split into ≤7-day chunks. If empty, falls back to Ads Insights.'
                : 'Counts from Ads Insights (account daily + ad/campaign keys). Set META_PIXEL_ID or ensure the ad account has a linked pixel for `/stats` breakdown.',
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
