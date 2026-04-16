/**
 * Derives the calendar comparison window for TopBar "vs" modes from the active date range.
 * All math uses local calendar days (no UTC midnight bugs for range length).
 */

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Inclusive count of calendar days from a through b (same local date line). */
export function calendarDaysInclusive(a: Date, b: Date): number {
  const t0 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const t1 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((t1 - t0) / 86400000) + 1;
}

/**
 * Same-length window immediately before the primary range (ends the day before primary starts).
 * Example: Apr 10–Apr 16 (7 days) → Apr 3–Apr 9 (7 days).
 */
export function getPreviousPeriodRange(startDate: Date, endDate: Date): { start: Date; end: Date } {
  const start = startOfDay(startDate);
  const end = endOfDay(endDate);
  const n = calendarDaysInclusive(start, end);
  const prevEndCal = new Date(start);
  prevEndCal.setDate(prevEndCal.getDate() - 1);
  const prevEnd = endOfDay(prevEndCal);
  const prevStartCal = new Date(prevEndCal);
  prevStartCal.setDate(prevStartCal.getDate() - (n - 1));
  return { start: startOfDay(prevStartCal), end: prevEnd };
}

export type ComparisonMode = 'none' | 'prev-period' | 'prev-year' | 'custom';

export function getComparisonDateRange(params: {
  startDate: Date;
  endDate: Date;
  comparison: string;
  comparisonEnabled: boolean;
  comparisonCustomStart: Date | null;
  comparisonCustomEnd: Date | null;
}): { start: Date; end: Date } | null {
  if (!params.comparisonEnabled || params.comparison === 'none') {
    return null;
  }

  const { startDate, endDate, comparison } = params;

  if (comparison === 'custom') {
    if (!params.comparisonCustomStart || !params.comparisonCustomEnd) return null;
    return {
      start: startOfDay(params.comparisonCustomStart),
      end: endOfDay(params.comparisonCustomEnd),
    };
  }

  if (comparison === 'prev-year') {
    const s = new Date(startDate);
    s.setFullYear(s.getFullYear() - 1);
    const e = new Date(endDate);
    e.setFullYear(e.getFullYear() - 1);
    return { start: startOfDay(s), end: endOfDay(e) };
  }

  if (comparison === 'prev-period') {
    return getPreviousPeriodRange(startDate, endDate);
  }

  return null;
}
