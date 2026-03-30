'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { tooltips } from '@/lib/tooltips';

export default function InfoTooltip({ metric }: { metric: string }) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const text = tooltips[metric] || `Metric: ${metric}`;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!show || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = 288; // w-72 = 18rem = 288px

    // Position below the button, centered horizontally
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Clamp to viewport so it never gets clipped
    const pad = 8;
    if (left < pad) left = pad;
    if (left + tooltipWidth > window.innerWidth - pad) left = window.innerWidth - pad - tooltipWidth;

    setPos({
      top: rect.bottom + 8,
      left,
    });
  }, [show]);

  return (
    <span className="relative inline-flex ml-1">
      <button
        ref={buttonRef}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-text-tertiary hover:text-text-secondary transition-colors"
        aria-label={`Info about ${metric}`}
      >
        <Info size={14} />
      </button>
      {show && mounted && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] w-72 p-3 rounded-lg bg-bg-elevated border border-border text-xs text-text-secondary leading-relaxed shadow-xl pointer-events-none"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          <div className="font-medium text-text-primary mb-1">{metric}</div>
          {text}
        </div>,
        document.body
      )}
    </span>
  );
}
