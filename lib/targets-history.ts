export const TARGET_HISTORY_STORAGE_KEY = 'clickman-targets-history';

export type TargetHistoryEntry = {
  id: string;
  metric: string;
  monthKey: string;
  monthLabel: string;
  previousValue: string;
  newValue: string;
  changedAt: string;
};

const MAX_ENTRIES = 300;

function mergeHistoryLists(
  a: TargetHistoryEntry[],
  b: TargetHistoryEntry[]
): TargetHistoryEntry[] {
  const byId = new Map<string, TargetHistoryEntry>();
  for (const e of [...b, ...a]) {
    if (e?.id && !byId.has(e.id)) byId.set(e.id, e);
  }
  return Array.from(byId.values())
    .sort(
      (x, y) =>
        new Date(y.changedAt).getTime() - new Date(x.changedAt).getTime()
    )
    .slice(0, MAX_ENTRIES);
}

export function loadTargetHistory(): TargetHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TARGET_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Fetch remote history and merge into localStorage (Supabase when configured). */
export async function hydrateTargetHistoryFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/targets-history', { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as { entries?: TargetHistoryEntry[] };
    if (!Array.isArray(data.entries) || data.entries.length === 0) return;
    const local = loadTargetHistory();
    const merged = mergeHistoryLists(local, data.entries);
    localStorage.setItem(TARGET_HISTORY_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* offline */
  }
}

async function saveFullHistoryToServer(entries: TargetHistoryEntry[]): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/targets-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
  } catch {
    /* fire-and-forget */
  }
}

export function appendTargetHistory(
  entries: Omit<TargetHistoryEntry, 'id' | 'changedAt'>[]
): void {
  if (typeof window === 'undefined' || entries.length === 0) return;
  const changedAt = new Date().toISOString();
  const existing = loadTargetHistory();
  const newOnes: TargetHistoryEntry[] = entries.map((e) => ({
    ...e,
    id: `${changedAt}-${Math.random().toString(36).slice(2, 11)}`,
    changedAt,
  }));
  const merged = [...newOnes, ...existing].slice(0, MAX_ENTRIES);
  localStorage.setItem(TARGET_HISTORY_STORAGE_KEY, JSON.stringify(merged));
  void saveFullHistoryToServer(merged);
}
