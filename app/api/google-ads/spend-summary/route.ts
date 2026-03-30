import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query params required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const customer = getClient();

    // Query daily spend data
    const query = `
      SELECT
        segments.date,
        metrics.cost_micros
      FROM customer
      WHERE segments.date >= '${startDate}'
        AND segments.date <= '${endDate}'
      ORDER BY segments.date ASC
    `;

    const results = await customer.query(query);

    // Build daily data and aggregate by month
    const dailyData: { date: string; spend: number }[] = [];
    const monthlyMap = new Map<string, number>();
    let totalSpend = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results.forEach((row: any) => {
      const date = String(row.segments.date);
      const spend = Number(row.metrics.cost_micros) / 1_000_000;
      totalSpend += spend;

      dailyData.push({ date, spend: Math.round(spend * 100) / 100 });

      // Aggregate by month (YYYY-MM)
      const month = date.substring(0, 7);
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + spend);
    });

    // Convert monthly map to sorted array
    const monthly = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, spend]) => ({
        month,
        spend: Math.round(spend * 100) / 100,
      }));

    return NextResponse.json({
      success: true,
      source: 'google-ads-spend',
      data: {
        totalSpend: Math.round(totalSpend * 100) / 100,
        monthly,
        daily: dailyData,
      },
    });
  } catch (error: unknown) {
    const err = error as { errors?: Array<{ message: string }>; message?: string };
    console.error('Google Ads Spend Summary API error:', err);
    const message = err.errors?.[0]?.message || err.message || 'Unknown error';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
