/**
 * Target storage and proration engine.
 * 
 * Monthly targets are persisted in localStorage keyed by metric + month.
 * The proration logic calculates the correct target for any arbitrary date range
 * by splitting days across months and summing each month's prorated portion.
 * 
 * For ratio metrics (MER, aMER, AOV, CM3%, Repeat Rate), we don't prorate —
 * we return the weighted average or the value from the most relevant month.
 */

const STORAGE_KEY = 'clickman-monthly-targets';

export interface MonthlyTargetData {
  [metric: string]: {
    [monthKey: string]: number; // e.g. { "Apr26": 2500000, "May26": 2800000 }
  };
}

// Metrics that should NOT be prorated (they're ratios/percentages, not cumulative)
const RATIO_METRICS = new Set(['MER', 'aMER', 'CAC', 'nCAC', 'CM3%', 'AOV', 'Repeat Rate (30d)']);

/**
 * Save all monthly targets to localStorage
 */
export function saveTargets(data: MonthlyTargetData): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

/**
 * Load all monthly targets from localStorage
 */
export function loadTargets(): MonthlyTargetData {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Convert a monthKey like "Apr26" to a Date for the 1st of that month.
 */
function monthKeyToDate(key: string): Date | null {
  const monthNames: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const match = key.match(/^([A-Za-z]{3})(\d{2})$/);
  if (!match) return null;
  const monthIndex = monthNames[match[1]];
  if (monthIndex === undefined) return null;
  const year = 2000 + parseInt(match[2]);
  return new Date(year, monthIndex, 1);
}

/**
 * Get the monthKey (e.g. "Apr26") for a given date.
 */
function dateToMonthKey(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yearShort = (date.getFullYear() % 100).toString();
  return `${months[date.getMonth()]}${yearShort}`;
}

/**
 * Get the number of days in a given month.
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Calculate the prorated target for a metric given a date range.
 * 
 * For cumulative metrics (revenue, orders, etc.):
 *   Monthly target ÷ days in month × days selected in that month
 *   Summed across all months in the range.
 * 
 * For ratio metrics (MER, CAC, AOV, etc.):
 *   Weighted average across months based on days selected,
 *   or the value from the single month if range is within one month.
 */
export function getProratedTarget(
  metric: string,
  startDate: Date,
  endDate: Date,
  targets: MonthlyTargetData
): number | null {
  const metricTargets = targets[metric];
  if (!metricTargets) return null;

  const isRatio = RATIO_METRICS.has(metric);

  // Walk through each day in the range and bucket by month
  const monthDays: Map<string, number> = new Map();
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const key = dateToMonthKey(cursor);
    monthDays.set(key, (monthDays.get(key) || 0) + 1);
    cursor.setDate(cursor.getDate() + 1);
  }

  if (isRatio) {
    // Weighted average: each month's target weighted by days selected
    let weightedSum = 0;
    let totalDays = 0;
    for (const [monthKey, days] of monthDays) {
      const target = metricTargets[monthKey];
      if (target !== undefined && target > 0) {
        weightedSum += target * days;
        totalDays += days;
      }
    }
    if (totalDays === 0) return null;
    return weightedSum / totalDays;
  } else {
    // Cumulative: prorate each month
    let total = 0;
    let hasAnyTarget = false;
    for (const [monthKey, daysSelected] of monthDays) {
      const monthTarget = metricTargets[monthKey];
      if (monthTarget !== undefined && monthTarget > 0) {
        hasAnyTarget = true;
        const monthDate = monthKeyToDate(monthKey);
        if (!monthDate) continue;
        const totalDaysInMonth = daysInMonth(monthDate.getFullYear(), monthDate.getMonth());
        total += (monthTarget / totalDaysInMonth) * daysSelected;
      }
    }
    return hasAnyTarget ? total : null;
  }
}

/**
 * Map between dashboard KPI card metric names and targets page metric names.
 */
const METRIC_ALIAS: Record<string, string> = {
  'Net Revenue': 'Net Revenue',
  'Marketing Costs': 'Marketing Costs',
  'MER': 'MER',
  'aMER': 'aMER',
  'Orders': 'Total Orders',
  'NC Orders': 'NC Orders',
  'CAC': 'CAC',
  'ncCAC': 'nCAC',
  'nCAC': 'nCAC',
  'CM3': 'CM3',
  'CM3%': 'CM3%',
  'AOV': 'AOV',
  'New Customers': 'NC Orders',
  'Net Orders': 'Total Orders',
  'Repeat Rate (30d)': 'Repeat Rate (30d)',
};

/**
 * Resolve a metric name through aliases.
 */
export function resolveMetricName(metric: string): string {
  return METRIC_ALIAS[metric] || metric;
}
