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
}
