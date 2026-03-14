export function formatCurrency(value: number, currency: '₱' | '$' = '₱'): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${currency}${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${currency}${(value / 1_000).toFixed(1)}K`;
  }
  return `${currency}${value.toFixed(2)}`;
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
