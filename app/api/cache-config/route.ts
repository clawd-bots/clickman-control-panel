import { NextRequest, NextResponse } from 'next/server';
import { clearAllApiCacheRows, getCacheConfig, saveCacheConfig } from '@/lib/api-cache';

export async function GET() {
  const config = await getCacheConfig();
  return NextResponse.json({ success: true, config });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'clear') {
      const ok = await clearAllApiCacheRows();
      if (!ok) {
        return NextResponse.json(
          { success: false, error: 'Could not clear cache (is Supabase configured?)' },
          { status: 500 }
        );
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
