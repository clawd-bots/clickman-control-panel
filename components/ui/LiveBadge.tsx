'use client';

/**
 * LiveBadge — temporary visual indicator for components using real Triple Whale data.
 * Shows a green "LIVE" pill next to components that have been wired to live data.
 * Will be removed once all integrations are established (per Indro's request).
 */
export function LiveBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Live
    </span>
  );
}
