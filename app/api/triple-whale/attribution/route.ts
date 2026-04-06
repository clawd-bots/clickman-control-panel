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

// Map our tab names to TW model names in the pixel_joined_tvf table
const MODEL_MAP: Record<string, string> = {
  'Last Click': 'Last Click',
  'Linear': 'Linear All',
  'First Click': 'First Click',
  'Linear Paid': 'Linear Paid',
  'Triple': 'Triple Attribution',
};

// Friendly channel names
const CHANNEL_NAMES: Record<string, string> = {
  'facebook-ads': 'Meta Ads',
  'google-ads': 'Google Ads',
  'tiktok-ads': 'TikTok Ads',
  'reddit': 'Reddit Ads',
  'snapchat-ads': 'Snapchat Ads',
  'pinterest-ads': 'Pinterest Ads',
  'bing-ads': 'Microsoft Ads',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const model = searchParams.get('model') || 'Triple';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const forceRefresh = searchParams.get('refresh') === 'true';
    const cacheKey = `${startDate}_${endDate}_${model}`;
    if (!forceRefresh) {
      const cached = await getCached('tw-attribution', cacheKey);
      if (cached !== null) return NextResponse.json({ ...cached, _fromCache: true });
    }

    const { apiKey, shopId } = getConfig();
    const twModel = MODEL_MAP[model] || 'Triple Attribution';

    const query = `
      SELECT
        pj.channel,
        SUM(pj.spend) AS spend,
        SUM(pj.order_revenue) AS order_revenue,
        SUM(pj.orders_quantity) AS orders,
        SUM(pj.new_customer_orders) AS nc_orders,
        SUM(pj.new_customer_order_revenue) AS nc_revenue,
        SUM(pj.website_purchases) AS pixel_purchases,
        SUM(pj.clicks) AS clicks,
        SUM(pj.impressions) AS impressions,
        SUM(pj.sessions) AS sessions
      FROM pixel_joined_tvf pj
      WHERE pj.event_date BETWEEN @startDate AND @endDate
        AND pj.model = '${twModel}'
      GROUP BY pj.channel
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
      throw new Error(`TW SQL API error (${res.status}): ${errText.substring(0, 200)}`);
    }

    const rawData = await res.json();
    const rows = Array.isArray(rawData) ? rawData : (rawData.data || []);

    // Process and enrich channel data
    const channels = rows
      .filter((r: any) => {
        // Only include paid channels and channels with spend or orders
        const ch = (r.channel || '').toLowerCase();
        return (r.spend > 0 || r.orders > 0) && !['excluded', 'direct', 'organic'].some(x => ch.includes(x));
      })
      .map((r: any) => {
        const spend = r.spend || 0;
        const revenue = r.order_revenue || 0;
        const orders = r.orders || 0;
        const ncOrders = r.nc_orders || 0;
        const ncRevenue = r.nc_revenue || 0;
        const rcOrders = orders - ncOrders;
        const purchases = r.pixel_purchases || 0;
        const sessions = r.sessions || 0;

        return {
          channel: CHANNEL_NAMES[r.channel] || r.channel,
          channelId: r.channel,
          spend,
          cpa: orders > 0 ? spend / orders : 0,
          ncCpa: ncOrders > 0 ? spend / ncOrders : 0,
          aov: orders > 0 ? revenue / orders : 0,
          cv: revenue,
          purchases: Math.round(purchases),
          roas: spend > 0 ? revenue / spend : 0,
          ncRoas: spend > 0 ? ncRevenue / spend : 0,
          ncp: Math.round(ncOrders),
          cr: sessions > 0 ? (orders / sessions) * 100 : 0,
          // Extra data
          orders: Math.round(orders),
          ncOrders: Math.round(ncOrders),
          rcOrders: Math.round(rcOrders),
          ncRevenue,
          sessions,
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
        };
      })
      .sort((a: any, b: any) => b.spend - a.spend);

    const response = {
      success: true,
      model,
      twModel,
      dateRange: { startDate, endDate },
      data: channels,
    };

    setCache('tw-attribution', cacheKey, response).catch(() => {});
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('TW Attribution API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
