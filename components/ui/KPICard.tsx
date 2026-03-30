'use client';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import InfoTooltip from './InfoTooltip';

interface KPICardProps {
  label: string;
  value: string;
  change: number;
  sparkline: number[];
  prefix?: string;
  suffix?: string;
  target?: string;
  targetAchievement?: number; // percentage of target achieved
  secondary?: string; // secondary value displayed below main value
  testId?: string; // for PDF export selectors
}

export default function KPICard({ label, value, change, sparkline, target, targetAchievement, secondary, testId }: KPICardProps) {
  const isPositive = change >= 0;
  const data = sparkline.map((v, i) => ({ v, i }));
  const [comparisonEnabled, setComparisonEnabled] = useState(true);

  // Listen for comparison state changes from TopBar
  useEffect(() => {
    const handleDateChange = (event: CustomEvent) => {
      const { comparisonEnabled: enabled } = event.detail;
      if (enabled !== undefined) {
        setComparisonEnabled(enabled);
      }
    };

    // Load initial state from localStorage
    const stored = localStorage.getItem('clickman-comparison-enabled');
    if (stored !== null) {
      setComparisonEnabled(stored === 'true');
    }

    window.addEventListener('dateRangeChanged', handleDateChange as EventListener);
    
    return () => {
      window.removeEventListener('dateRangeChanged', handleDateChange as EventListener);
    };
  }, []);

  return (
    <div 
      className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-2"
      data-testid={testId || `kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-text-secondary font-medium uppercase tracking-wide">
          {label}
          <InfoTooltip metric={label} />
        </div>
        {data.length > 0 && (
          <div className="w-16 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={isPositive ? '#34D399' : '#EF4444'}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      {secondary && (
        <div className="text-sm text-text-secondary">{secondary}</div>
      )}
      <div className="flex flex-col gap-1">
        {comparisonEnabled && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              isPositive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
            }`}>
              {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </span>
            <span className="text-xs text-text-secondary">vs prior period</span>
          </div>
        )}
        {target && targetAchievement !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                targetAchievement >= 100 ? 'bg-success/15 text-success' : targetAchievement >= 80 ? 'bg-warm-gold/15 text-warm-gold' : 'bg-danger/15 text-danger'
              }`}>
                {targetAchievement.toFixed(0)}% of target
              </span>
              <span className="text-xs text-text-secondary">Target: {target}</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-bg-elevated rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  targetAchievement >= 100 ? 'bg-success' : targetAchievement >= 80 ? 'bg-warm-gold' : 'bg-danger'
                }`}
                style={{ 
                  width: `${Math.min(targetAchievement, 100)}%`,
                  backgroundColor: targetAchievement >= 100 ? '#22C55E' : targetAchievement >= 80 ? 'var(--color-warm-gold)' : 'var(--color-danger)'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
