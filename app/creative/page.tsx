'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import ExportButton from '@/components/ui/ExportButton';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { creativePerformance, creativeAISuggestions } from '@/lib/sample-data';
import { formatCurrency } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const tabs = ['Performance', 'Ad Churn', 'Account Control', 'Top Creatives', 'Creative Launches', 'Pareto', 'Campaign Spend', 'Y/Y Comp', 'Demographics'];
const platforms = ['All', 'Meta', 'Google', 'TikTok', 'Reddit'];

const tabDescriptions: Record<string, string> = {
  'Performance': 'Overview of all active ad creatives with spend, engagement, and conversion metrics. Use this to monitor your live ads and spot issues quickly.',
  'Ad Churn': 'Tracks how quickly your ad creatives lose effectiveness. High churn = you need more frequent creative refreshes. Low churn = your creative has longer legs.',
  'Account Control': 'Scatter plot of CPA vs Spend per ad. Helps identify which ads are efficient at scale vs. small-budget flukes. Top-right quadrant = expensive AND high spend = problem.',
  'Top Creatives': 'Ranked list of your best-performing ad creatives by ROAS and conversion volume. These are your proven winners — scale them.',
  'Creative Launches': 'Timeline of new creative launches and their initial performance signals. Track how quickly new ads ramp up.',
  'Pareto': 'The 80/20 principle applied to ad creatives. Usually 20% of creatives drive 80% of results. Use this to identify your winners and stop spreading budget too thin.',
  'Campaign Spend': 'Budget allocation and spend pacing across campaigns. Spot under/over-spending vs. daily budget to optimize delivery.',
  'Y/Y Comp': 'Year-over-year comparison of creative performance. Identifies seasonal trends and long-term creative health.',
  'Demographics': 'Audience demographic breakdown by age, gender, and location. Shows which segments convert best so you can refine targeting.',
};

const attributionModels = ['First Click', 'Last Click', 'Linear', 'Triple Attribution (No Views)', 'Data-Driven'];
const attributionWindows = ['1-Day Click', '7-Day Click', '14-Day Click', '28-Day Click', '7-Day Click + 1-Day View'];

export default function CreativePage() {
  const [activeTab, setActiveTab] = useState('Performance');
  const [platform, setPlatform] = useState('All');
  const [attrModel, setAttrModel] = useState('Data-Driven');
  const [attrWindow, setAttrWindow] = useState('7-Day Click');

  const filtered = platform === 'All'
    ? creativePerformance
    : creativePerformance.filter(c => c.platform === platform);

  const paretoData = [...creativePerformance]
    .sort((a, b) => b.conversions - a.conversions)
    .map((c) => ({
      name: c.name.slice(0, 20),
      conversions: c.conversions,
      cumPct: 0,
    }));
  const total = paretoData.reduce((s, c) => s + c.conversions, 0);
  let cum = 0;
  paretoData.forEach(d => { cum += d.conversions; d.cumPct = Math.round((cum / total) * 100); });

  return (
    <div className="space-y-6 max-w-[1400px]">
      <h2 className="text-lg font-semibold">Creative & MTA Control Panel</h2>

      {/* Tab Navigation */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Description */}
      <div className="bg-bg-surface border border-border rounded-lg px-4 py-3">
        <p className="text-sm text-text-secondary leading-relaxed">{tabDescriptions[activeTab]}</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-medium">Platform:</span>
          <div className="flex gap-1">
            {platforms.map(p => (
              <button key={p} onClick={() => setPlatform(p)} className={`px-2.5 py-1 rounded-md text-xs ${platform === p ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Attribution Model Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-medium">Model:</span>
          <div className="relative">
            <select
              value={attrModel}
              onChange={(e) => setAttrModel(e.target.value)}
              className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors"
            >
              {attributionModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          </div>
        </div>

        {/* Attribution Window Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-medium">Window:</span>
          <div className="relative">
            <select
              value={attrWindow}
              onChange={(e) => setAttrWindow(e.target.value)}
              className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors"
            >
              {attributionWindows.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
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
                <tr className="border-b border-border text-text-secondary uppercase">
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
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={80} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="conversions" name="Conversions" fill="#4A6BD6" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="cumPct" name="Cumulative %" fill="#EDBF63" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Other tabs placeholder */}
      {!['Performance', 'Pareto'].includes(activeTab) && (
        <div className="bg-bg-surface border border-border rounded-lg p-12 text-center">
          <div className="text-text-secondary text-sm">{activeTab} view</div>
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
            <div className="text-xs text-text-secondary mb-1">{card.label}</div>
            <div className="text-xl font-bold text-text-primary">{card.value}</div>
          </div>
        ))}
      </div>

      {/* AI Suggestions */}
      <AISuggestionsPanel suggestions={creativeAISuggestions} title="Creative Intelligence" />
    </div>
  );
}
