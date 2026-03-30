/**
 * Date utilities for consistent date handling across the Clickman dashboard.
 * All chart data should use ISO YYYY-MM-DD format internally,
 * with formatDateLabel() for display on chart axes.
 */

/**
 * Converts any date format to ISO YYYY-MM-DD string.
 */
export function normalizeDate(input: string | Date | number): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input; // Already ISO format
  }
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    // Try parsing short month formats like 'Mar 1'
    const parsed = new Date(`${input}, 2026`);
    if (!isNaN(parsed.getTime())) {
      return toISODateString(parsed);
    }
    return String(input);
  }
  return toISODateString(date);
}

/**
 * Formats an ISO date string for chart display based on granularity.
 * - day: 'Mar 1'
 * - week: 'Mar 1-7'
 * - month: 'Mar'
 */
export function formatDateLabel(isoDate: string, granularity: 'day' | 'week' | 'month'): string {
  const date = new Date(isoDate + 'T00:00:00');
  if (isNaN(date.getTime())) return isoDate;

  switch (granularity) {
    case 'day':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'week': {
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 6);
      const startStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endDay = endDate.getDate();
      return `${startStr}-${endDay}`;
    }
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short' });
    default:
      return isoDate;
  }
}

/**
 * Filters any dataset by date range.
 * Items where the date field value falls within [startDate, endDate] are included.
 */
export function filterByDateRange<T>(
  data: T[],
  dateField: keyof T,
  startDate: Date,
  endDate: Date
): T[] {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return data.filter(item => {
    const dateStr = String(item[dateField]);
    const itemDate = new Date(dateStr + 'T00:00:00');
    if (isNaN(itemDate.getTime())) return false;
    return itemDate >= start && itemDate <= end;
  });
}

/**
 * Checks if an ISO date string falls within a date range (inclusive).
 */
export function isWithinRange(isoDate: string, startDate: Date, endDate: Date): boolean {
  const date = new Date(isoDate + 'T00:00:00');
  if (isNaN(date.getTime())) return false;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

/** Helper to get YYYY-MM-DD from a Date without timezone issues */
function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
