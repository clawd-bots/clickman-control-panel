import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function GET() {
  try {
    const clientEmail = process.env.GA4_CLIENT_EMAIL;
    const privateKey = process.env.GA4_PRIVATE_KEY;
    const propertyId = process.env.GA4_PROPERTY_ID;

    if (!clientEmail || !privateKey || !propertyId) {
      throw new Error('Missing GA4 environment variables');
    }

    const formattedKey = privateKey.replace(/\\n/g, '\n');

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: formattedKey,
      },
    });

    // Simple test: fetch yesterday's sessions
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    });

    const row = response.rows?.[0];
    const sessions = row?.metricValues?.[0]?.value || '0';
    const users = row?.metricValues?.[1]?.value || '0';

    return NextResponse.json({
      success: true,
      source: 'ga4-connection-test',
      data: {
        propertyId,
        serviceAccount: clientEmail,
        connected: true,
        last7Days: {
          sessions: parseInt(sessions),
          users: parseInt(users),
        },
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('GA4 connection test error:', err);

    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
