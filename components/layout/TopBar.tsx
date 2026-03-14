'use client';
import { Calendar, RefreshCw, User } from 'lucide-react';

export default function TopBar() {
  return (
    <header className="h-14 bg-bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-text-primary tracking-wide">
          <span className="text-warm-gold">Click-Man</span>{' '}
          <span className="text-text-secondary font-normal">Control Panel</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Date range picker */}
        <div className="flex items-center gap-2 bg-bg-elevated border border-border rounded-md px-3 py-1.5 text-xs text-text-secondary">
          <Calendar size={14} />
          <span>Mar 1 – Mar 7, 2026</span>
        </div>

        <button className="p-2 rounded-md hover:bg-bg-elevated text-text-tertiary hover:text-text-secondary transition-colors">
          <RefreshCw size={14} />
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center">
          <User size={14} className="text-brand-blue-light" />
        </div>
      </div>
    </header>
  );
}
