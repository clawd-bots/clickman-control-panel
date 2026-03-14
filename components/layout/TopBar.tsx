'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Calendar, ChevronDown, RefreshCw, User } from 'lucide-react';

const datePresets = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Past 7 Days', value: '7d' },
  { label: 'Past 30 Days', value: '30d' },
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'This Quarter', value: 'this-quarter' },
  { label: 'Custom', value: 'custom' },
];

const comparisonOptions = [
  { label: 'Previous Period', value: 'prev-period' },
  { label: 'Previous Year', value: 'prev-year' },
  { label: 'Custom', value: 'custom' },
];

function getDisplayDate(preset: string): string {
  switch (preset) {
    case 'today': return 'Mar 14, 2026';
    case 'yesterday': return 'Mar 13, 2026';
    case '7d': return 'Mar 8 – Mar 14, 2026';
    case '30d': return 'Feb 13 – Mar 14, 2026';
    case 'this-month': return 'Mar 1 – Mar 14, 2026';
    case 'last-month': return 'Feb 1 – Feb 28, 2026';
    case 'this-quarter': return 'Jan 1 – Mar 14, 2026';
    default: return 'Mar 1 – Mar 7, 2026';
  }
}

// Pages where date picker should NOT show
const hideDatePickerPages = ['/cashflow', '/cohorts'];

export default function TopBar() {
  const pathname = usePathname();
  const [datePreset, setDatePreset] = useState('7d');
  const [comparison, setComparison] = useState('prev-period');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCompDropdown, setShowCompDropdown] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const compRef = useRef<HTMLDivElement>(null);

  const showDatePicker = !hideDatePickerPages.includes(pathname);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDateDropdown(false);
      if (compRef.current && !compRef.current.contains(e.target as Node)) setShowCompDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="h-14 bg-bg-surface border-b border-border flex items-center px-6 sticky top-0 z-40">
      {/* Left spacer */}
      <div className="flex-1" />

      {/* Center — Title */}
      <div className="flex items-center justify-center">
        <h1 className="text-base font-bold tracking-wide text-text-primary">
          <span className="text-warm-gold">Click-Man</span>{' '}
          <span className="text-text-primary">Control Panel</span>
        </h1>
      </div>

      {/* Right — Date picker & controls */}
      <div className="flex-1 flex items-center justify-end gap-2">
        {showDatePicker && (
          <>
            {/* Date Range Picker */}
            <div ref={dateRef} className="relative">
              <button
                onClick={() => { setShowDateDropdown(!showDateDropdown); setShowCompDropdown(false); }}
                className="flex items-center gap-2 bg-bg-elevated border border-border rounded-md px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-text-tertiary transition-colors"
              >
                <Calendar size={13} />
                <span>{getDisplayDate(datePreset)}</span>
                <ChevronDown size={12} />
              </button>
              {showDateDropdown && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-bg-elevated border border-border rounded-lg shadow-xl z-50 py-1">
                  {datePresets.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => { setDatePreset(p.value); setShowDateDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        datePreset === p.value
                          ? 'bg-brand-blue/15 text-brand-blue-light'
                          : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Comparison Period */}
            <div ref={compRef} className="relative">
              <button
                onClick={() => { setShowCompDropdown(!showCompDropdown); setShowDateDropdown(false); }}
                className="flex items-center gap-1.5 bg-bg-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <span className="text-text-tertiary">vs</span>
                <span className="text-text-secondary">{comparisonOptions.find(o => o.value === comparison)?.label}</span>
                <ChevronDown size={12} />
              </button>
              {showCompDropdown && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-bg-elevated border border-border rounded-lg shadow-xl z-50 py-1">
                  {comparisonOptions.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => { setComparison(o.value); setShowCompDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        comparison === o.value
                          ? 'bg-brand-blue/15 text-brand-blue-light'
                          : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <button className="p-2 rounded-md hover:bg-bg-elevated text-text-tertiary hover:text-text-secondary transition-colors">
          <RefreshCw size={14} />
        </button>
        <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center">
          <User size={14} className="text-brand-blue-light" />
        </div>
      </div>
    </header>
  );
}
