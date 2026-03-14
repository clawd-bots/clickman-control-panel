'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { targets as initialTargets, targetTrend, targetAISuggestions } from '@/lib/sample-data';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Pencil, Check, X, AlertTriangle, User, Bot, Users as UsersIcon, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { finalItems as initialFinalItems, getAllDone, getPendingCount, type FinalItem } from '@/lib/final-items';
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

const ownerConfig: Record<FinalItem['owner'], { label: string; icon: typeof User; color: string }> = {
  jordan: { label: 'Jordan', icon: User, color: 'text-warm-gold' },
  alfred: { label: 'Alfred', icon: Bot, color: 'text-brand-blue-light' },
  both: { label: 'Both', icon: UsersIcon, color: 'text-text-secondary' },
};

const categoryColor: Record<FinalItem['category'], string> = {
  data: 'bg-brand-blue/20 text-brand-blue-light',
  integration: 'bg-purple-500/20 text-purple-400',
  config: 'bg-warm-gold/20 text-warm-gold',
};

export default function TargetsPage() {
  const [targets, setTargets] = useState<TargetItem[]>(initialTargets.map(t => ({ ...t })));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [activeTab, setActiveTab] = useState<'targets' | 'final'>('targets');
  const [items] = useState<FinalItem[]>(initialFinalItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const showFinalTab = !getAllDone(items);
  const pendingCount = getPendingCount(items);

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
  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

  const pendingItems = items.filter(i => i.status !== 'done');
  const doneItems = items.filter(i => i.status === 'done');
  const jordanItems = items.filter(i => (i.owner === 'jordan' || i.owner === 'both') && i.status !== 'done');
  const alfredItems = items.filter(i => (i.owner === 'alfred' || i.owner === 'both') && i.status !== 'done');

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h2 className="text-lg font-semibold">Targets & Goals</h2>
        <p className="text-sm text-text-secondary mt-1">
          Set what <strong className="text-text-primary">should</strong> happen — goals, gaps, and recommendations.
          The Dashboard shows what <em>is</em> happening. This page tracks where you want to be.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('targets')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'targets'
              ? 'border-brand-blue-light text-brand-blue-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Monthly Targets
        </button>
        {showFinalTab && (
          <button
            onClick={() => setActiveTab('final')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'final'
                ? 'border-danger text-danger'
                : 'border-transparent text-danger/70 hover:text-danger'
            }`}
          >
            <AlertTriangle size={14} />
            Final Items
            <span className="bg-danger/20 text-danger text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          </button>
        )}
      </div>

      {/* ─── TARGETS TAB ─── */}
      {activeTab === 'targets' && (
        <>
          {/* Set Monthly Targets Section */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Monthly Targets — Click any target value to edit</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {targets.map((t, idx) => {
                const status = getStatus(t.actual, t.target, t.inverse);
                const progress = t.inverse
                  ? Math.min((t.target / t.actual) * 100, 100)
                  : Math.min((t.actual / t.target) * 100, 100);
                const isEditing = editingIdx === idx;

                return (
                  <div key={t.metric} className="bg-bg-elevated rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-xs text-text-secondary font-medium">
                        {t.metric} <InfoTooltip metric={t.metric} />
                      </div>
                      <span className={`w-2 h-2 rounded-full ${
                        status === 'green' ? 'bg-success' : status === 'yellow' ? 'bg-warm-gold' : 'bg-danger'
                      }`} />
                    </div>

                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-lg font-bold text-text-primary">{formatValue(t.actual, t.unit)}</span>
                      <span className="text-xs text-text-secondary">/</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                            className="w-20 bg-bg-primary border border-warm-gold rounded px-2 py-0.5 text-xs text-text-primary outline-none"
                            autoFocus
                          />
                          <button onClick={saveEdit} className="text-success"><Check size={12} /></button>
                          <button onClick={cancelEdit} className="text-danger"><X size={12} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(idx)}
                          className="flex items-center gap-1 text-xs text-text-secondary hover:text-warm-gold transition-colors group"
                        >
                          {formatValue(t.target, t.unit)}
                          <Pencil size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>

                    <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === 'green' ? 'bg-success' : status === 'yellow' ? 'bg-warm-gold' : 'bg-danger'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-text-secondary">{progress.toFixed(0)}%</span>
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
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-bg-surface border border-border rounded-lg p-5">
              <h3 className="text-sm font-medium text-text-secondary mb-4">Revenue: Actual vs Target</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={targetTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000000).toFixed(1)}M`} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="cm3" name="Actual CM3" stroke="#A855F7" strokeWidth={2} dot={{ fill: '#A855F7', r: 3 }} />
                  <Line type="monotone" dataKey="cm3Target" name="Target" stroke="#64748B" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gap Analysis Table */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-text-primary mb-4">Gap Analysis <InfoTooltip metric="Target Pace" /></h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-secondary uppercase">
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
                    const isInverse = !!t.inverse;
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

          <AISuggestionsPanel suggestions={targetAISuggestions} title="Target Intelligence" />
        </>
      )}

      {/* ─── FINAL ITEMS TAB ─── */}
      {activeTab === 'final' && (
        <>
          {/* Intro */}
          <div className="bg-danger/5 border border-danger/20 rounded-lg p-4">
            <p className="text-sm text-text-primary">
              <strong className="text-danger">Everything below needs to happen before go-live.</strong>{' '}
              Click any item to see exactly what to do. Most items just need you to send Alfred an API key or share access. Once everything is done, this tab disappears.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-bg-surface border border-danger/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-danger" />
                <span className="text-xs font-medium text-danger">Total Pending</span>
              </div>
              <span className="text-2xl font-bold text-danger">{pendingCount}</span>
              <p className="text-[10px] text-text-tertiary mt-1">items before go-live</p>
            </div>
            <div className="bg-bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <User size={14} className="text-warm-gold" />
                <span className="text-xs font-medium text-warm-gold">Waiting on Jordan</span>
              </div>
              <span className="text-2xl font-bold text-text-primary">{jordanItems.length}</span>
              <p className="text-[10px] text-text-tertiary mt-1">send access or info to Alfred</p>
            </div>
            <div className="bg-bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Bot size={14} className="text-brand-blue-light" />
                <span className="text-xs font-medium text-brand-blue-light">On Alfred</span>
              </div>
              <span className="text-2xl font-bold text-text-primary">{alfredItems.length}</span>
              <p className="text-[10px] text-text-tertiary mt-1">Alfred handles once access is granted</p>
            </div>
          </div>

          {/* Expandable Items List */}
          <div className="bg-bg-surface border border-danger/20 rounded-lg p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-danger flex items-center gap-2">
                <AlertTriangle size={14} />
                What&apos;s Needed
              </h3>
              <span className="text-[10px] text-text-tertiary hidden sm:block">Click an item for instructions</span>
            </div>

            <div className="space-y-2">
              {pendingItems.map((item) => {
                const isExpanded = expandedId === item.id;
                const { label: ownerName, icon: OwnerIcon, color: ownerColor } = ownerConfig[item.owner];

                return (
                  <div
                    key={item.id}
                    className={`bg-bg-elevated rounded-lg border transition-all ${
                      isExpanded ? 'border-danger/40' : 'border-border/50 hover:border-border'
                    }`}
                  >
                    {/* Header row — always visible */}
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <div className="shrink-0">
                        {isExpanded
                          ? <ChevronDown size={14} className="text-danger" />
                          : <ChevronRight size={14} className="text-text-tertiary" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">{item.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${categoryColor[item.category]}`}>
                            {item.category}
                          </span>
                        </div>
                        {!isExpanded && (
                          <p className="text-xs text-text-tertiary mt-0.5 truncate">{item.why}</p>
                        )}
                      </div>

                      {/* Owner badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <OwnerIcon size={12} className={ownerColor} />
                        <span className={`text-[10px] font-medium ${ownerColor} hidden sm:inline`}>
                          {ownerName}
                        </span>
                      </div>

                      {/* Pages unlocked */}
                      <div className="hidden md:flex items-center gap-1 shrink-0">
                        {item.pages.slice(0, 2).map(page => (
                          <span key={page} className="text-[9px] bg-bg-surface px-1.5 py-0.5 rounded text-text-tertiary">
                            {page}
                          </span>
                        ))}
                        {item.pages.length > 2 && (
                          <span className="text-[9px] text-text-tertiary">+{item.pages.length - 2}</span>
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-border/30 mx-4 mb-0">
                        {/* Why this matters */}
                        <div className="mt-3 mb-4">
                          <p className="text-xs text-text-secondary">{item.why}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[10px] text-text-tertiary">Unlocks:</span>
                            {item.pages.map(page => (
                              <span key={page} className="text-[10px] bg-brand-blue/10 text-brand-blue-light px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ExternalLink size={8} />
                                {page}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action options */}
                        <div className="space-y-3">
                          {item.actions.map((action, actionIdx) => (
                            <div key={actionIdx} className="bg-bg-surface rounded-lg p-3 border border-border/50">
                              <h4 className="text-xs font-semibold text-text-primary mb-2">{action.label}</h4>
                              <ol className="space-y-1.5">
                                {action.steps.map((step, stepIdx) => (
                                  <li key={stepIdx} className="flex items-start gap-2 text-xs text-text-secondary">
                                    <span className="shrink-0 w-4 h-4 rounded-full bg-brand-blue/15 text-brand-blue-light text-[10px] font-bold flex items-center justify-center mt-0.5">
                                      {stepIdx + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Done items */}
            {doneItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <h4 className="text-xs text-success font-medium mb-2">✓ Completed</h4>
                {doneItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-1.5 opacity-50">
                    <div className="w-3 h-3 rounded-full bg-success/30 border-2 border-success flex items-center justify-center">
                      <Check size={8} className="text-success" />
                    </div>
                    <span className="text-xs text-text-secondary line-through">{item.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
