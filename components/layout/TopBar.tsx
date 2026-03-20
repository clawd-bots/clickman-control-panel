'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Calendar, ChevronDown, RefreshCw, User, Sun, Moon, Menu, DollarSign } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useSidebar } from '@/components/layout/SidebarContext';
import { useCurrency } from '@/components/CurrencyProvider';

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
    case '7d': return 'Mar 8 - Mar 14, 2026';
    case '30d': return 'Feb 13 - Mar 14, 2026';
    case 'this-month': return 'Mar 1 - Mar 14, 2026';
    case 'last-month': return 'Feb 1 - Feb 28, 2026';
    case 'this-quarter': return 'Jan 1 - Mar 14, 2026';
    default: return 'Mar 1 - Mar 7, 2026';
  }
}

function getShortDisplayDate(preset: string): string {
  switch (preset) {
    case 'today': return 'Mar 14';
    case 'yesterday': return 'Mar 13';
    case '7d': return '7 Days';
    case '30d': return '30 Days';
    case 'this-month': return 'This Mo.';
    case 'last-month': return 'Last Mo.';
    case 'this-quarter': return 'This Qtr';
    default: return 'Custom';
  }
}

// Pages where date picker should NOT show
const hideDatePickerPages = ['/cashflow', '/cohorts'];

export default function TopBar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobile } = useSidebar();
  const { currency, setCurrency } = useCurrency();
  const [datePreset, setDatePreset] = useState('7d');
  const [comparison, setComparison] = useState('prev-period');
  const [comparisonEnabled, setComparisonEnabled] = useState(true);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCompDropdown, setShowCompDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const compRef = useRef<HTMLDivElement>(null);

  const showDatePicker = !hideDatePickerPages.includes(pathname);

  // Load comparison preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('clickman-comparison-enabled');
    if (stored !== null) {
      setComparisonEnabled(stored === 'true');
    }
  }, []);

  // Save comparison preference to localStorage
  useEffect(() => {
    localStorage.setItem('clickman-comparison-enabled', comparisonEnabled.toString());
  }, [comparisonEnabled]);

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
    <header className="h-14 bg-bg-surface border-b border-border flex items-center justify-between px-3 md:px-6 sticky top-0 z-40 transition-colors min-w-0">
      {/* Left - Hamburger (mobile) + AndYou Logo + Title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggleMobile}
          className="lg:hidden p-2 -ml-1 rounded-md hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors shrink-0"
        >
          <Menu size={20} />
        </button>
        <Image 
          src="/andyou-logo.png" 
          alt="AndYou" 
          width={32}
          height={24}
          className="h-6 w-auto shrink-0" 
        />
        <h1 className="text-sm md:text-base font-bold tracking-wide text-text-primary truncate">
          <span className="text-warm-gold">Click-Man</span>{' '}
          <span className="text-text-primary hidden sm:inline">Control Panel</span>
        </h1>
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
                <span className="hidden md:inline">{getDisplayDate(datePreset)}</span>
                <span className="md:hidden">{getShortDisplayDate(datePreset)}</span>
                <ChevronDown size={12} />
              </button>
              {showDateDropdown && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-bg-elevated border border-border rounded-lg shadow-xl z-50 py-1">
                  {datePresets.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => { 
                        setDatePreset(p.value); 
                        setShowDateDropdown(false);
                        // Dispatch date change event for global consumption
                        const event = new CustomEvent('dateRangeChanged', { 
                          detail: { preset: p.value, comparison, comparisonEnabled }
                        });
                        window.dispatchEvent(event);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        datePreset === p.value
                          ? 'bg-brand-blue/15 text-brand-blue-light'
                          : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => {
                        const newEnabled = !comparisonEnabled;
                        setComparisonEnabled(newEnabled);
                        // Dispatch date change event for global consumption
                        const event = new CustomEvent('dateRangeChanged', { 
                          detail: { preset: datePreset, comparison, comparisonEnabled: newEnabled }
                        });
                        window.dispatchEvent(event);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors"
                    >
                      <span>Compare to previous period</span>
                      <div className={`w-8 h-4 rounded-full transition-colors ${comparisonEnabled ? 'bg-brand-blue' : 'bg-border'}`}>
                        <div className={`w-3 h-3 bg-bg-surface rounded-full shadow transition-transform mt-0.5 ${comparisonEnabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Comparison Period - hidden on small screens and when comparison is disabled */}
            {comparisonEnabled && (
              <div ref={compRef} className="relative hidden sm:block">
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
                        onClick={() => { 
                          setComparison(o.value); 
                          setShowCompDropdown(false);
                          // Dispatch date change event for global consumption
                          const event = new CustomEvent('dateRangeChanged', { 
                            detail: { preset: datePreset, comparison: o.value, comparisonEnabled }
                          });
                          window.dispatchEvent(event);
                        }}
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
            )}
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
