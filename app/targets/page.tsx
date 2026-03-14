'use client';
import InfoTooltip from '@/components/ui/InfoTooltip';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { targets, targetTrend, targetAISuggestions } from '@/lib/sample-data';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

function getStatus(actual: number, target: number, inverse?: boolean): 'green' | 'yellow' | 'red' {
  const ratio = inverse ? target / actual : actual / target;
  if (ratio >= 0.95) return 'green';
  if (ratio >= 0.85) return 'yellow';
  return 'red';
}

function formatValue(value: number, unit: string): string {
  if (unit === '₱') return formatCurrency(value);
  if (unit === 'x') return `${value.toFixed(2)}x`;
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === '#') return formatNumber(value);
  return value.toString();
}

export default function TargetsPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <h2 className="text-lg font-semibold">Targets & Goals</h2>

      {/* Target Cards Grid */}
      <div className="grid grid-cols-3 gap-4">
        {targets.map((t) => {
          const status = getStatus(t.actual, t.target, 'inverse' in t && t.inverse);
          const progress = 'inverse' in t && t.inverse
            ? Math.min((t.target / t.actual) * 100, 100)
            : Math.min((t.actual / t.target) * 100, 100);

          return (
            <div key={t.metric} className="bg-bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center text-xs text-text-secondary font-medium">
                  {t.metric} <InfoTooltip metric={t.metric} />
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  status === 'green' ? 'bg-success' : status === 'yellow' ? 'bg-warm-gold' : 'bg-danger'
                }`} />
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-xl font-bold text-text-primary">{formatValue(t.actual, t.unit)}</span>
                <span className="text-xs text-text-tertiary">/ {formatValue(t.target, t.unit)}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    status === 'green' ? 'bg-success' : status === 'yellow' ? 'bg-warm-gold' : 'bg-danger'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-text-tertiary">{progress.toFixed(0)}% of target</span>
                <span className={`text-[10px] font-medium ${
                  status === 'green' ? 'text-success' : status === 'yellow' ? 'text-warm-gold' : 'text-danger'
                }`}>
                  {status === 'green' ? 'On Track' : status === 'yellow' ? 'At Risk' : 'Behind'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Revenue: Actual vs Target</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={targetTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: '#161927', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="revenue" name="Actual Revenue" stroke="#34D399" strokeWidth={2} dot={{ fill: '#34D399', r: 3 }} />
              <Line type="monotone" dataKey="target" name="Target" stroke="#64748B" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-secondary mb-4">CM3: Actual vs Target</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={targetTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#161927', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="cm3" name="Actual CM3" stroke="#A855F7" strokeWidth={2} dot={{ fill: '#A855F7', r: 3 }} />
              <Line type="monotone" dataKey="cm3Target" name="Target" stroke="#64748B" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Target Entry */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-text-primary mb-4">Monthly Targets <InfoTooltip metric="Target Pace" /></h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-tertiary uppercase">
                <th className="text-left py-2 px-3 font-medium">Metric</th>
                <th className="text-right py-2 px-3 font-medium">Target</th>
                <th className="text-right py-2 px-3 font-medium">Actual</th>
                <th className="text-right py-2 px-3 font-medium">Gap</th>
                <th className="text-right py-2 px-3 font-medium">Progress</th>
                <th className="text-center py-2 px-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t) => {
                const isInverse = 'inverse' in t && t.inverse;
                const gap = t.target - t.actual;
                const status = getStatus(t.actual, t.target, isInverse);
                const progress = isInverse
                  ? Math.min((t.target / t.actual) * 100, 100)
                  : Math.min((t.actual / t.target) * 100, 100);

                return (
                  <tr key={t.metric} className="border-b border-border/30 hover:bg-bg-elevated/50">
                    <td className="py-2.5 px-3 font-medium text-text-primary">{t.metric}</td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">{formatValue(t.target, t.unit)}</td>
                    <td className="py-2.5 px-3 text-right text-text-primary">{formatValue(t.actual, t.unit)}</td>
                    <td className={`py-2.5 px-3 text-right ${
                      (isInverse ? gap > 0 : gap < 0) ? 'text-danger' : 'text-success'
                    }`}>
                      {t.unit === '₱' ? formatCurrency(Math.abs(gap)) : t.unit === '#' ? Math.abs(gap) : Math.abs(gap).toFixed(1) + (t.unit === '%' ? '%' : t.unit === 'x' ? 'x' : '')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">{progress.toFixed(0)}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        status === 'green' ? 'bg-success/15 text-success' :
                        status === 'yellow' ? 'bg-warm-gold/15 text-warm-gold' :
                        'bg-danger/15 text-danger'
                      }`}>
                        {status === 'green' ? 'On Track' : status === 'yellow' ? 'At Risk' : 'Behind'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Suggestions */}
      <AISuggestionsPanel suggestions={targetAISuggestions} title="Target Intelligence" />
    </div>
  );
}
