import { NextRequest, NextResponse } from 'next/server';

const REDDIT_ADS_BASE = 'https://ads-api.reddit.com/api/v3';
const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';

// In-memory token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

function getConfig() {
  const clientId = process.env.REDDIT_CLIENT_ID?.trim();
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
  const refreshToken = process.env.REDDIT_REFRESH_TOKEN?.trim();
  const adAccountId = process.env.REDDIT_AD_ACCOUNT_ID?.trim();
  if (!clientId || !clientSecret || !refreshToken || !adAccountId) {
    throw new Error('Missing Reddit Ads credentials (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_REFRESH_TOKEN, REDDIT_AD_ACCOUNT_ID)');
  }
  return { clientId, clientSecret, refreshToken, adAccountId };
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300000) {
    return cachedToken.token;
  }

  const { clientId, clientSecret, refreshToken } = getConfig();

  // Reddit requires specific User-Agent format and Basic auth
  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const body = new URLSearchParams();
  body.append('grant_type', 'refresh_token');
  body.append('refresh_token', refreshToken);

  const res = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': `web:${clientId}:v1.0 (by /u/Clickman)`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Reddit token refresh failed: ${res.status} | ${errText}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error(`Reddit token response missing access_token: ${JSON.stringify(data)}`);

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 86400) * 1000,
  };
  return cachedToken.token;
}

async function redditFetch(path: string, params: Record<string, string> = {}): Promise<any> {
  const token = await getAccessToken();
  const url = new URL(`${REDDIT_ADS_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Clickman/1.0',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reddit Ads API ${res.status}: ${text}`);
  }

  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    const { adAccountId } = getConfig();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'overview';

    if (mode === 'campaigns') {
      const data = await redditFetch('/campaigns', { ad_account_id: adAccountId });
      return NextResponse.json({ success: true, data: data.data || [] });
    }

    if (mode === 'ads') {
      const data = await redditFetch('/ads', { ad_account_id: adAccountId });
      return NextResponse.json({ success: true, data: data.data || [] });
    }

    if (mode === 'ad-groups') {
      const data = await redditFetch('/ad_groups', { ad_account_id: adAccountId });
      return NextResponse.json({ success: true, data: data.data || [] });
    }

    if (mode === 'report') {
      const startDate = searchParams.get('startDate') || '2026-03-01';
      const endDate = searchParams.get('endDate') || '2026-03-31';

      const data = await redditFetch('/reports', {
        ad_account_id: adAccountId,
        start_date: startDate,
        end_date: endDate,
        level: 'AD',
        metrics: 'impressions,clicks,spend,conversions,cpc,cpm,ctr',
      });
      return NextResponse.json({ success: true, data: data.data || [] });
    }

    if (mode === 'overview') {
      // Fetch campaigns and ads in parallel
      const [campaignsRes, adsRes, adGroupsRes] = await Promise.all([
        redditFetch('/campaigns', { ad_account_id: adAccountId }).catch(() => ({ data: [] })),
        redditFetch('/ads', { ad_account_id: adAccountId }).catch(() => ({ data: [] })),
        redditFetch('/ad_groups', { ad_account_id: adAccountId }).catch(() => ({ data: [] })),
      ]);

      const campaigns = (campaignsRes.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.effective_status || c.configured_status,
        objective: c.objective,
        createdAt: c.created_at,
      }));

      const ads = (adsRes.data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        status: a.effective_status || a.configured_status,
        campaignId: a.campaign_id,
        adGroupId: a.ad_group_id,
        createdAt: a.created_at,
      }));

      const adGroups = (adGroupsRes.data || []).map((ag: any) => ({
        id: ag.id,
        name: ag.name,
        status: ag.effective_status || ag.configured_status,
        campaignId: ag.campaign_id,
        createdAt: ag.created_at,
      }));

      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalCampaigns: campaigns.length,
            activeCampaigns: campaigns.filter((c: any) => c.status === 'ACTIVE').length,
            totalAds: ads.length,
            totalAdGroups: adGroups.length,
          },
          campaigns,
          ads,
          adGroups,
        },
      });
    }

    if (mode === 'test') {
      // Simple connection test
      const me = await redditFetch('/me');
      return NextResponse.json({ success: true, data: me.data });
    }

    return NextResponse.json({ success: false, error: 'Invalid mode. Use: overview | campaigns | ads | ad-groups | report | test' }, { status: 400 });
  } catch (error: any) {
    console.error('Reddit Ads API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
