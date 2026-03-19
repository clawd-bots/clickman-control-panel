import { NextRequest, NextResponse } from 'next/server';

// Sample thumbnail mappings - in real app these would come from ad platforms
const thumbnailMappings: Record<string, string> = {
  'glp-1-testimonial-v3': 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=200&h=200&fit=crop&crop=face',
  'hair-before/after-carousel': 'https://images.unsplash.com/photo-1621784563330-caee0b138a00?w=200&h=200&fit=crop',
  'doc-consultation-ugc': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop&crop=face',
  'weight-loss-journey-tiktok': 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5d?w=200&h=200&fit=crop',
  'brand-search-exact': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop',
  'competitor-keywords': 'https://images.unsplash.com/photo-1560472355-536de3962603?w=200&h=200&fit=crop',
  'hair-regrowth-demo': 'https://images.unsplash.com/photo-1581337204873-ef36aa186caa?w=200&h=200&fit=crop',
  'semaglutide-explainer': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&h=200&fit=crop',
};

export async function GET(request: NextRequest, { params }: { params: { params: string[] } }) {
  const [filename] = params.params;
  const cleanName = filename?.replace(/\.(jpg|png)$/, '');
  
  if (!cleanName) {
    return new NextResponse('Not found', { status: 404 });
  }

  const thumbnailUrl = thumbnailMappings[cleanName];
  
  if (thumbnailUrl) {
    // Redirect to actual image
    return NextResponse.redirect(thumbnailUrl);
  }

  // Fallback to a generic ad placeholder
  const fallbackSvg = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" fill="#4A6BD6" rx="4"/>
    <rect x="8" y="16" width="32" height="16" rx="2" fill="white"/>
    <path d="M12 20h24v8H12v-8z" fill="#4A6BD6"/>
    <circle cx="16" cy="22" r="1.5" fill="white"/>
    <path d="M14 26l4-3 3 2 7-4v3H14v2z" fill="white"/>
  </svg>`;
  
  return new NextResponse(fallbackSvg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}