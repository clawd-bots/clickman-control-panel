export function formatCurrency(value: number | null | undefined, currency: '₱' | '$' = '₱'): string {
  const n = value == null || !Number.isFinite(Number(value)) ? 0 : Number(value);
  if (Math.abs(n) >= 1_000_000) {
    return `${currency}${(n / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${currency}${(n / 1_000).toFixed(1)}K`;
  }
  return `${currency}${n.toFixed(2)}`;
}

/**
 * Full currency amount with locale grouping, no fractional digits — for chart tooltips and dense labels.
 */
export function formatCurrencyWhole(
  value: number | null | undefined,
  currency: '₱' | '$' = '₱',
  locale: string = currency === '₱' ? 'en-PH' : 'en-US',
): string {
  const n = value == null || !Number.isFinite(Number(value)) ? 0 : Number(value);
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  return `${sign}${currency}${abs.toLocaleString(locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
}

export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getHeatmapClass(value: number, max: number): string {
  const ratio = Math.min(value / max, 1);
  const level = Math.floor(ratio * 9);
  return `heatmap-${level}`;
}
