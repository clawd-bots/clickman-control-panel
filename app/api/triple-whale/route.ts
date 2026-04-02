import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/api-cache';

const TW_BASE_URL = 'https://api.triplewhale.com/api/v2';

function getConfig() {
  const apiKey = process.env.TRIPLE_WHALE_API_KEY;
  const shopId = process.env.TRIPLE_WHALE_SHOP_ID;

  if (!apiKey || !shopId) {
    throw new Error(
      'Missing Triple Whale environment variables. Ensure TRIPLE_WHALE_API_KEY and TRIPLE_WHALE_SHOP_ID are set.'
    );
  }

  return { apiKey, shopId };
}

// Convert day-of-year (x) to YYYY-MM-DD based on start date
function dayOfYearToDate(dayOfYear: number, year: number): string {
  const date = new Date(year, 0); // Jan 1
  date.setDate(dayOfYear);
  return date.toISOString().split('T')[0];
}

// Determine the year from startDate
function getYear(startDate: string): number {
  return parseInt(startDate.split('-')[0], 10);
}

interface TWMetricValue {
  current: string | number | null;
  previous: string | number | null;
}

interface TWChartPoint {
  x: number;
  y: number;
}

interface TWMetric {
  id: string;
  title: string;
  metricId: string;
  tip?: string;
  services: string[];
  type: string; // currency | decimal | percent | duration | string
  delta: number;
  values: TWMetricValue;
  charts: {
    current: TWChartPoint[];
    previous: TWChartPoint[];
  };
}

// The key metrics we extract for the dashboard (mapped to Click-Man's naming)
// This is the curated set — TW returns 200+ metrics, we only need these
const DASHBOARD_METRICS: Record<string, string> = {
  // Revenue
  'sales': 'orderRevenue',
  'topKpiGrossSales': 'grossSales',
  'topKpiNetRevenue': 'netRevenue',
  'netSales': 'totalSales',
  'newCustomerSales': 'newCustomerRevenue',
  'rcRevenue': 'returningCustomerRevenue',
  'blendedSales': 'blendedSales',
  // Orders
  'shopifyOrders': 'orders',
  'newCustomersOrders': 'newCustomerOrders',
  'shopifyOrdersWithAmount': 'ordersWithAmount',
  'totalOrdersCombinedItemsQuantity': 'itemsSold',
  // Costs & Spend
  'totalAdSpend': 'blendedAdSpend',
  'facebookAds': 'metaAdSpend',
  'googleAds': 'googleAdSpend',
  'tiktokAds': 'tiktokAdSpend',
  'redditSpend': 'redditAdSpend',
  'cogs': 'cogs',
  'cogsOrders': 'cogsOrders',
  'cogsRefunds': 'cogsRefunds',
  'paymentGateways': 'paymentGatewayCosts',
  // Efficiency (all calculated by TW server-side — NOT by us)
  'mer': 'mer',
  'newCustomersCpa': 'ncpa',
  'shopifyCpa': 'blendedCpa',
  'totalCpa': 'totalCpa',
  'newCustomersRoas': 'newCustomerRoas',
  'blendedAttributedRoas': 'blendedAttributedRoas',
  'poas': 'poas',
  // Profit
  'grossProfit': 'grossProfit',
  'totalNetProfit': 'netProfit',
  'totalNetMargin': 'netMargin',
  'cashTurnover': 'cashTurnover',
  'topKpiContributionProfit': 'contributionProfit',
  'topKpiRoas': 'topRoas',
  'topKpiPoas': 'topPoas',
  // Refunds
  'totalRefunds': 'refunds',
  // AOV & LTV
  'shopifyAov': 'aov',
  'shopifyAovIncludeZero': 'aovIncludeZero',
  'uniqueCustomerSales': 'ltv',
  'customerFrequency': 'customerFrequency',
  // Traffic & Pixel
  'pixelVisitors': 'sessions',
  'pixelUniqueVisitors': 'uniqueUsers',
  'pixelConversionRate': 'conversionRate',
  'pixelCostPerSession': 'costPerSession',
  'pixelCostPerAtc': 'costPerAddToCart',
  'pixelBounceRate': 'bounceRate',
  'pixelPurchases': 'pixelPurchases',
  'pixelUniqueSessionsAtc': 'addToCarts',
  'pixelPercentAtc': 'addToCartRate',
  'pixelNewVisitors': 'newUsers',
  'pixelPercentNewVisitors': 'newUsersPercent',
  'pixelPageViews': 'pageViews',
  'pixelAvgPagesPerSession': 'pagesPerSession',
  'pixelAvgSessionDuration': 'avgSessionDuration',
  // Meta (Facebook)
  'facebookRoas': 'metaRoas',
  'facebookCpa': 'metaCpa',
  'facebookImpressions': 'metaImpressions',
  'facebookClicks': 'metaClicks',
  'facebookOutboundClicks': 'metaOutboundClicks',
  'facebookCtr': 'metaCtr',
  'facebookCpm': 'metaCpm',
  'facebookCpc': 'metaCpc',
  'facebookPurchases': 'metaPurchases',
  'facebookMetaPurchases': 'metaTotalPurchases',
  'facebookConversionValue': 'metaConversionValue',
  'facebookCpoc': 'metaCpoc',
  // Google
  'googleRoas': 'googleRoas',
  'totalAllRoas': 'googleAllRoas',
  'googleCpa': 'googleCpa',
  'googleAllCpa': 'googleAllCpa',
  'totalGoogleAdsImpressions': 'googleImpressions',
  'totalGoogleAdsClicks': 'googleClicks',
  'totalGoogleAdsCtr': 'googleCtr',
  'totalGoogleAdsCpm': 'googleCpm',
  'googleCpc': 'googleCpc',
  'googleConversionValue': 'googleConversionValue',
  // TikTok
  'tiktokRoas': 'tiktokRoas',
  'tiktokCpa': 'tiktokCpa',
  'tiktokImpressions': 'tiktokImpressions',
  'tiktokCtr': 'tiktokCtr',
  'tiktokCpm': 'tiktokCpm',
  'tiktokCpc': 'tiktokCpc',
  'tiktokPurchases': 'tiktokPurchases',
  'tiktokConversionValue': 'tiktokConversionValue',
  // Reddit
  'redditRoas': 'redditRoas',
  'redditCPA': 'redditCpa',
  'redditImpressions': 'redditImpressions',
  'redditClicks': 'redditClicks',
  'redditVCTR': 'redditCtr',
  'redditVCPM': 'redditCpm',
  'redditActualCPC': 'redditCpc',
  'redditConversions': 'redditConversions',
  'redditConversionValue': 'redditConversionValue',
};

function roundValue(type: string, value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (isNaN(num)) return null;

  switch (type) {
    case 'currency':
      return Math.round(num * 100) / 100;
    case 'percent':
      return Math.round(num * 100) / 100; // Already percentage, round to 2dp
    case 'decimal':
      return Math.round(num * 10000) / 10000;
    case 'duration':
      return Math.round(num);
    default:
      return Math.round(num * 100) / 100;
  }
}

async function fetchSummaryPageData(
  apiKey: string,
  shopDomain: string,
  startDate: string,
  endDate: string
): Promise<TWMetric[]> {
  const response = await fetch(`${TW_BASE_URL}/summary-page/get-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      shopDomain,
      period: {
        start: startDate,
        end: endDate,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(`Triple Whale API error (${response.status}): ${errorMessage}`);
  }

  const body = await response.json();
  // TW returns { metrics: [...] }
  if (body && Array.isArray(body.metrics)) {
    return body.metrics;
  }
  // Fallback if it's a direct array
  if (Array.isArray(body)) {
    return body;
  }
  throw new Error('Unexpected Triple Whale API response format');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const mode = searchParams.get('mode') || 'summary'; // summary | daily | all | raw

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate query params required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { success: false, error: 'Dates must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    const forceRefresh = searchParams.get('refresh') === 'true';
    const cacheParams = `${startDate}_${endDate}_${mode}`;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCached('triple-whale', cacheParams);
      if (cached !== null) {
        return NextResponse.json({ ...cached, _fromCache: true });
      }
    }

    const { apiKey, shopId } = getConfig();
    const allMetrics = await fetchSummaryPageData(apiKey, shopId, startDate, endDate);

    // Build a lookup by id
    const metricMap = new Map<string, TWMetric>();
    for (const m of allMetrics) {
      metricMap.set(m.id, m);
    }

    if (mode === 'raw') {
      // Return the full raw response for debugging
      return NextResponse.json({
        success: true,
        source: 'triple-whale',
        dateRange: { startDate, endDate },
        totalMetrics: allMetrics.length,
        data: allMetrics,
      });
    }

    // Extract curated summary values
    const summary: Record<string, { current: number | null; previous: number | null; delta: number; type: string }> = {};
    for (const [twId, ourName] of Object.entries(DASHBOARD_METRICS)) {
      const metric = metricMap.get(twId);
      if (metric) {
        summary[ourName] = {
          current: roundValue(metric.type, metric.values.current),
          previous: roundValue(metric.type, metric.values.previous),
          delta: metric.delta,
          type: metric.type,
        };
      }
    }

    if (mode === 'summary') {
      return NextResponse.json({
        success: true,
        source: 'triple-whale',
        dateRange: { startDate, endDate },
        data: { summary },
      });
    }

    // Extract daily chart data for key metrics
    const year = getYear(startDate);
    const daily: Record<string, { date: string; value: number }[]> = {};

    for (const [twId, ourName] of Object.entries(DASHBOARD_METRICS)) {
      const metric = metricMap.get(twId);
      if (metric && metric.charts.current && metric.charts.current.length > 0) {
        daily[ourName] = metric.charts.current.map((point) => ({
          date: dayOfYearToDate(point.x, year),
          value: roundValue(metric.type, point.y) ?? 0,
        }));
      }
    }

    if (mode === 'daily') {
      return NextResponse.json({
        success: true,
        source: 'triple-whale',
        dateRange: { startDate, endDate },
        data: { daily },
      });
    }

    if (mode === 'all') {
      const response = {
        success: true,
        source: 'triple-whale',
        dateRange: { startDate, endDate },
        data: { summary, daily },
      };
      // Cache the response
      setCache('triple-whale', cacheParams, response).catch(() => {});
      return NextResponse.json(response);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid mode param. Use: summary | daily | all | raw' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Triple Whale API error:', err);

    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
