import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/** Project URL: prefer Next.js public name, accept common alternates from .env. */
export function getSupabaseUrl(): string | undefined {
  const u =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  return u || undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * Server-only client (service role). Never import in client components.
 */
export function createSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured (set NEXT_PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_URL, plus SUPABASE_SERVICE_ROLE_KEY)'
    );
  }
  if (!cached) {
    cached = createClient(
      getSupabaseUrl()!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return cached;
}
