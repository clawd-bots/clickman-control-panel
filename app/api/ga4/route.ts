import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/api-cache';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

function getClient() {
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY;
  const propertyId = process.env.GA4_PROPERTY_ID;

  if (!clientEmail || !privateKey || !propertyId) {
    throw new Error(
      'Missing GA4 environment variables. Ensure GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY, and GA4_PROPERTY_ID are set.'
    );
  }

  // The private key from env vars may have escaped newlines
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: formattedKey,
    },
  });

  return { client, propertyId };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const mode = searchParams.get('mode') || 'summary'; // summary | daily | traffic | all

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
    if (!forceRefresh) {
      const cached = await getCached('ga4', cacheParams);
      if (cached !== null) return NextResponse.json({ ...cached, _fromCache: true });
    }

    const { client, propertyId } = getClient();

    // Helper to run a summary report with up to 10 metrics
    async function runSummaryBatch(metrics: string[]): Promise<Record<string, number | null>> {
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        metrics: metrics.map(name => ({ name })),
      });
      const result: Record<string, number | null> = {};
      const row = response.rows?.[0];
      if (row && response.metricHeaders) {
        response.metricHeaders.forEach((header, i) => {
          const val = row.metricValues?.[i]?.value;
          result[header.name || ''] = val ? parseFloat(val) : null;
        });
      }
      return result;
    }

    // Fetch summary if needed
    let summary: Record<string, number | null> = {};
    if (mode === 'summary' || mode === 'all') {
      const [batch1, batch2] = await Promise.all([
        runSummaryBatch([
          'sessions', 'totalUsers', 'newUsers', 'activeUsers',
          'screenPageViews', 'screenPageViewsPerSession',
          'averageSessionDuration', 'bounceRate', 'engagedSessions', 'engagementRate',
        ]),
        runSummaryBatch([
          'sessionsPerUser', 'conversions', 'eventCount',
          'ecommercePurchases', 'purchaseRevenue', 'addToCarts',
          'checkouts', 'itemsViewed', 'cartToViewRate', 'purchaseToViewRate',
        ]),
      ]);
      summary = { ...batch1, ...batch2 };

      if (mode === 'summary') {
        return NextResponse.json({
          success: true,
          source: 'ga4',
          dateRange: { startDate, endDate },
          data: { summary },
        });
      }
    }

    // Daily breakdown
    let daily: Record<string, unknown>[] = [];
    if (mode === 'daily' || mode === 'all') {
      const [dailyResponse] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'engagementRate' },
          { name: 'conversions' },
          { name: 'ecommercePurchases' },
          { name: 'purchaseRevenue' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });

      daily = (dailyResponse.rows || []).map((row) => {
        const dateRaw = row.dimensionValues?.[0]?.value || '';
        // GA4 returns date as YYYYMMDD, convert to YYYY-MM-DD
        const date = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;
        const entry: Record<string, unknown> = { date };

        if (dailyResponse.metricHeaders) {
          dailyResponse.metricHeaders.forEach((header, i) => {
            const val = row.metricValues?.[i]?.value;
            entry[header.name || ''] = val ? parseFloat(val) : 0;
          });
        }
        return entry;
      });

      if (mode === 'daily') {
        return NextResponse.json({
          success: true,
          source: 'ga4',
          dateRange: { startDate, endDate },
          data: { daily },
        });
      }
    }

    // Traffic sources breakdown
    let trafficSources: Record<string, unknown>[] = [];
    if (mode === 'traffic' || mode === 'all') {
      const [trafficResponse] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'sessionDefaultChannelGroup' },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'conversions' },
          { name: 'ecommercePurchases' },
          { name: 'purchaseRevenue' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 20,
      });

      trafficSources = (trafficResponse.rows || []).map((row) => {
        const entry: Record<string, unknown> = {
          channel: row.dimensionValues?.[0]?.value || 'Unknown',
        };
        if (trafficResponse.metricHeaders) {
          trafficResponse.metricHeaders.forEach((header, i) => {
            const val = row.metricValues?.[i]?.value;
            entry[header.name || ''] = val ? parseFloat(val) : 0;
          });
        }
        return entry;
      });

      if (mode === 'traffic') {
        return NextResponse.json({
          success: true,
          source: 'ga4',
          dateRange: { startDate, endDate },
          data: { trafficSources },
        });
      }
    }

    // mode === 'all' — summary already fetched above
    const response = {
      success: true,
      source: 'ga4',
      dateRange: { startDate, endDate },
      data: { summary, daily, trafficSources },
    };
    setCache('ga4', cacheParams, response).catch(() => {});
    return NextResponse.json(response);
  } catch (error: unknown) {
    const err = error as { message?: string; code?: number };
    console.error('GA4 API error:', err);

    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
