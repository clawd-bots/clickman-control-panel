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

    // Query conversion actions with metrics from the campaign resource
    // (conversion_action resource doesn't support segments.date filtering directly)
    const query = `
      SELECT
        conversion_action.name,
        conversion_action.type,
        conversion_action.category,
        metrics.all_conversions,
        metrics.conversions
      FROM conversion_action
      WHERE metrics.all_conversions > 0
    `;

    let events: { event: string; count: string; type: string }[] = [];
    let totalConversions = 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await customer.query(query);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      events = results.map((row: any) => {
        const allConv = Number(row.metrics.all_conversions) || 0;
        totalConversions += allConv;
        return {
          event: String(row.conversion_action.name || 'Unknown'),
          count: String(Math.round(allConv)),
          type: String(row.conversion_action.type || 'Conversion'),
        };
      });
    } catch {
      // Fallback: try querying from customer resource with conversion metrics by date
      const fallbackQuery = `
        SELECT
          segments.conversion_action_name,
          segments.conversion_action,
          metrics.all_conversions,
          metrics.conversions
        FROM customer
        WHERE segments.date >= '${startDate}'
          AND segments.date <= '${endDate}'
      `;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = await customer.query(fallbackQuery);
        const eventMap = new Map<string, number>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results.forEach((row: any) => {
          const name = String(row.segments.conversion_action_name || 'Unknown');
          const allConv = Number(row.metrics.all_conversions) || 0;
          eventMap.set(name, (eventMap.get(name) || 0) + allConv);
        });

        eventMap.forEach((count, name) => {
          totalConversions += count;
          events.push({
            event: name,
            count: String(Math.round(count)),
            type: 'Conversion',
          });
        });
      } catch {
        // Final fallback: basic campaign-level conversion data
        const campaignQuery = `
          SELECT
            metrics.conversions,
            metrics.all_conversions
          FROM campaign
          WHERE segments.date >= '${startDate}'
            AND segments.date <= '${endDate}'
        `;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = await customer.query(campaignQuery);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results.forEach((row: any) => {
          totalConversions += Number(row.metrics.all_conversions) || 0;
        });

        events.push({
          event: 'all_conversions',
          count: String(Math.round(totalConversions)),
          type: 'Conversion',
        });
      }
    }

    // Calculate days in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const totalEventsPerDay = Math.round(totalConversions / days);

    // Determine status
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    if (totalConversions === 0) {
      status = 'error';
    } else if (totalEventsPerDay < 10) {
      status = 'warning';
    }

    // Sort events by count descending
    events.sort((a, b) => Number(b.count) - Number(a.count));

    return NextResponse.json({
      success: true,
      source: 'google-ads-tracking',
      data: {
        totalEventsPerDay,
        status,
        events,
      },
    });
  } catch (error: unknown) {
    const err = error as { errors?: Array<{ message: string }>; message?: string };
    console.error('Google Ads Tracking API error:', err);
    const message = err.errors?.[0]?.message || err.message || 'Unknown error';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
