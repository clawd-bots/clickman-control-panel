'use client';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { tooltips } from '@/lib/tooltips';

export default function InfoTooltip({ metric }: { metric: string }) {
  const [show, setShow] = useState(false);
  const text = tooltips[metric] || `Metric: ${metric}`;

  return (
    <span className="relative inline-flex ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-text-tertiary hover:text-text-secondary transition-colors"
        aria-label={`Info about ${metric}`}
      >
        <Info size={14} />
      </button>
      {show && (
        <div className="absolute z-[200] top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 p-3 rounded-lg bg-bg-elevated border border-border text-xs text-text-secondary leading-relaxed shadow-xl">
          <div className="font-medium text-text-primary mb-1">{metric}</div>
          {text}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-bg-elevated" />
        </div>
      )}
    </span>
  );
}
