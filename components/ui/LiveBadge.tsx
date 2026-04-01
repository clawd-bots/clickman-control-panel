'use client';

/**
 * LiveBadge — visual indicator for data source status.
 * - "live" (green): component uses real API data (Triple Whale, GA4, etc.)
 * - "sample" (yellow): component still uses dummy/sample data
 * Will be removed once all integrations are established (per Indro's request).
 */
export function LiveBadge({ className = '', variant = 'live' }: { className?: string; variant?: 'live' | 'sample' }) {
  const isLive = variant === 'live';
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
        isLive
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
      {isLive ? 'Live' : 'Sample'}
    </span>
  );
}
