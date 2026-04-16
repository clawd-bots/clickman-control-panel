import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/admin';
import { kvGet, kvUpsert } from '@/lib/supabase/kv';
import { KV_KEYS } from '@/lib/supabase/kv-keys';

type StoredAiInsights = {
  items: string[];
  savedAt: number;
  refreshCurrency: 'php' | 'usd';
};

/**
 * GET /api/ai-insights — full map of storage keys → cached insight payloads.
 */
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ entries: {} });
    }
    const entries = await kvGet<Record<string, StoredAiInsights>>(KV_KEYS.AI_INSIGHTS);
    return NextResponse.json({
      entries: entries && typeof entries === 'object' ? entries : {},
    });
  } catch (e) {
    console.error('ai-insights GET', e);
    return NextResponse.json({ entries: {} });
  }
}

/**
 * POST /api/ai-insights — merge one key into the map (upsert entire document).
 * Body: { key: string, payload: StoredAiInsights } where key is insightsStorageKey(...)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, payload } = body as { key?: string; payload?: StoredAiInsights };

    if (
      !key ||
      typeof key !== 'string' ||
      !payload ||
      typeof payload !== 'object' ||
      !Array.isArray(payload.items)
    ) {
      return NextResponse.json(
        { success: false, message: 'key and payload with items[] required' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const existing =
      (await kvGet<Record<string, StoredAiInsights>>(KV_KEYS.AI_INSIGHTS)) ?? {};
    existing[key] = {
      items: payload.items,
      savedAt: typeof payload.savedAt === 'number' ? payload.savedAt : Date.now(),
      refreshCurrency:
        payload.refreshCurrency === 'usd' || payload.refreshCurrency === 'php'
          ? payload.refreshCurrency
          : 'php',
    };

    const ok = await kvUpsert(KV_KEYS.AI_INSIGHTS, existing);
    if (!ok) {
      return NextResponse.json({ success: false, message: 'Failed to save' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('ai-insights POST', e);
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }
}
