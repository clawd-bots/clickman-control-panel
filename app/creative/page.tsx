'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import ExportButton from '@/components/ui/ExportButton';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { creativePerformance, creativeAISuggestions } from '@/lib/sample-data';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const tabs = ['Performance', 'Ad Churn', 'Account Control', 'Top Creatives', 'Creative Launches', 'Pareto', 'Campaign Spend', 'Y/Y Comp', 'Demographics'];
const platforms = ['All', 'Meta', 'Google', 'TikTok', 'Reddit'];
const attributionWindows = ['1d Click', '7d Click', '7d Click + 1d View', '28d Click'];

export default function CreativePage() {
  const [activeTab, setActiveTab] = useState('Performance');
  const [platform, setPlatform] = useState('All');
  const [window, setWindow] = useState('7d Click');

  const filtered = platform === 'All'
    ? creativePerformance
    : creativePerformance.filter(c => c.platform === platform);

  const paretoData = [...creativePerformance]
    .sort((a, b) => b.conversions - a.conversions)
    .map((c, i) => ({
      name: c.name.slice(0, 20),
      conversions: c.conversions,
      cumPct: 0,
    }));
  let total = paretoData.reduce((s, c) => s + c.conversions, 0);
  let cum = 0;
  paretoData.forEach(d => { cum += d.conversions; d.cumPct = Math.round((cum / total) * 100); });

  return (
    <div className="space-y-6 max-w-[1400px]">
      <h2 className="text-lg font-semibold">Creative & MTA Control Panel</h2>

      {/* Tab Navigation */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-tertiary hover:text-text-secondary'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">Platform:</span>
          <div className="flex gap-1">
            {platforms.map(p => (
              <button key={p} onClick={() => setPlatform(p)} className={`px-2.5 py-1 rounded-md text-xs ${platform === p ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-tertiary hover:text-text-secondary'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">Window:</span>
          <div className="flex gap-1">
            {attributionWindows.map(w => (
              <button key={w} onClick={() => setWindow(w)} className={`px-2.5 py-1 rounded-md text-xs ${window === w ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-tertiary hover:text-text-secondary'}`}>
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Table (default tab) */}
      {activeTab === 'Performance' && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary">Creative Performance</h3>
            <ExportButton />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-text-tertiary uppercase">
                  <th className="text-left py-2 px-2 font-medium">Creative</th>
                  <th className="text-left py-2 px-2 font-medium">Platform</th>
                  <th className="text-right py-2 px-2 font-medium">Spend</th>
                  <th className="text-right py-2 px-2 font-medium">Impr.</th>
                  <th className="text-right py-2 px-2 font-medium">CTR</th>
                  <th className="text-right py-2 px-2 font-medium">CPC</th>
                  <th className="text-right py-2 px-2 font-medium">Conv.</th>
                  <th className="text-right py-2 px-2 font-medium">CPA <InfoTooltip metric="nCAC" /></th>
                  <th className="text-right py-2 px-2 font-medium">ROAS <InfoTooltip metric="ROAS" /></th>
                  <th className="text-center py-2 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.name} className="border-b border-border/30 hover:bg-bg-elevated/50 transition-colors">
                    <td className="py-2.5 px-2 font-medium text-text-primary max-w-[200px] truncate">{row.name}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        row.platform === 'Meta' ? 'bg-brand-blue/15 text-brand-blue-light' :
                        row.platform === 'Google' ? 'bg-warm-gold/15 text-warm-gold' :
                        'bg-success/15 text-success'
                      }`}>{row.platform}</span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-text-secondary">{formatCurrency(row.spend)}</td>
                    <td className="py-2.5 px-2 text-right text-text-secondary">{(row.impressions / 1000).toFixed(0)}K</td>
                    <td className="py-2.5 px-2 text-right text-text-secondary">{row.ctr.toFixed(2)}%</td>
                    <td className="py-2.5 px-2 text-right text-text-secondary">{formatCurrency(row.cpc)}</td>
                    <td className="py-2.5 px-2 text-right text-text-primary font-medium">{row.conversions}</td>
                    <td className="py-2.5 px-2 text-right">
                      <span className={row.cpa <= 700 ? 'text-success' : row.cpa <= 850 ? 'text-warm-gold' : 'text-danger'}>
                        {formatCurrency(row.cpa)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span className={row.roas >= 3.0 ? 'text-success' : row.roas >= 2.5 ? 'text-warm-gold' : 'text-danger'}>
                        {row.roas.toFixed(2)}x
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        row.status === 'Active' ? 'bg-success/15 text-success' : 'bg-warm-gold/15 text-warm-gold'
                      }`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pareto tab */}
      {activeTab === 'Pareto' && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-secondary mb-4">
            Pareto Distribution <InfoTooltip metric="Pareto" />
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={paretoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 9 }} angle={-30} textAnchor="end" height={80} />
              <YAxis yAxisId="left" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748B', fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: '#161927', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="conversions" name="Conversions" fill="#4A6BD6" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="cumPct" name="Cumulative %" fill="#E8C872" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Other tabs placeholder */}
      {!['Performance', 'Pareto'].includes(activeTab) && (
        <div className="bg-bg-surface border border-border rounded-lg p-12 text-center">
          <div className="text-text-tertiary text-sm">{activeTab} view</div>
          <div className="text-text-secondary text-xs mt-1">Data will populate when connected to live sources</div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Spend', value: formatCurrency(filtered.reduce((s, c) => s + c.spend, 0)) },
          { label: 'Total Conversions', value: filtered.reduce((s, c) => s + c.conversions, 0).toLocaleString() },
          { label: 'Blended CPA', value: formatCurrency(filtered.reduce((s, c) => s + c.spend, 0) / filtered.reduce((s, c) => s + c.conversions, 0)) },
          { label: 'Blended ROAS', value: `${(filtered.reduce((s, c) => s + c.roas * c.spend, 0) / filtered.reduce((s, c) => s + c.spend, 0)).toFixed(2)}x` },
        ].map((card) => (
          <div key={card.label} className="bg-bg-surface border border-border rounded-lg p-4">
            <div className="text-xs text-text-tertiary mb-1">{card.label}</div>
            <div className="text-xl font-bold text-text-primary">{card.value}</div>
          </div>
        ))}
      </div>

      {/* AI Suggestions */}
      <AISuggestionsPanel suggestions={creativeAISuggestions} title="Creative Intelligence" />
    </div>
  );
}
