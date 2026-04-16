import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';
import { isSupabaseConfigured } from '@/lib/supabase/admin';
import { kvGet, kvUpsert } from '@/lib/supabase/kv';
import { KV_KEYS } from '@/lib/supabase/kv-keys';

const BLOB_PATH = 'targets/monthly-targets.json';

async function readTargetsFromBlob(): Promise<Record<string, unknown> | null> {
  try {
    const blob = await head(BLOB_PATH);
    if (!blob) return null;
    const res = await fetch(blob.url, { cache: 'no-store' });
    const data = await res.json();
    return typeof data === 'object' && data !== null ? data : null;
  } catch (error: unknown) {
    const err = error as { code?: string; name?: string };
    if (err?.code === 'blob_not_found' || err?.name === 'BlobNotFoundError') {
      return null;
    }
    console.error('Error reading targets blob:', error);
    return null;
  }
}

/**
 * GET /api/targets — Read saved targets (Supabase primary, Vercel Blob fallback).
 */
export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const fromDb = await kvGet<Record<string, unknown>>(KV_KEYS.MONTHLY_TARGETS);
      if (fromDb && typeof fromDb === 'object' && Object.keys(fromDb).length > 0) {
        return NextResponse.json({ targets: fromDb, source: 'supabase' });
      }
    }

    const fromBlob = await readTargetsFromBlob();
    if (fromBlob && Object.keys(fromBlob).length > 0) {
      return NextResponse.json({ targets: fromBlob, source: 'blob' });
    }

    return NextResponse.json({ targets: {}, source: 'empty' });
  } catch (error: unknown) {
    console.error('Error reading targets:', error);
    return NextResponse.json({ targets: {} });
  }
}

/**
 * POST /api/targets — Save targets (Supabase + optional Blob backup).
 * Body: { targets: { [metric]: { [monthKey]: number } } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targets } = body;

    if (!targets || typeof targets !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid targets data' },
        { status: 400 }
      );
    }

    let supabaseOk = false;
    if (isSupabaseConfigured()) {
      supabaseOk = await kvUpsert(KV_KEYS.MONTHLY_TARGETS, targets);
    }

    let blobOk = false;
    try {
      await put(BLOB_PATH, JSON.stringify(targets, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
      blobOk = true;
    } catch (blobErr: unknown) {
      const msg = blobErr instanceof Error ? blobErr.message : String(blobErr);
      if (!msg.includes('BLOB_READ_WRITE_TOKEN') && !msg.includes('token')) {
        console.warn('Blob backup for targets failed:', msg);
      }
    }

    if (!supabaseOk && !blobOk) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Failed to save targets. Configure Supabase (see /api/health/supabase) or Vercel Blob token.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, supabase: supabaseOk, blob: blobOk });
  } catch (error: unknown) {
    console.error('Error saving targets:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to save targets',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
