'use client';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
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
}

export default function KPICard({ label, value, change, sparkline, target, targetAchievement }: KPICardProps) {
  const isPositive = change >= 0;
  const data = sparkline.map((v, i) => ({ v, i }));

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-text-secondary font-medium uppercase tracking-wide">
          {label}
          <InfoTooltip metric={label} />
        </div>
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
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            isPositive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
          }`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-xs text-text-secondary">vs prior period</span>
        </div>
        {target && targetAchievement !== undefined && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              targetAchievement >= 100 ? 'bg-success/15 text-success' : targetAchievement >= 80 ? 'bg-warm-gold/15 text-warm-gold' : 'bg-danger/15 text-danger'
            }`}>
              {targetAchievement.toFixed(0)}% of target
            </span>
            <span className="text-xs text-text-secondary">Target: {target}</span>
          </div>
        )}
      </div>
    </div>
  );
}
