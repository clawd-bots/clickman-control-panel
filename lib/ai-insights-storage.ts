/**
 * Persisted AI numbered-list insights: currency-agnostic cache key + refresh source currency for display rewriting.
 * Local cache + Supabase (`ai_insights` in clickman_kv) when configured.
 */

export type InsightMoneyCurrency = 'php' | 'usd';

export interface StoredAiInsights {
  items: string[];
  savedAt: number;
  /** Display currency when the user clicked Refresh (drives rewrite on toggle). */
  refreshCurrency: InsightMoneyCurrency;
  /** Date range the analysis was generated for (for “last run” display). */
  analysisRangeStartIso?: string;
  analysisRangeEndIso?: string;
}

const LEGACY_PREFIX = 'clickman-ai-insights:';
const V2_PREFIX = 'clickman-ai-insights:v2:';

function safeParseV2(raw: string | null): StoredAiInsights | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as {
      items?: unknown;
      savedAt?: unknown;
      refreshCurrency?: unknown;
      analysisRangeStartIso?: unknown;
      analysisRangeEndIso?: unknown;
    };
    if (!Array.isArray(p.items) || !p.items.every((x) => typeof x === 'string') || p.items.length === 0) {
      return null;
    }
    const savedAt = typeof p.savedAt === 'number' ? p.savedAt : 0;
    const rc =
      p.refreshCurrency === 'usd' || p.refreshCurrency === 'php' ? p.refreshCurrency : 'php';
    const start =
      typeof p.analysisRangeStartIso === 'string' ? p.analysisRangeStartIso : undefined;
    const end = typeof p.analysisRangeEndIso === 'string' ? p.analysisRangeEndIso : undefined;
    return {
      items: p.items as string[],
      savedAt,
      refreshCurrency: rc,
      ...(start ? { analysisRangeStartIso: start } : {}),
      ...(end ? { analysisRangeEndIso: end } : {}),
    };
  } catch {
    return null;
  }
}

/** Legacy `clickman-ai-insights:…:php|usd` stored { items, savedAt } only. */
function safeParseLegacyInsight(raw: string | null): { items: string[]; savedAt: number } | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { items?: unknown; savedAt?: unknown };
    if (!Array.isArray(p.items) || !p.items.every((x) => typeof x === 'string') || p.items.length === 0) {
      return null;
    }
    const savedAt = typeof p.savedAt === 'number' ? p.savedAt : 0;
    return { items: p.items as string[], savedAt };
  } catch {
    return null;
  }
}

function legacyKey(promptId: string, startIso: string, endIso: string, cur: 'php' | 'usd') {
  return `${LEGACY_PREFIX}${promptId}:${startIso}:${endIso}:${cur}`;
}

export function insightsStorageKey(promptId: string, startIso: string, endIso: string) {
  return `${V2_PREFIX}${promptId}:${startIso}:${endIso}`;
}

/** Local + server KV key for the most recent analysis for a prompt (any date range). */
export function insightsLatestLocalKey(promptId: string) {
  return `clickman-ai-insights:latest:${promptId}`;
}

/** One fetch per page load; merges server entries into localStorage (newer savedAt wins per key). */
let hydratePromise: Promise<void> | null = null;

export function hydrateAiInsightsFromServer(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const res = await fetch('/api/ai-insights', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as {
          entries?: Record<string, StoredAiInsights>;
          latestByPromptId?: Record<string, StoredAiInsights>;
        };
        const entries =
          data.entries && typeof data.entries === 'object' ? data.entries : {};

        for (const [k, v] of Object.entries(entries)) {
          if (!v || typeof v !== 'object' || !Array.isArray(v.items) || v.items.length === 0) {
            continue;
          }
          const remote: StoredAiInsights = {
            items: v.items,
            savedAt: typeof v.savedAt === 'number' ? v.savedAt : 0,
            refreshCurrency:
              v.refreshCurrency === 'usd' || v.refreshCurrency === 'php' ? v.refreshCurrency : 'php',
          };
          const local = safeParseV2(localStorage.getItem(k));
          if (!local || remote.savedAt >= local.savedAt) {
            try {
              localStorage.setItem(k, JSON.stringify(remote));
            } catch {
              /* quota */
            }
          }
        }

        const latestMap = data.latestByPromptId;
        if (latestMap && typeof latestMap === 'object') {
          for (const [promptId, v] of Object.entries(latestMap)) {
            if (!v || typeof v !== 'object' || !Array.isArray(v.items) || v.items.length === 0) {
              continue;
            }
            const remote: StoredAiInsights = {
              items: v.items,
              savedAt: typeof v.savedAt === 'number' ? v.savedAt : 0,
              refreshCurrency:
                v.refreshCurrency === 'usd' || v.refreshCurrency === 'php' ? v.refreshCurrency : 'php',
              analysisRangeStartIso:
                typeof v.analysisRangeStartIso === 'string' ? v.analysisRangeStartIso : undefined,
              analysisRangeEndIso:
                typeof v.analysisRangeEndIso === 'string' ? v.analysisRangeEndIso : undefined,
            };
            const lk = insightsLatestLocalKey(promptId);
            const local = safeParseV2(localStorage.getItem(lk));
            if (!local || remote.savedAt >= local.savedAt) {
              try {
                localStorage.setItem(lk, JSON.stringify(remote));
              } catch {
                /* quota */
              }
            }
          }
        }
      } catch {
        /* offline */
      }
    })();
  }
  return hydratePromise;
}

async function syncInsightToServer(key: string, payload: StoredAiInsights): Promise<void> {
  try {
    await fetch('/api/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, payload }),
    });
  } catch {
    /* fire-and-forget */
  }
}

/** Load v2 payload, or migrate from legacy php/usd keys (pick newest savedAt). */
export function loadStoredAiInsights(
  promptId: string,
  startIso: string,
  endIso: string,
): StoredAiInsights | null {
  if (typeof window === 'undefined') return null;

  const v2k = insightsStorageKey(promptId, startIso, endIso);
  const direct = safeParseV2(localStorage.getItem(v2k));
  if (direct) return direct;

  const php = safeParseLegacyInsight(localStorage.getItem(legacyKey(promptId, startIso, endIso, 'php')));
  const usd = safeParseLegacyInsight(localStorage.getItem(legacyKey(promptId, startIso, endIso, 'usd')));

  const candidates: { data: StoredAiInsights; inferredSource: InsightMoneyCurrency }[] = [];
  if (php) {
    candidates.push({
      data: { items: php.items, savedAt: php.savedAt, refreshCurrency: 'php' },
      inferredSource: 'php',
    });
  }
  if (usd) {
    candidates.push({
      data: { items: usd.items, savedAt: usd.savedAt, refreshCurrency: 'usd' },
      inferredSource: 'usd',
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.data.savedAt - a.data.savedAt);
  const best = candidates[0];
  const merged: StoredAiInsights = {
    items: best.data.items,
    savedAt: best.data.savedAt,
    refreshCurrency: best.inferredSource,
  };

  try {
    localStorage.setItem(v2k, JSON.stringify(merged));
    localStorage.removeItem(legacyKey(promptId, startIso, endIso, 'php'));
    localStorage.removeItem(legacyKey(promptId, startIso, endIso, 'usd'));
  } catch {
    /* quota */
  }

  return merged;
}

/** Most recent saved analysis for this prompt (any date window), or null. */
export function loadLatestStoredAiInsights(promptId: string): StoredAiInsights | null {
  if (typeof window === 'undefined') return null;
  return safeParseV2(localStorage.getItem(insightsLatestLocalKey(promptId)));
}

export function saveStoredAiInsights(
  promptId: string,
  startIso: string,
  endIso: string,
  payload: StoredAiInsights,
): void {
  try {
    const v2k = insightsStorageKey(promptId, startIso, endIso);
    const payloadWithRange: StoredAiInsights = {
      ...payload,
      analysisRangeStartIso: startIso,
      analysisRangeEndIso: endIso,
    };
    localStorage.setItem(v2k, JSON.stringify(payloadWithRange));
    const lk = insightsLatestLocalKey(promptId);
    localStorage.setItem(lk, JSON.stringify(payloadWithRange));
    localStorage.removeItem(legacyKey(promptId, startIso, endIso, 'php'));
    localStorage.removeItem(legacyKey(promptId, startIso, endIso, 'usd'));
    void syncInsightToServer(v2k, payloadWithRange);
  } catch {
    /* quota */
  }
}
