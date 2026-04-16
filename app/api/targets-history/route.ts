import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/admin';
import { kvGet, kvUpsert } from '@/lib/supabase/kv';
import { KV_KEYS } from '@/lib/supabase/kv-keys';

type TargetHistoryEntry = {
  id: string;
  metric: string;
  monthKey: string;
  monthLabel: string;
  previousValue: string;
  newValue: string;
  changedAt: string;
};

/**
 * GET /api/targets-history — list of target edit log entries (from Supabase when configured).
 */
export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const rows = await kvGet<TargetHistoryEntry[]>(KV_KEYS.TARGETS_HISTORY);
      if (Array.isArray(rows) && rows.length > 0) {
        return NextResponse.json({ entries: rows });
      }
    }
    return NextResponse.json({ entries: [] });
  } catch (e: unknown) {
    console.error('targets-history GET', e);
    return NextResponse.json({ entries: [] });
  }
}

/**
 * POST /api/targets-history — replace full history list (client merges locally first).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entries } = body as { entries?: TargetHistoryEntry[] };
    if (!Array.isArray(entries)) {
      return NextResponse.json({ success: false, message: 'entries array required' }, { status: 400 });
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, skipped: true });
    }
    const ok = await kvUpsert(KV_KEYS.TARGETS_HISTORY, entries);
    if (!ok) {
      return NextResponse.json({ success: false, message: 'Failed to save' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('targets-history POST', e);
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }
}
