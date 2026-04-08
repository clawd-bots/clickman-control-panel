'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDateRange } from '@/components/DateProvider';
import { MonthlyTargetData, loadTargets, loadTargetsFromServer, saveTargets, getProratedTarget, resolveMetricName } from './targets';

/**
 * Hook for consuming prorated targets based on the current date range.
 * 
 * Usage:
 *   const { getTarget, getTargetAchievement } = useTargets();
 *   const revenueTarget = getTarget('Net Revenue');  // prorated number or null
 *   const achievement = getTargetAchievement('Net Revenue', actualValue); // percentage or null
 */
export function useTargets() {
  const { dateRange } = useDateRange();
  const [targets, setTargets] = useState<MonthlyTargetData>({});

  // Load from server on mount (falls back to localStorage)
  useEffect(() => {
    // Show localStorage cache immediately for fast paint
    setTargets(loadTargets());
    // Then hydrate from server (source of truth)
    loadTargetsFromServer().then((serverTargets) => {
      if (Object.keys(serverTargets).length > 0) {
        setTargets(serverTargets);
      }
    });
  }, []);

  // Listen for target updates (from Targets page)
  useEffect(() => {
    const handleUpdate = () => {
      setTargets(loadTargets());
    };
    window.addEventListener('targetsUpdated', handleUpdate);
    return () => window.removeEventListener('targetsUpdated', handleUpdate);
  }, []);

  // Get prorated target for a metric
  const getTarget = useCallback((metric: string): number | null => {
    const resolved = resolveMetricName(metric);
    return getProratedTarget(resolved, dateRange.startDate, dateRange.endDate, targets);
  }, [targets, dateRange.startDate, dateRange.endDate]);

  // Get target achievement percentage
  const getTargetAchievement = useCallback((metric: string, actual: number): number | null => {
    const target = getTarget(metric);
    if (target === null || target === 0) return null;
    
    // For inverse metrics (lower is better), invert the calculation
    const inverseMetrics = new Set(['CAC', 'CPA', 'ncCAC', 'nCAC']);
    const resolved = resolveMetricName(metric);
    if (inverseMetrics.has(resolved)) {
      return (target / actual) * 100;
    }
    return (actual / target) * 100;
  }, [getTarget]);

  // Get formatted target string
  const getTargetFormatted = useCallback((metric: string, formatter: (v: number) => string): string | null => {
    const target = getTarget(metric);
    if (target === null) return null;
    return formatter(target);
  }, [getTarget]);

  return { targets, getTarget, getTargetAchievement, getTargetFormatted };
}
