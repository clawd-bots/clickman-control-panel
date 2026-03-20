'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { useCurrency } from '@/components/CurrencyProvider';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { targets as initialTargets, targetTrend, targetAISuggestions } from '@/lib/sample-data';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Pencil, Check, X, Users as UsersIcon } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface TargetItem {
  metric: string;
  target: number;
  actual: number;
  unit: string;
  inverse?: boolean;
}

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
  const { currency, convertValue } = useCurrency();
  const [targets, setTargets] = useState<TargetItem[]>(initialTargets.map(t => ({ ...t })));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(targets[idx].target.toString());
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    const num = Number(editValue);
    if (!isNaN(num) && num > 0) {
      setTargets(prev => prev.map((t, i) => i === editingIdx ? { ...t, target: num } : t));
    }
    setEditingIdx(null);
  };

  const cancelEdit = () => setEditingIdx(null);

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

  // Dynamic AI suggestions with currency conversion
  const getDynamicAISuggestions = () => {
    return [
      `Revenue is at 90.1% of target with 2 weeks remaining. Need ${formatCurrencyValue(247000)} more, achievable if you maintain current daily run rate of ${formatCurrencyValue(322000)}.`,
      `nCAC at ${formatCurrencyValue(787)} is 5% above the ${formatCurrencyValue(750)} target. TikTok CPA is dragging the average up. Tighten TikTok bid caps or shift budget to Meta.`,
      'CM3% at 27.8% vs 30% target. The gap is primarily driven by high discount code usage (9%). Consider reducing promo frequency.',
      'New Customer acquisition pace suggests 850 target is reachable if you increase spend by 8% in the final 2 weeks.',
      'Repeat Rate (28.5% vs 30%) is close. Send a targeted re-engagement email to November cohort since they have the highest 30d repeat potential.',
    ];
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-1">
        <h2 className="text-lg sm:text-xl font-semibold">Targets & Goals</h2>
        <p className="text-sm text-text-secondary mt-1">
          Set what <strong className="text-text-primary">should</strong> happen, goals, gaps, and recommendations.
          The Dashboard shows what <em>is</em> happening. This page tracks where you want to be.
        </p>
      </div>


          {/* Set Monthly Targets Section */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Monthly Targets, Click any target value to edit</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {targets.map((t, idx) => {
                const status = getStatus(t.actual, t.target, t.inverse);
                const progress = t.inverse
                  ? Math.min((t.target / t.actual) * 100, 100)
                  : Math.min((t.actual / t.target) * 100, 100);
                const isEditing = editingIdx === idx;

                return (
                  <div key={t.metric} className="bg-bg-elevated rounded-lg p-4 min-h-[120px] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center text-xs text-text-secondary font-medium gap-1">
                        <span className="truncate">{t.metric}</span>
                        <InfoTooltip metric={t.metric} />
                      </div>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        status === 'green' ? 'bg-success' : status === 'yellow' ? 'bg-warm-gold' : 'bg-danger'
                      }`} />
                    </div>

                    <div className="flex items-baseline gap-2 mb-3 min-w-0">
                      <span className="text-lg font-bold text-text-primary truncate">{formatValue(t.actual, t.unit)}</span>
                      <span className="text-xs text-text-secondary shrink-0">/</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                            className="w-20 bg-bg-primary border border-warm-gold rounded px-2 py-0.5 text-xs text-text-primary outline-none"
                            autoFocus
                          />
                          <button onClick={saveEdit} className="text-success shrink-0"><Check size={12} /></button>
                          <button onClick={cancelEdit} className="text-danger shrink-0"><X size={12} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(idx)}
                          className="flex items-center gap-1 text-xs text-text-secondary hover:text-warm-gold transition-colors group min-w-0"
                        >
                          <span className="truncate">{formatValue(t.target, t.unit)}</span>
                          <Pencil size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="w-full h-3 bg-bg-primary rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all ${
                            status === 'green' ? 'bg-success' : status === 'yellow' ? 'bg-warm-gold' : 'bg-danger'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-secondary">{progress.toFixed(0)}%</span>
                        <span className={`text-[10px] font-medium ${
                          status === 'green' ? 'text-success' : status === 'yellow' ? 'text-warm-gold' : 'text-danger'
                        }`}>
                          {status === 'green' ? 'On Track' : status === 'yellow' ? 'At Risk' : 'Behind'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mx-1">
            <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
              <h3 className="text-sm font-medium text-text-secondary mb-4">Revenue: Actual vs Target</h3>
              <div className="min-h-[280px]">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={targetTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} interval={0} />
                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000000).toFixed(1)}M`} />
                    <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="revenue" name="Actual Revenue" stroke="#34D399" strokeWidth={2} dot={{ fill: '#34D399', r: 3 }} />
                    <Line type="monotone" dataKey="target" name="Target" stroke="#64748B" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
              <h3 className="text-sm font-medium text-text-secondary mb-4">CM3: Actual vs Target</h3>
              <div className="min-h-[280px]">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={targetTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} interval={0} />
                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="cm3" name="Actual CM3" stroke="#A855F7" strokeWidth={2} dot={{ fill: '#A855F7', r: 3 }} />
                    <Line type="monotone" dataKey="cm3Target" name="Target" stroke="#64748B" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Gap Analysis Table */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
            <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
              <span>Target Gap Analysis</span>
              <InfoTooltip metric="Target Pace" />
            </h3>
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <div className="min-w-[700px]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-secondary uppercase">
                      <th className="text-left py-2 px-2 sm:px-3 font-medium min-w-[100px]">Metric</th>
                      <th className="text-right py-2 px-2 sm:px-3 font-medium min-w-[80px]">Target</th>
                      <th className="text-right py-2 px-2 sm:px-3 font-medium min-w-[80px]">Actual</th>
                      <th className="text-right py-2 px-2 sm:px-3 font-medium min-w-[80px]">Gap</th>
                      <th className="text-right py-2 px-2 sm:px-3 font-medium min-w-[70px]">Progress</th>
                      <th className="text-center py-2 px-2 sm:px-3 font-medium min-w-[70px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((t) => {
                      const isInverse = !!t.inverse;
                      const gap = t.target - t.actual;
                      const status = getStatus(t.actual, t.target, isInverse);
                      const progress = isInverse
                        ? Math.min((t.target / t.actual) * 100, 100)
                        : Math.min((t.actual / t.target) * 100, 100);

                      return (
                        <tr key={t.metric} className="border-b border-border/30 hover:bg-bg-elevated/50">
                          <td className="py-2.5 px-2 sm:px-3 font-medium text-text-primary">{t.metric}</td>
                          <td className="py-2.5 px-2 sm:px-3 text-right text-text-secondary">{formatValue(t.target, t.unit)}</td>
                          <td className="py-2.5 px-2 sm:px-3 text-right text-text-primary">{formatValue(t.actual, t.unit)}</td>
                          <td className={`py-2.5 px-2 sm:px-3 text-right ${
                            (isInverse ? gap > 0 : gap < 0) ? 'text-danger' : 'text-success'
                          }`}>
                            {t.unit === '₱' ? formatCurrency(Math.abs(gap)) : t.unit === '#' ? Math.abs(gap) : Math.abs(gap).toFixed(1) + (t.unit === '%' ? '%' : t.unit === 'x' ? 'x' : '')}
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-right text-text-secondary">{progress.toFixed(0)}%</td>
                          <td className="py-2.5 px-2 sm:px-3 text-center">
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
          </div>

          <div className="px-1">
            <AISuggestionsPanel 
              suggestions={getDynamicAISuggestions()} 
              title="Target Intelligence"
            />
          </div>

    </div>
  );
}
