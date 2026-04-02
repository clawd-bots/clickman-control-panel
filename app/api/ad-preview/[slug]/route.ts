import { NextRequest } from 'next/server';

const zoneInfo: Record<string, { label: string; color: string; bg: string }> = {
  scaling: { label: 'Scaling (Winner)', color: '#10B981', bg: '#D1FAE5' },
  zombie: { label: 'Zombie (Kill)', color: '#EF4444', bg: '#FEE2E2' },
  testing: { label: 'Testing', color: '#3B82F6', bg: '#DBEAFE' },
  untapped: { label: 'Untapped / Learning', color: '#D97706', bg: '#FEF3C7' },
};

const platformInfo: Record<string, { color: string; icon: string; managerUrl: string }> = {
  Meta: { color: '#0668E1', icon: '📘', managerUrl: 'https://adsmanager.facebook.com' },
  Google: { color: '#4285F4', icon: '📢', managerUrl: 'https://ads.google.com' },
  TikTok: { color: '#000000', icon: '🎵', managerUrl: 'https://ads.tiktok.com' },
  Reddit: { color: '#FF4500', icon: '🔴', managerUrl: 'https://ads.reddit.com' },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = await params;
  const { searchParams } = new URL(request.url);

  const name = searchParams.get('name') || resolvedParams.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const platformKey = searchParams.get('platform') || 'Meta';
  const spend = parseFloat(searchParams.get('spend') || '0');
  const cpa = parseFloat(searchParams.get('cpa') || '0');
  const zone = searchParams.get('zone') || 'testing';
  const roas = parseFloat(searchParams.get('roas') || '0');
  const nccpa = parseFloat(searchParams.get('nccpa') || '0');
  const ncroas = parseFloat(searchParams.get('ncroas') || '0');
  const previewUrl = searchParams.get('previewUrl') || '';

  const plat = platformInfo[platformKey] || platformInfo.Meta;
  const zInfo = zoneInfo[zone] || zoneInfo.testing;

  const estImpressions = Math.round(spend * 18);
  const estClicks = Math.round(spend * 0.28);
  const ctr = estClicks > 0 && estImpressions > 0 ? ((estClicks / estImpressions) * 100).toFixed(2) : '0';
  const conversions = cpa > 0 ? Math.round(spend / cpa) : 0;

  const formatCurrency = (v: number) => v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : `₱${v.toLocaleString()}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${name} — Ad Preview</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: #0F172A; color: #E2E8F0; padding: 24px; min-height: 100vh; }
            .container { max-width: 640px; margin: 0 auto; }
            .card { background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
            .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
            .ad-name { font-size: 20px; font-weight: 700; color: #F8FAFC; line-height: 1.3; }
            .badges { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
            .badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .platform-badge { background: ${plat.color}22; color: ${plat.color}; border: 1px solid ${plat.color}44; }
            .zone-badge { background: ${zInfo.bg}; color: ${zInfo.color}; border: 1px solid ${zInfo.color}44; }
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
            .metric { background: #0F172A; border: 1px solid #334155; border-radius: 8px; padding: 14px; text-align: center; }
            .metric-value { font-size: 20px; font-weight: 700; color: #F8FAFC; }
            .metric-label { font-size: 11px; color: #94A3B8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
            .metric-good { color: #34D399; }
            .metric-warn { color: #FBBF24; }
            .metric-bad { color: #F87171; }
            .section-title { font-size: 13px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
            .link-row { display: flex; align-items: center; gap: 8px; padding: 12px; background: #0F172A; border: 1px solid #334155; border-radius: 8px; font-size: 13px; color: #94A3B8; }
            .link-row a { color: #60A5FA; text-decoration: none; }
            .link-row a:hover { text-decoration: underline; }
            .close-btn { position: fixed; top: 16px; right: 16px; background: #334155; color: #E2E8F0; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; }
            .close-btn:hover { background: #475569; }
            .note { margin-top: 16px; padding: 12px; background: #1E293B; border: 1px dashed #475569; border-radius: 8px; font-size: 12px; color: #64748B; line-height: 1.5; }
        </style>
    </head>
    <body>
        <button class="close-btn" onclick="window.close()">✕ Close</button>
        <div class="container">
            <div class="card">
                <div class="header">
                    <div>
                        <div class="ad-name">${name}</div>
                        <div class="badges">
                            <span class="badge platform-badge">${plat.icon} ${platformKey}</span>
                            <span class="badge zone-badge">${zInfo.label}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="section-title">Performance Metrics</div>
                <div class="metrics-grid">
                    <div class="metric">
                        <div class="metric-value">${formatCurrency(spend)}</div>
                        <div class="metric-label">Spend</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value ${cpa <= 700 ? 'metric-good' : cpa <= 850 ? 'metric-warn' : 'metric-bad'}">${formatCurrency(cpa)}</div>
                        <div class="metric-label">CPA</div>
                    </div>
                    ${nccpa > 0 ? `<div class="metric">
                        <div class="metric-value ${nccpa <= 525 ? 'metric-good' : nccpa <= 638 ? 'metric-warn' : 'metric-bad'}">${formatCurrency(nccpa)}</div>
                        <div class="metric-label">NC CPA</div>
                    </div>` : ''}
                    <div class="metric">
                        <div class="metric-value ${roas >= 3.0 ? 'metric-good' : roas >= 2.5 ? 'metric-warn' : 'metric-bad'}">${roas > 0 ? roas.toFixed(2) + 'x' : '—'}</div>
                        <div class="metric-label">ROAS</div>
                    </div>
                    ${ncroas > 0 ? `<div class="metric">
                        <div class="metric-value ${ncroas >= 2.4 ? 'metric-good' : ncroas >= 2.0 ? 'metric-warn' : 'metric-bad'}">${ncroas.toFixed(2)}x</div>
                        <div class="metric-label">NC ROAS</div>
                    </div>` : ''}
                    <div class="metric">
                        <div class="metric-value">${conversions.toLocaleString()}</div>
                        <div class="metric-label">Conversions</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${estImpressions.toLocaleString()}</div>
                        <div class="metric-label">Est. Impressions</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${estClicks.toLocaleString()}</div>
                        <div class="metric-label">Est. Clicks</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${ctr}%</div>
                        <div class="metric-label">Est. CTR</div>
                    </div>
                </div>
            </div>

            ${previewUrl ? `
            <div class="card">
                <div class="section-title">Ad Manager</div>
                <div class="link-row">
                    ${plat.icon} <a href="${previewUrl}" target="_blank" rel="noopener noreferrer">Open in ${platformKey} Ads Manager →</a>
                </div>
            </div>
            ` : ''}

            <div class="note">
                <strong>Note:</strong> Creative preview images require ${platformKey} Ads API integration (ad creative endpoint). 
                Impressions, clicks, and CTR are estimated from spend. 
                CPA, ROAS, and spend are actual values from the dashboard.
            </div>
        </div>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
