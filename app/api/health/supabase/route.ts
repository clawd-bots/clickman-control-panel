import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';

/**
 * GET /api/health/supabase — verify env + DB reachability (service role).
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    });
  }
  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from('clickman_kv').select('key').limit(1);
    if (error) {
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          message: error.message,
          hint: 'Run supabase/migrations/001_clickman_kv.sql in the Supabase SQL Editor',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, configured: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, configured: true, message: msg }, { status: 503 });
  }
}
