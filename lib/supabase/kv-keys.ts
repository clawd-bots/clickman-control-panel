/** Row keys in `clickman_kv` (see supabase/migrations). */
export const KV_KEYS = {
  MONTHLY_TARGETS: 'monthly_targets',
  PROMPT_STORE: 'prompt_store',
  TARGETS_HISTORY: 'targets_history',
  /** Map of `insightsStorageKey(...)` → StoredAiInsights JSON */
  AI_INSIGHTS: 'ai_insights',
} as const;
