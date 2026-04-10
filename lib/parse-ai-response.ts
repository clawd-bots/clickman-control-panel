/** Parse "1. foo\n2. bar" style model output into bullet strings. */
export function parseNumberedList(text: string): string[] {
  const raw = text.trim();
  if (!raw) return [];

  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];

  for (const line of lines) {
    const m = line.match(/^\d{1,2}[\.\)]\s*(.+)$/);
    if (m) {
      items.push(m[1].trim());
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      items.push(line.replace(/^[-*]\s+/, '').trim());
    }
  }

  if (items.length > 0) return items;

  return lines.filter((l) => !/^(here|sure|analysis)/i.test(l));
}

export type QuadrantInsights = {
  working: string[];
  notWorking: string[];
  doNext: string[];
  stopDoing: string[];
};

export function parseQuadrantJson(text: string): QuadrantInsights | null {
  const t = text.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(t.slice(start, end + 1)) as Record<string, unknown>;
    const arr = (k: string): string[] => {
      const v = o[k];
      if (!Array.isArray(v)) return [];
      return v.map((x) => String(x).trim()).filter(Boolean);
    };
    return {
      working: arr('working'),
      notWorking: arr('notWorking'),
      doNext: arr('doNext'),
      stopDoing: arr('stopDoing'),
    };
  } catch {
    return null;
  }
}
