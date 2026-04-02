import { NextRequest, NextResponse } from 'next/server';
import { getCacheConfig, saveCacheConfig } from '@/lib/api-cache';
import { list, del } from '@vercel/blob';

export async function GET() {
  const config = await getCacheConfig();
  return NextResponse.json({ success: true, config });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'clear') {
      // Clear all cached data
      try {
        const blobs = await list({ prefix: 'cache/', limit: 100 });
        for (const blob of blobs.blobs) {
          if (!blob.pathname.endsWith('config.json')) {
            await del(blob.url);
          }
        }
      } catch (e) {
        console.error('Cache clear error:', e);
      }
      
      const config = await getCacheConfig();
      config.lastCleared = Date.now();
      await saveCacheConfig(config);
      
      return NextResponse.json({ success: true, message: 'Cache cleared' });
    }
    
    if (body.ttls) {
      const config = await getCacheConfig();
      config.ttls = { ...config.ttls, ...body.ttls };
      await saveCacheConfig(config);
      return NextResponse.json({ success: true, config });
    }
    
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
