import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = await params;
  const adSlug = resolvedParams.slug;
  
  // Placeholder ad preview data - would come from Meta API in production
  const adPreviewData = {
    name: adSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    headline: "Transform Your Health with GLP-1 Weight Loss",
    description: "Join thousands who've lost weight naturally. Doctor-prescribed GLP-1 treatment. Free consultation.",
    imageUrl: "https://via.placeholder.com/400x300/3B82F6/FFFFFF?text=Ad+Preview",
    videoThumbnail: "https://via.placeholder.com/400x300/10B981/FFFFFF?text=Video+Thumbnail",
    platform: "Meta",
    status: "Active",
    metrics: {
      impressions: "892,000",
      clicks: "12,488", 
      ctr: "1.40%",
      spend: "₱45,200",
      conversions: 69,
      cpa: "₱655",
      roas: "3.05x"
    }
  };

  // Generate a simple HTML preview page
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${adPreviewData.name} - Ad Preview</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
            .platform-badge { display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; }
            .status-badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; margin-left: 8px; }
            .ad-content { margin: 20px 0; }
            .ad-image { width: 100%; max-width: 400px; height: 250px; border-radius: 8px; object-fit: cover; background: #e2e8f0; display: flex; align-items: center; justify-content: center; margin: 16px 0; }
            .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-top: 20px; }
            .metric { background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center; }
            .metric-value { font-size: 18px; font-weight: 600; color: #1e293b; }
            .metric-label { font-size: 12px; color: #64748b; margin-top: 4px; }
            .close-btn { position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0 0 8px 0; color: #1e293b;">${adPreviewData.name}</h1>
                <div>
                    <span class="platform-badge">${adPreviewData.platform}</span>
                    <span class="status-badge">${adPreviewData.status}</span>
                </div>
            </div>
            
            <div class="ad-content">
                <h3 style="color: #374151; margin: 0 0 8px 0;">Headline</h3>
                <p style="font-size: 16px; font-weight: 500; color: #1f2937; margin: 0 0 16px 0;">${adPreviewData.headline}</p>
                
                <h3 style="color: #374151; margin: 0 0 8px 0;">Description</h3>
                <p style="color: #4b5563; margin: 0 0 16px 0;">${adPreviewData.description}</p>
                
                <h3 style="color: #374151; margin: 0 0 8px 0;">Creative Preview</h3>
                <div class="ad-image">
                    <img src="${adPreviewData.imageUrl}" alt="Ad Creative" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" />
                </div>
            </div>
            
            <h3 style="color: #374151; margin: 20px 0 12px 0;">Performance Metrics</h3>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">${adPreviewData.metrics.impressions}</div>
                    <div class="metric-label">Impressions</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${adPreviewData.metrics.clicks}</div>
                    <div class="metric-label">Clicks</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${adPreviewData.metrics.ctr}</div>
                    <div class="metric-label">CTR</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${adPreviewData.metrics.spend}</div>
                    <div class="metric-label">Spend</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${adPreviewData.metrics.conversions}</div>
                    <div class="metric-label">Conversions</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${adPreviewData.metrics.cpa}</div>
                    <div class="metric-label">CPA</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${adPreviewData.metrics.roas}</div>
                    <div class="metric-label">ROAS</div>
                </div>
            </div>
            
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">
                <strong>Note:</strong> This is a placeholder preview. In production, this would show real ad creative from Meta API including actual images, videos, and live performance data.
            </div>
        </div>
        
        <button class="close-btn" onclick="window.close()">Close</button>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}