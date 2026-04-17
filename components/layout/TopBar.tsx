'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Calendar, ChevronDown, RefreshCw, Sun, Moon, Menu, DollarSign } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useSidebar } from '@/components/layout/SidebarContext';
import { useCurrency } from '@/components/CurrencyProvider';
import { useDateRange } from '@/components/DateProvider';
import { toLocalDateString } from '@/lib/dateUtils';

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
  { label: 'No Comparison', value: 'none' },
  { label: 'Previous Period', value: 'prev-period' },
  { label: 'Previous Year', value: 'prev-year' },
  { label: 'Custom', value: 'custom' },
];

function fmtDate(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString('en-US', opts);
}

/** Primary label: always reflects the actual range in context (fixes Custom + preset drift). */
function getRangeLabel(start: Date, end: Date, preset: string): string {
  const fmt = (d: Date) => fmtDate(d, { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtShort = (d: Date) => fmtDate(d, { month: 'short', day: 'numeric' });
  if (preset === 'today') return fmt(start);
  if (preset === 'yesterday') return fmt(start);
  return `${fmtShort(start)} - ${fmt(end)}`;
}

function getShortDisplayDate(preset: string): string {
  const today = new Date();
  const fmtShort = (d: Date) => fmtDate(d, { month: 'short', day: 'numeric' });

  switch (preset) {
    case 'today':
      return fmtShort(today);
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return fmtShort(y);
    }
    case '7d': return '7 Days';
    case '30d': return '30 Days';
    case 'this-month': return 'This Mo.';
    case 'last-month': return 'Last Mo.';
    case 'this-quarter': return 'This Qtr';
    default: return 'Custom';
  }
}

// Pages where date picker + comparison controls are hidden (page uses its own time semantics).
const hideDatePickerPages: string[] = ['/cohorts'];

export default function TopBar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobile } = useSidebar();
  const { currency, setCurrency } = useCurrency();
  const {
    dateRange,
    setDateRange,
    updatePreset,
    updateComparison,
    setComparisonCustomRange,
    setComparisonEnabled,
  } = useDateRange();
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCompDropdown, setShowCompDropdown] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [compCustomStart, setCompCustomStart] = useState('');
  const [compCustomEnd, setCompCustomEnd] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const compRef = useRef<HTMLDivElement>(null);

  const showDatePicker = !hideDatePickerPages.includes(pathname);

  useEffect(() => {
    if (!showDateDropdown) setCustomMode(false);
  }, [showDateDropdown]);

  useEffect(() => {
    if (
      dateRange.comparison === 'custom' &&
      dateRange.comparisonCustomStart &&
      dateRange.comparisonCustomEnd
    ) {
      setCompCustomStart(toLocalDateString(dateRange.comparisonCustomStart));
      setCompCustomEnd(toLocalDateString(dateRange.comparisonCustomEnd));
    }
  }, [dateRange.comparison, dateRange.comparisonCustomStart, dateRange.comparisonCustomEnd]);

  // Global refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Simulate API refresh - in real app this would refresh all data sources
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLastRefreshed(new Date());
      
      // Show success notification (you could use a toast library here)
      const event = new CustomEvent('refresh-success', { 
        detail: { message: 'Data refreshed successfully', timestamp: new Date() }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDateDropdown(false);
      if (compRef.current && !compRef.current.contains(e.target as Node)) setShowCompDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="h-14 glass-panel border-b border-border flex items-center justify-between px-3 md:px-6 sticky top-0 z-40 min-w-0">
      {/* Left - Hamburger (mobile) + AndYou Logo + Title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggleMobile}
          className="lg:hidden p-2 -ml-1 rounded-md hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors shrink-0"
        >
          <Menu size={20} />
        </button>
        <img 
          src={theme === 'dark' ? '/clickman-logo-white.png' : '/clickman-logo-black.png'} 
          alt="Click-Man Control Panel" 
          className="h-6 sm:h-8 w-auto shrink-0"
        />
      </div>

      {/* Right - Date picker & controls */}
      <div className="flex items-center justify-end gap-1 md:gap-2 ml-auto shrink-0">
        {showDatePicker && (
          <>
            {/* Date Range Picker */}
            <div ref={dateRef} className="relative">
              <button
                onClick={() => { setShowDateDropdown(!showDateDropdown); setShowCompDropdown(false); }}
                className="flex items-center gap-1 md:gap-2 bg-bg-elevated border border-border rounded-md px-2 md:px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-text-tertiary transition-colors"
              >
                <Calendar size={13} />
                <span className="hidden md:inline">{getRangeLabel(dateRange.startDate, dateRange.endDate, dateRange.preset)}</span>
                <span className="md:hidden">{getShortDisplayDate(dateRange.preset)}</span>
                <ChevronDown size={12} />
              </button>
              {showDateDropdown && (
                <div className="absolute right-0 top-full mt-1 w-[min(100vw-1.5rem,16rem)] sm:w-60 bg-bg-elevated border border-border rounded-lg shadow-xl z-50 py-1">
                  {customMode ? (
                    <div className="px-3 py-2 space-y-2">
                      <button
                        type="button"
                        onClick={() => setCustomMode(false)}
                        className="text-xs text-text-secondary hover:text-text-primary"
                      >
                        ← Back to presets
                      </button>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wide text-text-tertiary font-medium">Start</label>
                        <input
                          type="date"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary outline-none focus:border-brand-blue"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wide text-text-tertiary font-medium">End</label>
                        <input
                          type="date"
                          value={customEnd}
                          min={customStart}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary outline-none focus:border-brand-blue"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!customStart || !customEnd) return;
                            let start = new Date(`${customStart}T00:00:00`);
                            let end = new Date(`${customEnd}T23:59:59.999`);
                            if (start > end) {
                              [start, end] = [
                                new Date(`${customEnd}T00:00:00`),
                                new Date(`${customStart}T23:59:59.999`),
                              ];
                            }
                            setDateRange({
                              ...dateRange,
                              startDate: start,
                              endDate: end,
                              preset: 'custom',
                            });
                            setShowDateDropdown(false);
                            setCustomMode(false);
                          }}
                          className="flex-1 rounded-md bg-brand-blue text-white py-1.5 text-xs font-medium hover:opacity-90"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomMode(false);
                            setShowDateDropdown(false);
                          }}
                          className="rounded-md border border-border px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-surface"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    datePresets.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => {
                          if (p.value === 'custom') {
                            setCustomStart(toLocalDateString(dateRange.startDate));
                            setCustomEnd(toLocalDateString(dateRange.endDate));
                            setCustomMode(true);
                            return;
                          }
                          updatePreset(p.value);
                          setShowDateDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          dateRange.preset === p.value
                            ? 'bg-brand-blue/10 text-brand-blue dark:bg-accent/10 dark:text-accent-light'
                            : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Comparison Period - hidden on small screens */}
              <div ref={compRef} className="relative hidden sm:block">
                <button
                  onClick={() => { setShowCompDropdown(!showCompDropdown); setShowDateDropdown(false); }}
                  className="flex items-center gap-1.5 bg-bg-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <span className="text-text-tertiary">vs</span>
                  <span className="text-text-secondary">{comparisonOptions.find(o => o.value === dateRange.comparison)?.label}</span>
                  <ChevronDown size={12} />
                </button>
                {showCompDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-[min(100vw-1.5rem,16rem)] sm:w-60 bg-bg-elevated border border-border rounded-lg shadow-xl z-50 py-1">
                    {comparisonOptions.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => {
                          if (o.value === 'custom') {
                            updateComparison('custom');
                            setComparisonEnabled(true);
                            return;
                          }
                          updateComparison(o.value);
                          const newEnabled = o.value !== 'none';
                          setComparisonEnabled(newEnabled);
                          setShowCompDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          dateRange.comparison === o.value
                            ? 'bg-brand-blue/10 text-brand-blue dark:bg-accent/10 dark:text-accent-light'
                            : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                    {dateRange.comparison === 'custom' && (
                      <div className="border-t border-border px-3 py-2 space-y-2">
                        <p className="text-[10px] uppercase tracking-wide text-text-tertiary font-medium">
                          Baseline range
                        </p>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wide text-text-tertiary font-medium">
                            Start
                          </label>
                          <input
                            type="date"
                            value={compCustomStart}
                            onChange={(e) => setCompCustomStart(e.target.value)}
                            className="w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary outline-none focus:border-brand-blue"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wide text-text-tertiary font-medium">
                            End
                          </label>
                          <input
                            type="date"
                            value={compCustomEnd}
                            min={compCustomStart}
                            onChange={(e) => setCompCustomEnd(e.target.value)}
                            className="w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary outline-none focus:border-brand-blue"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!compCustomStart || !compCustomEnd) return;
                              let start = new Date(`${compCustomStart}T00:00:00`);
                              let end = new Date(`${compCustomEnd}T23:59:59.999`);
                              if (start > end) {
                                [start, end] = [
                                  new Date(`${compCustomEnd}T00:00:00`),
                                  new Date(`${compCustomStart}T23:59:59.999`),
                                ];
                              }
                              setComparisonCustomRange(start, end);
                              setShowCompDropdown(false);
                            }}
                            className="flex-1 rounded-md bg-brand-blue text-white py-1.5 text-xs font-medium hover:opacity-90"
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCompDropdown(false)}
                            className="rounded-md border border-border px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-surface"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
          </>
        )}

        {/* Currency Toggle */}
        <button
          onClick={() => setCurrency(currency === '₱' ? '$' : '₱')}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-bg-elevated text-text-tertiary hover:text-text-primary transition-colors text-xs font-medium"
          title={`Switch to ${currency === '₱' ? 'USD ($)' : 'PHP (₱)'}`}
        >
          {currency === '₱' ? <span>₱</span> : <DollarSign size={12} />}
          <span className="hidden sm:inline">{currency === '₱' ? 'PHP' : 'USD'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-bg-elevated text-text-tertiary hover:text-text-primary transition-colors"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>

        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="hidden sm:block p-2 rounded-md hover:bg-bg-elevated text-text-tertiary hover:text-text-secondary transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed relative"
          title={`Refresh all data from connected sources (Triple Whale, Google Sheets, GA4)${lastRefreshed ? `\nLast refreshed: ${lastRefreshed.toLocaleTimeString()}` : ''}`}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  );
}
