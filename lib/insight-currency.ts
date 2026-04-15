import type { InsightMoneyCurrency } from '@/lib/ai-insights-storage';

/**
 * Rewrite monetary figures inside a line of AI insight text when the user toggles ₱ / $.
 * `source` is the currency the model used when Refresh was clicked (stored with the cache).
 */
export function rewriteInsightLineForCurrency(
  text: string,
  source: InsightMoneyCurrency,
  target: InsightMoneyCurrency,
  usdToPhpRate: number,
): string {
  if (source === target) return text;
  if (!Number.isFinite(usdToPhpRate) || usdToPhpRate <= 0) return text;

  const strip = (s: string) => parseFloat(s.replace(/,/g, ''));
  const fmtPhpWhole = (n: number) =>
    `₱${Math.round(n).toLocaleString('en-PH', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`;
  const fmtUsd = (n: number) => {
    const abs = Math.abs(n);
    const digits = abs >= 100 ? 0 : 2;
    return `$${n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
  };

  let out = text;

  if (source === 'php' && target === 'usd') {
    out = out.replace(/₱\s*([\d,]+(?:\.\d+)?)\s*([KkMm])?/g, (match, numStr, sfx) => {
      let n = strip(numStr);
      if (!Number.isFinite(n)) return match;
      if (sfx) {
        const u = String(sfx).toLowerCase();
        if (u === 'k') n *= 1e3;
        if (u === 'm') n *= 1e6;
      }
      return fmtUsd(n / usdToPhpRate);
    });
    out = out.replace(/\bPHP\s*([\d,]+(?:\.\d+)?)\b/gi, (_, numStr) => {
      const n = strip(numStr);
      if (!Number.isFinite(n)) return _;
      return fmtUsd(n / usdToPhpRate);
    });
  } else if (source === 'usd' && target === 'php') {
    out = out.replace(/\$\s*([\d,]+(?:\.\d+)?)\s*([KkMm])?\b/g, (match, numStr, sfx) => {
      let n = strip(numStr);
      if (!Number.isFinite(n)) return match;
      if (sfx) {
        const u = String(sfx).toLowerCase();
        if (u === 'k') n *= 1e3;
        if (u === 'm') n *= 1e6;
      }
      return fmtPhpWhole(n * usdToPhpRate);
    });
    out = out.replace(/\bUSD\s*([\d,]+(?:\.\d+)?)\b/gi, (_, numStr) => {
      const n = strip(numStr);
      if (!Number.isFinite(n)) return _;
      return fmtPhpWhole(n * usdToPhpRate);
    });
  }

  return out;
}

export function mapInsightLinesForDisplayCurrency(
  lines: string[],
  refreshCurrency: InsightMoneyCurrency,
  displayIsUsd: boolean,
  usdToPhpRate: number,
): string[] {
  const target: InsightMoneyCurrency = displayIsUsd ? 'usd' : 'php';
  return lines.map((line) => rewriteInsightLineForCurrency(line, refreshCurrency, target, usdToPhpRate));
}
