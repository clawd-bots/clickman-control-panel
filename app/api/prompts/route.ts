import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';
import { isSupabaseConfigured } from '@/lib/supabase/admin';
import { kvGet, kvUpsert } from '@/lib/supabase/kv';
import { KV_KEYS } from '@/lib/supabase/kv-keys';

const BLOB_PATH = 'prompts/prompt-templates.json';

type PromptStore = {
  prompts: Record<string, unknown>;
  history: Record<string, unknown>;
};

async function readPromptsFromBlob(): Promise<PromptStore | null> {
  try {
    const blob = await head(BLOB_PATH);
    if (!blob) return null;
    const res = await fetch(blob.url, { cache: 'no-store' });
    const data = await res.json();
    if (!data || typeof data !== 'object') return null;
    return data as PromptStore;
  } catch (error: unknown) {
    const err = error as { code?: string; name?: string };
    if (err?.code === 'blob_not_found' || err?.name === 'BlobNotFoundError') {
      return null;
    }
    console.error('Error reading prompts blob:', error);
    return null;
  }
}

/**
 * GET /api/prompts — Read all prompts + history (Supabase primary, Blob fallback).
 */
export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const fromDb = await kvGet<PromptStore>(KV_KEYS.PROMPT_STORE);
      if (
        fromDb &&
        typeof fromDb === 'object' &&
        fromDb.prompts &&
        typeof fromDb.prompts === 'object' &&
        Object.keys(fromDb.prompts).length > 0
      ) {
        return NextResponse.json({
          ...fromDb,
          history: fromDb.history ?? {},
          source: 'supabase',
        });
      }
    }

    const fromBlob = await readPromptsFromBlob();
    if (fromBlob && fromBlob.prompts && Object.keys(fromBlob.prompts).length > 0) {
      return NextResponse.json({
        prompts: fromBlob.prompts,
        history: fromBlob.history ?? {},
        source: 'blob',
      });
    }

    return NextResponse.json({ prompts: {}, history: {}, source: 'empty' });
  } catch (error) {
    console.error('Error reading prompts:', error);
    return NextResponse.json({ prompts: {}, history: {} });
  }
}

/**
 * POST /api/prompts — Save all prompts + history (Supabase + optional Blob backup).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let supabaseOk = false;
    if (isSupabaseConfigured()) {
      supabaseOk = await kvUpsert(KV_KEYS.PROMPT_STORE, body);
    }

    let blobOk = false;
    try {
      await put(BLOB_PATH, JSON.stringify(body, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
      blobOk = true;
    } catch (blobErr: unknown) {
      const msg = blobErr instanceof Error ? blobErr.message : String(blobErr);
      if (!msg.includes('BLOB_READ_WRITE_TOKEN') && !msg.includes('token')) {
        console.warn('Blob backup for prompts failed:', msg);
      }
    }

    if (!supabaseOk && !blobOk) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Failed to save prompts. Configure Supabase or Vercel Blob token.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, supabase: supabaseOk, blob: blobOk });
  } catch (error) {
    console.error('Error saving prompts:', error);
    return NextResponse.json({ success: false, message: 'Failed to save prompts' }, { status: 500 });
  }
}
