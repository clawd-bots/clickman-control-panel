'use client';

/**
 * Skeleton loading components for data-dependent sections.
 * Shows pulsating gray placeholders while real data loads.
 */

export function SkeletonBox({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`animate-pulse bg-bg-elevated rounded ${className}`} style={style} />
  );
}

export function SkeletonKPICard() {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
      <SkeletonBox className="h-3 w-24" />
      <SkeletonBox className="h-8 w-32" />
      <div className="flex items-center gap-2">
        <SkeletonBox className="h-4 w-16" />
        <SkeletonBox className="h-4 w-20" />
      </div>
      <SkeletonBox className="h-1 w-full mt-2" />
    </div>
  );
}

export function SkeletonChart({ height = 'h-[240px]' }: { height?: string }) {
  return (
    <div className={`bg-bg-surface border border-border rounded-lg p-4 sm:p-5`}>
      <div className="flex items-center justify-between mb-4">
        <SkeletonBox className="h-4 w-48" />
        <SkeletonBox className="h-5 w-20" />
      </div>
      <div className={`${height} flex items-end gap-1 px-4`}>
        {Array.from({ length: 20 }).map((_, i) => (
          <SkeletonBox
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + Math.sin(i * 0.5) * 25 + Math.random() * 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <SkeletonBox className="h-4 w-48" />
        <SkeletonBox className="h-5 w-20" />
      </div>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonBox key={i} className="h-3 flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBox key={c} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonMetricCard() {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-3 space-y-2">
      <SkeletonBox className="h-3 w-20" />
      <SkeletonBox className="h-6 w-28" />
      <SkeletonBox className="h-3 w-16" />
    </div>
  );
}
