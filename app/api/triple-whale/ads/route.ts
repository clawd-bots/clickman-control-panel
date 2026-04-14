import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/api-cache';

const TW_SQL_URL = 'https://api.triplewhale.com/api/v2/orcabase/api/sql';

function getConfig() {
  const apiKey = process.env.TRIPLE_WHALE_API_KEY;
  const shopId = process.env.TRIPLE_WHALE_SHOP_ID;
  if (!apiKey || !shopId) {
    throw new Error('Missing TRIPLE_WHALE_API_KEY or TRIPLE_WHALE_SHOP_ID');
  }
  return { apiKey, shopId };
}

const MODEL_MAP: Record<string, string> = {
  'First Click': 'First Click',
  'Last Click': 'Last Click',
  'Linear All': 'Linear All',
  'Linear Paid': 'Linear Paid',
  'Triple Attribution': 'Triple Attribution',
  'Triple Attribution + Platform Views': 'Triple Attribution + Platform Views',
  'Clicks * Deterministic Views': 'Clicks * Deterministic Views',
  'Triple': 'Triple Attribution',
};

const WINDOW_MAP: Record<string, string> = {
  '1 day': '1_day',
  '7 days': '7_days',
  '14 days': '14_days',
  '28 days': '28_days',
  'Lifetime': 'lifetime',
};

const CHANNEL_NAMES: Record<string, string> = {
  'facebook-ads': 'Meta',
  'google-ads': 'Google',
  'tiktok-ads': 'TikTok',
  'reddit': 'Reddit',
  'snapchat-ads': 'Snapchat',
  'pinterest-ads': 'Pinterest',
  'bing-ads': 'Microsoft',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const model = searchParams.get('model') || 'Linear All';
    const window = searchParams.get('window') || 'Lifetime';
    const platform = searchParams.get('platform'); // optional filter

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const forceRefresh = searchParams.get('refresh') === 'true';
    // v4: group by (channel, ad_id) only — grouping by ad_name/campaign_name split the same ad across rows
    //      and zeroed attributed orders on some shards. argMax picks the label tied to the largest spend row.
    const cacheKey = `v4_ads_${startDate}_${endDate}_${model}_${window}_${platform || 'all'}`;
    if (!forceRefresh) {
      const cached = await getCached('tw-ads', cacheKey);
      if (cached !== null) return NextResponse.json({ ...cached, _fromCache: true });
    }

    const { apiKey, shopId } = getConfig();
    const twModel = MODEL_MAP[model] || 'Triple Attribution';
    const twWindow = WINDOW_MAP[window] || 'lifetime';

    // Query ad-level data from Triple Whale's pixel_joined_tvf.
    // Must GROUP BY channel + ad_id only: same ad_id can appear with different ad_name/campaign_name
    // strings over time; grouping by name split spend vs orders across rows and produced CPA "—" in UI.
    const query = `
      SELECT
        pj.channel,
        argMax(pj.campaign_name, pj.spend) AS campaign_name,
        argMax(pj.ad_name, pj.spend) AS ad_name,
        pj.ad_id,
        SUM(pj.spend) AS spend,
        SUM(pj.order_revenue) AS order_revenue,
        SUM(pj.orders_quantity) AS orders,
        SUM(pj.new_customer_orders) AS nc_orders,
        SUM(pj.new_customer_order_revenue) AS nc_revenue,
        SUM(pj.website_purchases) AS pixel_purchases,
        SUM(pj.clicks) AS clicks,
        SUM(pj.impressions) AS impressions
      FROM pixel_joined_tvf pj
      WHERE pj.event_date BETWEEN @startDate AND @endDate
        AND pj.model = '${twModel}'
        AND pj.attribution_window = '${twWindow}'
        AND coalesce(pj.ad_id, '') != ''
      GROUP BY pj.channel, pj.ad_id
      ORDER BY SUM(pj.spend) DESC
      LIMIT 5000
    `;

    const res = await fetch(TW_SQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        shopId,
        query,
        period: { startDate, endDate },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TW SQL API error (${res.status}): ${errText.substring(0, 300)}`);
    }

    const rawData = await res.json();
    const rows = Array.isArray(rawData) ? rawData : (rawData.data || []);

    // TW SQL API returns values in USD — convert to PHP (shop currency)
    // Use env var or fetch rate; fallback to 57
    let usdToPhp = parseFloat(process.env.USD_TO_PHP_RATE || '') || 57;
    try {
      // Fetch from exchangerate-api (same source as /api/exchange-rate)
      const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        if (rateData?.rates?.PHP) usdToPhp = rateData.rates.PHP;
      }
    } catch { /* use fallback */ }

    // Process ad-level data
    const ads = rows
      .filter((r: any) => {
        const ch = (r.channel || '').toLowerCase();
        // Exclude non-paid channels
        if (['excluded', 'direct', 'organic'].some(x => ch.includes(x))) return false;
        // Platform filter if specified
        if (platform) {
          const platformChannel = Object.entries(CHANNEL_NAMES).find(([, v]) => v === platform);
          if (platformChannel && r.channel !== platformChannel[0]) return false;
        }
        // Include all ads (even those with $0 spend but impressions/clicks)
        return (r.spend > 0 || r.impressions > 0 || r.clicks > 0);
      })
      .map((r: any) => {
        // TW SQL API (pixel_joined_tvf) returns values in USD
        // Convert monetary values to PHP for consistency with Summary Page API
        const spend = (r.spend || 0) * usdToPhp;
        const revenue = (r.order_revenue || 0) * usdToPhp;
        // Prefer model-attributed purchases (orders_quantity === r.orders) so CPA / ROAS match TW
        // "Triple Attribution Purchases" & CV columns. Pixel website_purchases is platform-level volume
        // and diverges from attributed orders (especially for Triple Attribution).
        const attributedOrders = Math.round(r.orders || 0);
        const pixelPurchases = Math.round(r.pixel_purchases || 0);
        const orders = attributedOrders > 0 ? attributedOrders : pixelPurchases;
        // NC orders can't exceed total orders
        const rawNcOrders = r.nc_orders || 0;
        const ncOrders = Math.min(rawNcOrders, orders);
        const ncRevenue = (r.nc_revenue || 0) * usdToPhp;

        return {
          adId: r.ad_id || '',
          adName: r.ad_name || 'Unknown',
          campaignName: r.campaign_name || 'Unknown',
          platform: CHANNEL_NAMES[r.channel] || r.channel,
          channelId: r.channel,
          spend,
          cpa: orders > 0 ? spend / orders : 0,
          ncCpa: ncOrders > 0 ? spend / ncOrders : 0,
          roas: spend > 0 ? revenue / spend : 0,  // ROAS is a ratio, no conversion needed
          ncRoas: spend > 0 ? ncRevenue / spend : 0,
          orders: Math.round(orders),
          ncOrders: Math.round(ncOrders),
          revenue,
          ncRevenue,
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
        };
      });

    const response = {
      success: true,
      model,
      twModel,
      window,
      twWindow,
      dateRange: { startDate, endDate },
      totalAds: ads.length,
      usdToPhpRate: usdToPhp,
      data: ads,
    };

    setCache('tw-ads', cacheKey, response).catch(() => {});
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('TW Ads API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
