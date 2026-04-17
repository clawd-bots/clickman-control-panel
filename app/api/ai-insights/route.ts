import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/admin';
import { kvGet, kvUpsert } from '@/lib/supabase/kv';
import { KV_KEYS } from '@/lib/supabase/kv-keys';

type StoredAiInsights = {
  items: string[];
  savedAt: number;
  refreshCurrency: 'php' | 'usd';
  analysisRangeStartIso?: string;
  analysisRangeEndIso?: string;
};

const V2_KEY_RE = /^clickman-ai-insights:v2:([^:]+):(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/;

function parseV2InsightsKey(key: string): { promptId: string; startIso: string; endIso: string } | null {
  const m = key.match(V2_KEY_RE);
  if (!m) return null;
  return { promptId: m[1], startIso: m[2], endIso: m[3] };
}

/**
 * GET /api/ai-insights — full map of storage keys → cached insight payloads,
 * plus latest analysis per promptId (any date range).
 */
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ entries: {}, latestByPromptId: {} });
    }
    const entries = await kvGet<Record<string, StoredAiInsights>>(KV_KEYS.AI_INSIGHTS);
    const latestByPromptId =
      (await kvGet<Record<string, StoredAiInsights>>(KV_KEYS.AI_INSIGHTS_LATEST)) ?? {};
    return NextResponse.json({
      entries: entries && typeof entries === 'object' ? entries : {},
      latestByPromptId: latestByPromptId && typeof latestByPromptId === 'object' ? latestByPromptId : {},
    });
  } catch (e) {
    console.error('ai-insights GET', e);
    return NextResponse.json({ entries: {}, latestByPromptId: {} });
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

    const normalized: StoredAiInsights = {
      items: payload.items,
      savedAt: typeof payload.savedAt === 'number' ? payload.savedAt : Date.now(),
      refreshCurrency:
        payload.refreshCurrency === 'usd' || payload.refreshCurrency === 'php'
          ? payload.refreshCurrency
          : 'php',
      analysisRangeStartIso:
        typeof payload.analysisRangeStartIso === 'string' ? payload.analysisRangeStartIso : undefined,
      analysisRangeEndIso:
        typeof payload.analysisRangeEndIso === 'string' ? payload.analysisRangeEndIso : undefined,
    };

    const existing =
      (await kvGet<Record<string, StoredAiInsights>>(KV_KEYS.AI_INSIGHTS)) ?? {};
    existing[key] = normalized;

    const okMain = await kvUpsert(KV_KEYS.AI_INSIGHTS, existing);
    if (!okMain) {
      return NextResponse.json({ success: false, message: 'Failed to save' }, { status: 500 });
    }

    const parsed = parseV2InsightsKey(key);
    if (parsed && normalized.items.length > 0) {
      const latest =
        (await kvGet<Record<string, StoredAiInsights>>(KV_KEYS.AI_INSIGHTS_LATEST)) ?? {};
      const prev = latest[parsed.promptId];
      if (!prev || !prev.savedAt || normalized.savedAt >= prev.savedAt) {
        latest[parsed.promptId] = {
          ...normalized,
          analysisRangeStartIso: parsed.startIso,
          analysisRangeEndIso: parsed.endIso,
        };
        const okLatest = await kvUpsert(KV_KEYS.AI_INSIGHTS_LATEST, latest);
        if (!okLatest) {
          return NextResponse.json({ success: false, message: 'Failed to save latest' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('ai-insights POST', e);
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }
}
