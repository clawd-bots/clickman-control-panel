'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { getPreviousPeriodRange } from '@/lib/comparison-range';

interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: string;
  comparison: string;
  comparisonEnabled: boolean;
  /** When comparison mode is `custom`, the baseline window (set via TopBar). */
  comparisonCustomStart: Date | null;
  comparisonCustomEnd: Date | null;
}

interface DateContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  updatePreset: (preset: string) => void;
  updateComparison: (comparison: string) => void;
  setComparisonCustomRange: (start: Date | null, end: Date | null) => void;
  setComparisonEnabled: (enabled: boolean) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

// Helper function to get dates from preset
function getDatesFromPreset(preset: string): { startDate: Date; endDate: Date } {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);
  
  let startDate = new Date(today);
  
  switch (preset) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      startDate.setDate(today.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(today.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case '7d':
      startDate.setDate(today.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    case '30d':
      startDate.setDate(today.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'this-month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last-month': {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      lastMonthStart.setHours(0, 0, 0, 0);
      lastMonthEnd.setHours(23, 59, 59, 999);
      return { startDate: lastMonthStart, endDate: lastMonthEnd };
    }
    case 'this-quarter': {
      // Calendar quarter (Q1 Jan–Mar, Q2 Apr–Jun, …), start through today (not “this month”).
      const quarter = Math.floor(today.getMonth() / 3);
      startDate = new Date(today.getFullYear(), quarter * 3, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    default: // custom - default to past 7 days
      startDate.setDate(today.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
  }
  
  return { startDate, endDate };
}

export function DateProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRangeState] = useState<DateRange>(() => {
    // Initialize with saved comparison preference (SSR safe)
    const comparisonEnabled = typeof window !== 'undefined' 
      ? localStorage.getItem('clickman-comparison-enabled') === 'true' 
      : true;
    
    const { startDate, endDate } = getDatesFromPreset('7d');
    
    return {
      startDate,
      endDate,
      preset: '7d',
      comparison: 'prev-period',
      comparisonEnabled,
      comparisonCustomStart: null,
      comparisonCustomEnd: null,
    };
  });

  // Hydrate from localStorage after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedComparison = localStorage.getItem('clickman-comparison-enabled');
      if (savedComparison !== null) {
        setDateRangeState(prev => ({
          ...prev,
          comparisonEnabled: savedComparison === 'true'
        }));
      }
    }
  }, []);

  const updatePreset = (preset: string) => {
    const { startDate, endDate } = getDatesFromPreset(preset);
    setDateRangeState(prev => ({
      ...prev,
      startDate,
      endDate,
      preset,
    }));
  };

  const updateComparison = (comparison: string) => {
    setDateRangeState((prev) => {
      const next: DateRange = { ...prev, comparison };
      if (comparison === 'custom' && (!prev.comparisonCustomStart || !prev.comparisonCustomEnd)) {
        const { start, end } = getPreviousPeriodRange(prev.startDate, prev.endDate);
        next.comparisonCustomStart = start;
        next.comparisonCustomEnd = end;
      }
      return next;
    });
  };

  const setComparisonCustomRange = (start: Date | null, end: Date | null) => {
    setDateRangeState((prev) => ({
      ...prev,
      comparison: 'custom',
      comparisonCustomStart: start,
      comparisonCustomEnd: end,
    }));
  };

  const setComparisonEnabled = (enabled: boolean) => {
    setDateRangeState(prev => ({
      ...prev,
      comparisonEnabled: enabled,
    }));
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('clickman-comparison-enabled', String(enabled));
    }
  };

  const setDateRange = (range: DateRange) => {
    setDateRangeState(range);
  };

  return (
    <DateContext.Provider value={{
      dateRange,
      setDateRange,
      updatePreset,
      updateComparison,
      setComparisonCustomRange,
      setComparisonEnabled,
    }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateProvider');
  }
  return context;
}