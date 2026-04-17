import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';
import { getCached, setCache } from '@/lib/api-cache';

// Initialize the Google Ads client from environment variables
function getClient() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

  if (!clientId || !clientSecret || !developerToken || !refreshToken || !customerId) {
    throw new Error('Missing Google Ads environment variables');
  }

  const api = new GoogleAdsApi({
    client_id: clientId,
    client_secret: clientSecret,
    developer_token: developerToken,
  });

  const customer = api.Customer({
    customer_id: customerId,
    login_customer_id: loginCustomerId || undefined,
    refresh_token: refreshToken,
  });

  return customer;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD
    const metric = searchParams.get('metric') || 'spend'; // spend | all

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query params required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
    const cacheParams = `${startDate}_${endDate}_${metric}`;
    if (!forceRefresh) {
      const cached = await getCached('google-ads', cacheParams);
      if (cached !== null) {
        return NextResponse.json({ ...(cached as Record<string, unknown>), _fromCache: true });
      }
    }

    const customer = getClient();

    // Build query based on requested metric
    let query: string;
    if (metric === 'spend') {
      query = `
        SELECT 
          segments.date,
          metrics.cost_micros
        FROM customer
        WHERE segments.date >= '${startDate}'
          AND segments.date <= '${endDate}'
        ORDER BY segments.date ASC
      `;
    } else {
      // Full metrics
      query = `
        SELECT 
          segments.date,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc,
          metrics.average_cpm
        FROM customer
        WHERE segments.date >= '${startDate}'
          AND segments.date <= '${endDate}'
        ORDER BY segments.date ASC
      `;
    }

    const results = await customer.query(query);

    // Transform to clean format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = results.map((row: any) => {
      const base: Record<string, unknown> = {
        date: row.segments.date as string,
        spend: Number(row.metrics.cost_micros) / 1_000_000,
      };

      if (metric === 'all') {
        base.impressions = Number(row.metrics.impressions);
        base.clicks = Number(row.metrics.clicks);
        base.conversions = Number(row.metrics.conversions);
        base.conversionsValue = Number(row.metrics.conversions_value);
        base.ctr = Number(row.metrics.ctr);
        base.avgCpc = Number(row.metrics.average_cpc) / 1_000_000;
        base.avgCpm = Number(row.metrics.average_cpm) / 1_000_000;
      }

      return base;
    });

    const payload = {
      success: true,
      source: 'google-ads',
      customerId: process.env.GOOGLE_ADS_CUSTOMER_ID,
      dateRange: { startDate, endDate },
      data,
    };
    setCache('google-ads', cacheParams, payload).catch(() => {});
    return NextResponse.json(payload);
  } catch (error: unknown) {
    const err = error as { errors?: Array<{ message: string }>; message?: string };
    console.error('Google Ads API error:', err);

    // Extract meaningful error from Google Ads API errors
    const message = err.errors?.[0]?.message || err.message || 'Unknown error';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
