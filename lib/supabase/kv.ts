import { createSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';

export async function kvGet<T>(key: string): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('clickman_kv')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      console.error('[clickman_kv] get', key, error.message);
      return null;
    }
    if (!data || data.value === null || data.value === undefined) return null;
    return data.value as T;
  } catch (e) {
    console.error('[clickman_kv] get', key, e);
    return null;
  }
}

export async function kvUpsert(key: string, value: unknown): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from('clickman_kv').upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    if (error) {
      console.error('[clickman_kv] upsert', key, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[clickman_kv] upsert', key, e);
    return false;
  }
}
