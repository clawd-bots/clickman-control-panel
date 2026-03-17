'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';

import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import {
  creativePerformance, creativeAISuggestions,
  accountControlData, adChurnData, creativeChurnCohorts,
  productionSlugging, demographicsAge, demographicsGender, demographicsGenderAge,
} from '@/lib/sample-data';
import { formatCurrency } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ReferenceLine, ZAxis, Legend,
  AreaChart, Area, LineChart, Line, ComposedChart,
} from 'recharts';

const tabs = ['Performance', 'Ad Churn', 'Account Control', 'Top Creatives', 'Creative Launches', 'Pareto', 'Campaign Spend', 'Y/Y Comp', 'Demographics'];
const platforms = ['All', 'Meta', 'Google', 'TikTok', 'Reddit'];

const tabDescriptions: Record<string, string> = {
  'Performance': 'Overview of all active ad creatives with spend, engagement, and conversion metrics. Use this to monitor your live ads and spot issues quickly.',
  'Ad Churn': 'Shows how ad spend is distributed across creative age brackets. Dark = newest ads, lighter = older. A healthy account has a steady flow of new creative taking over. If 100% reliant on old ads, you\'re fragile. If you never retest old winners, you\'re leaving money on the table.',
  'Account Control': 'Scatter plot of CPA vs Spend per ad. Bottom-right = winners scaling efficiently. Top-right = "zombies" burning budget. The horizontal line is your CPA target. The vertical line separates testing from scaled ads.',
  'Top Creatives': 'Production & Slugging Rate , tracks your "at bats" vs "hits." Bars show ads launched per month. Dark sections show how many actually scaled. If you launch many ads and none scale, you have a creative strategy problem, not a media buying problem.',
  'Creative Launches': 'Creative Churn by Cohort. Each color = a cohort of ads launched in the same month. Newer cohorts (darker) should take over spend from older ones. If old cohorts still dominate, creative fatigue is building and performance will decline.',
  'Pareto': 'The 80/20 principle applied to ad creatives. Usually 20% of creatives drive 80% of results. Use this to identify your winners and stop spreading budget too thin.',
  'Campaign Spend': 'Budget allocation and spend pacing across campaigns. Spot under/over-spending vs. daily budget to optimize delivery.',
  'Y/Y Comp': 'Year-over-year comparison of creative performance. Identifies seasonal trends and long-term creative health.',
  'Demographics': 'Are you producing for the audience that is actually buying? If women 25-34 drive your profit but you keep producing TikTok-style ads for Gen Z, you\'re burning cash. Align your production queue with your paying demographic.',
};

const attributionModels = ['Linear All', 'Linear Paid', 'First Click', 'Last Click', 'Triple Attribution (No Views)'];
const attributionWindows = ['1-day click', '7-day click / 1-day view', '28-day click / 1-day view', '28-day click / 28-day view'];

// Zone colors for account control scatter
const zoneColors: Record<string, string> = { scaling: '#10B981', zombie: '#EF4444', testing: '#4A6BD6', untapped: '#EDBF63' };
const zoneLabels: Record<string, string> = { scaling: 'Scaling (Winners)', zombie: 'Zombies (Kill)', testing: 'Testing', untapped: 'Untapped Winners' };

// Churn age colors (dark → light for new → old)
const churnAgeColors = ['#1e3a5f', '#2563EB', '#4A6BD6', '#6B8DE8', '#93B4F5', '#C5D8FB'];
const churnAgeKeys = ['Last 7 Days', '8-14 Days', '15-30 Days', '31-90 Days', '91-180 Days', '180+ Days'];

// Cohort colors (light = old → dark = new)
const cohortColors = { oct: '#C5D8FB', nov: '#93B4F5', dec: '#6B8DE8', jan: '#4A6BD6', feb: '#2563EB', mar: '#1e3a5f' };
const cohortKeys = ['oct', 'nov', 'dec', 'jan', 'feb', 'mar'] as const;
const cohortLabels: Record<string, string> = { oct: 'Oct Creatives', nov: 'Nov Creatives', dec: 'Dec Creatives', jan: 'Jan Creatives', feb: 'Feb Creatives', mar: 'Mar Creatives' };

// Demographics stacked area colors
const demoKeys = ['F 18-24', 'F 25-34', 'F 35-44', 'F 45-54', 'F 55+', 'M 18-24', 'M 25-34', 'M 35-44', 'M 45-54', 'M 55+'];
const demoColors = ['#fca5a5', '#ef4444', '#dc2626', '#b91c1c', '#7f1d1d', '#93c5fd', '#3b82f6', '#2563eb', '#1d4ed8', '#1e3a8a'];

export default function CreativePage() {
  const [activeTab, setActiveTab] = useState('Performance');
  const [platform, setPlatform] = useState('All');
  const [attrModel, setAttrModel] = useState('Data-Driven');
  const [attrWindow, setAttrWindow] = useState('7-day click / 1-day view');

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

  const totalSlugging = productionSlugging.reduce((a, b) => ({ launched: a.launched + b.launched, hits: a.hits + b.hits }), { launched: 0, hits: 0 });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-1">
        <h2 className="text-lg sm:text-xl font-semibold">Creative & MTA Control Panel</h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-1.5 flex-wrap px-1">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-w-0 ${activeTab === tab ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
            <span className="truncate">{tab}</span>
          </button>
        ))}
      </div>

      {/* Tab Description */}
      <div className="bg-bg-surface border border-border rounded-lg px-4 py-3 mx-1">
        <p className="text-sm text-text-secondary leading-relaxed">{tabDescriptions[activeTab]}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mx-1">
        {/* Platform controls - hide for Production & Slugging and Ad Churn */}
        {!['Top Creatives', 'Ad Churn'].includes(activeTab) && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary font-medium shrink-0">Platform:</span>
            <div className="flex gap-1 flex-wrap">
              {platforms.map(p => (
                <button key={p} onClick={() => setPlatform(p)} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${platform === p ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Attribution controls - hide for Production & Slugging and Ad Churn */}
        {!['Top Creatives', 'Ad Churn'].includes(activeTab) && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium shrink-0">Model:</span>
              <div className="relative">
                <select value={attrModel} onChange={(e) => setAttrModel(e.target.value)} className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors">
                  {attributionModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium shrink-0">Window:</span>
              <div className="relative">
                <select value={attrWindow} onChange={(e) => setAttrWindow(e.target.value)} className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors">
                  {attributionWindows.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════ PERFORMANCE TAB ═══════════════════════ */}
      {activeTab === 'Performance' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary">Creative Performance</h3>
          </div>
          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <div className="min-w-[900px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-secondary uppercase">
                    <th className="text-left py-2 px-2 font-medium min-w-[150px]">Creative</th>
                    <th className="text-left py-2 px-2 font-medium min-w-[70px]">Platform</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[70px]">Spend</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[60px]">Impr.</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[50px]">CTR</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[60px]">CPC</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[50px]">Conv.</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[70px]">
                      <div className="flex items-center justify-end gap-1">
                        <span>CPA</span>
                        <InfoTooltip metric="nCAC" />
                      </div>
                    </th>
                    <th className="text-right py-2 px-2 font-medium min-w-[70px]">
                      <div className="flex items-center justify-end gap-1">
                        <span>ROAS</span>
                        <InfoTooltip metric="ROAS" />
                      </div>
                    </th>
                    <th className="text-center py-2 px-2 font-medium min-w-[60px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.name} className="border-b border-border/30 hover:bg-bg-elevated/50 transition-colors">
                      <td className="py-2.5 px-2 font-medium text-text-primary max-w-[200px] truncate">{row.name}</td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${row.platform === 'Meta' ? 'bg-brand-blue/15 text-brand-blue-light' : row.platform === 'Google' ? 'bg-warm-gold/15 text-warm-gold' : 'bg-success/15 text-success'}`}>{row.platform}</span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{formatCurrency(row.spend)}</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{(row.impressions / 1000).toFixed(0)}K</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{row.ctr.toFixed(2)}%</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{formatCurrency(row.cpc)}</td>
                      <td className="py-2.5 px-2 text-right text-text-primary font-medium">{row.conversions}</td>
                      <td className="py-2.5 px-2 text-right"><span className={row.cpa <= 700 ? 'text-success' : row.cpa <= 850 ? 'text-warm-gold' : 'text-danger'}>{formatCurrency(row.cpa)}</span></td>
                      <td className="py-2.5 px-2 text-right"><span className={row.roas >= 3.0 ? 'text-success' : row.roas >= 2.5 ? 'text-warm-gold' : 'text-danger'}>{row.roas.toFixed(2)}x</span></td>
                      <td className="py-2.5 px-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${row.status === 'Active' ? 'bg-success/15 text-success' : 'bg-warm-gold/15 text-warm-gold'}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ ACCOUNT CONTROL (Scatter Plot) ═══════════════════════ */}
      {activeTab === 'Account Control' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <span className="truncate">Account Control , CPA vs Spend</span>
              <InfoTooltip metric="Account Control Chart" />
            </h3>
          </div>
          <div className="flex gap-2 sm:gap-4 mb-4 flex-wrap">
            {Object.entries(zoneLabels).map(([zone, label]) => (
              <div key={zone} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: zoneColors[zone] }} />
                <span className="text-xs text-text-secondary truncate">{label}</span>
              </div>
            ))}
          </div>
          <div className="min-h-[320px] sm:min-h-[420px]" style={{ width: '100%', height: '420px' }}>
            <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="number" dataKey="spend" name="Spend"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => v >= 1000 ? `₱${(v / 1000).toFixed(0)}K` : `₱${v}`}
                domain={[0, 60000]}
                label={{ value: 'Total Spend', position: 'insideBottom', offset: -10, style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }}
              />
              <YAxis
                type="number" dataKey="cpa" name="CPA"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => `₱${v}`}
                domain={[200, 1500]}
                label={{ value: 'CPA', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }}
              />
              <ZAxis type="number" range={[80, 200]} />
              <ReferenceLine y={787} stroke="#EF4444" strokeDasharray="6 4" strokeWidth={2} label={{ value: 'CPA Target ₱787', position: 'right', style: { fill: '#EF4444', fontSize: 10, fontWeight: 600 } }} />
              <ReferenceLine x={20000} stroke="var(--color-text-tertiary)" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Scale threshold', position: 'top', style: { fill: 'var(--color-text-tertiary)', fontSize: 10 } }} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any, props: any) => [
                  name === 'Spend' ? formatCurrency(Number(value)) : `₱${value}`, 
                  String(name)
                ]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(label: any, payload: any) => {
                  if (payload && payload[0] && payload[0].payload) {
                    return `${payload[0].payload.name} (click to view)`;
                  }
                  return '';
                }}
              />
              <Scatter 
                data={accountControlData} 
                name="Ads"
                onClick={(data) => {
                  if (data && data.payload && data.payload.previewUrl) {
                    window.open(data.payload.previewUrl, '_blank');
                  }
                }}
              >
                {accountControlData.map((entry, i) => (
                  <Cell 
                    key={i} 
                    fill={zoneColors[entry.zone]} 
                    fillOpacity={0.85} 
                    stroke={zoneColors[entry.zone]} 
                    strokeWidth={1}
                    className="cursor-pointer hover:opacity-75 transition-opacity"
                  />
                ))}
              </Scatter>
            </ScatterChart>
            </ResponsiveContainer>
          </div>
          {/* Quadrant labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="bg-success/5 border border-success/20 rounded-lg p-3">
              <div className="text-xs font-medium text-success mb-1">↘ Bottom-Right: Scaling</div>
              <div className="text-xs text-text-secondary">High spend, low CPA. Your proven winners. Scale these harder.</div>
            </div>
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-3">
              <div className="text-xs font-medium text-danger mb-1">↗ Top-Right: Zombies</div>
              <div className="text-xs text-text-secondary">High spend, high CPA. Wasting budget. Kill or restructure immediately.</div>
            </div>
            <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-lg p-3">
              <div className="text-xs font-medium text-brand-blue-light mb-1">↙ Bottom-Left: Testing</div>
              <div className="text-xs text-text-secondary">Low spend, low CPA. Promising tests. Scale up to confirm they hold.</div>
            </div>
            <div className="bg-warm-gold/5 border border-warm-gold/20 rounded-lg p-3">
              <div className="text-xs font-medium text-warm-gold mb-1">↖ Top-Left: Untapped / Learning</div>
              <div className="text-xs text-text-secondary">Low spend, high CPA. Still in learning phase or needs new creative approach.</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ AD CHURN (Stacked Bar by Age) ═══════════════════════ */}
      {activeTab === 'Ad Churn' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <span className="truncate">Churn & Retesting Control , Spend by Creative Age</span>
              <InfoTooltip metric="Ad Churn" />
            </h3>
          </div>
          <div className="flex gap-2 sm:gap-3 mb-4 flex-wrap">
            {churnAgeKeys.map((key, i) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: churnAgeColors[i] }} />
                <span className="text-xs text-text-secondary truncate">{key}</span>
              </div>
            ))}
          </div>
          <div className="min-h-[320px] sm:min-h-[380px]" style={{ width: '100%', height: '380px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adChurnData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: any, name: any) => [formatCurrency(value), name]}
                />
                <Bar dataKey="Last 7 Days" stackId="churn" fill="#1e3a5f" />
                <Bar dataKey="8-14 Days" stackId="churn" fill="#2563EB" />
                <Bar dataKey="15-30 Days" stackId="churn" fill="#4A6BD6" />
                <Bar dataKey="31-90 Days" stackId="churn" fill="#6B8DE8" />
                <Bar dataKey="91-180 Days" stackId="churn" fill="#93B4F5" />
                <Bar dataKey="180+ Days" stackId="churn" fill="#C5D8FB" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 bg-bg-elevated border border-border rounded-lg p-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              <span className="font-medium text-text-primary">Reading this chart:</span> Dark bars = newest ads (last 7 days). Lighter bars = older ads.
              A healthy account shows new creative steadily taking over spend from older creative.
              If the lightest bars (180+ days) dominate, you're running on legacy creative and vulnerable to fatigue.
              March shows a positive trend , new creative (dark) is gaining share.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════ CREATIVE LAUNCHES (Creative Churn Cohorts) ═══════════════════════ */}
      {activeTab === 'Creative Launches' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <span className="truncate">Creative Churn , Spend by Launch Cohort</span>
              <InfoTooltip metric="Creative Churn Cohorts" />
            </h3>
          </div>
          <div className="flex gap-2 sm:gap-3 mb-4 flex-wrap">
            {cohortKeys.map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: cohortColors[key] }} />
                <span className="text-xs text-text-secondary truncate">{cohortLabels[key]}</span>
              </div>
            ))}
          </div>
          <div className="min-h-[320px] sm:min-h-[380px]" style={{ width: '100%', height: '380px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={creativeChurnCohorts} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="week" tick={{ fill: 'var(--color-text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: any, name: any) => [value > 0 ? formatCurrency(value) : ',', cohortLabels[name] || name]}
                />
                <Area type="monotone" dataKey="oct" stackId="cohort" fill="#C5D8FB" stroke="#C5D8FB" fillOpacity={0.85} />
                <Area type="monotone" dataKey="nov" stackId="cohort" fill="#93B4F5" stroke="#93B4F5" fillOpacity={0.85} />
                <Area type="monotone" dataKey="dec" stackId="cohort" fill="#6B8DE8" stroke="#6B8DE8" fillOpacity={0.85} />
                <Area type="monotone" dataKey="jan" stackId="cohort" fill="#4A6BD6" stroke="#4A6BD6" fillOpacity={0.85} />
                <Area type="monotone" dataKey="feb" stackId="cohort" fill="#2563EB" stroke="#2563EB" fillOpacity={0.85} />
                <Area type="monotone" dataKey="mar" stackId="cohort" fill="#1e3a5f" stroke="#1e3a5f" fillOpacity={0.85} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 bg-bg-elevated border border-border rounded-lg p-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              <span className="font-medium text-text-primary">Key insight:</span> Watch how darker (newer) cohorts take over spend from lighter (older) ones.
              This is healthy creative rotation. If old cohorts still dominate spend, creative fatigue is building and performance will decline.
              This chart is the most critical for forecasting future performance.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════ TOP CREATIVES (Production & Slugging Rate) ═══════════════════════ */}
      {activeTab === 'Top Creatives' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <span className="truncate">Production & Slugging Rate</span>
              <InfoTooltip metric="Production Rate" />
            </h3>
          </div>
          <div className="flex gap-2 sm:gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-brand-blue/30 shrink-0" />
              <span className="text-xs text-text-secondary">Launched (didn't scale)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#1e3a5f' }} />
              <span className="text-xs text-text-secondary">Hits (scaled profitably)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-warm-gold shrink-0" />
              <span className="text-xs text-text-secondary">Hit Rate %</span>
            </div>
          </div>
          <div className="min-h-[320px] sm:min-h-[380px]" style={{ width: '100%', height: '380px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={productionSlugging} margin={{ top: 20, right: 40, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} label={{ value: 'Ads', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 50]} label={{ value: 'Hit Rate', angle: 90, position: 'insideRight', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: any, name: any) => {
                    if (name === 'hitRate') return [`${value.toFixed(1)}%`, 'Hit Rate'];
                    if (name === 'hits') return [value, 'Hits (Scaled)'];
                    return [value, 'Total Launched'];
                  }}
                />
                <Bar yAxisId="left" dataKey="launched" name="launched" fill="#4A6BD6" fillOpacity={0.25} radius={[3, 3, 0, 0]} />
                <Bar yAxisId="left" dataKey="hits" name="hits" fill="#1e3a5f" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="hitRate" name="hitRate" stroke="#EDBF63" strokeWidth={2.5} dot={{ fill: '#EDBF63', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="bg-bg-elevated border border-border rounded-lg p-3 text-center">
              <div className="text-xs text-text-secondary mb-1">Total Launched</div>
              <div className="text-xl font-bold text-text-primary">{totalSlugging.launched}</div>
            </div>
            <div className="bg-bg-elevated border border-border rounded-lg p-3 text-center">
              <div className="text-xs text-text-secondary mb-1">Total Hits</div>
              <div className="text-xl font-bold text-success">{totalSlugging.hits}</div>
            </div>
            <div className="bg-bg-elevated border border-border rounded-lg p-3 text-center">
              <div className="text-xs text-text-secondary mb-1">Overall Slugging Rate</div>
              <div className="text-xl font-bold text-warm-gold">{((totalSlugging.hits / totalSlugging.launched) * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ PARETO ═══════════════════════ */}
      {activeTab === 'Pareto' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <h3 className="text-sm font-medium text-text-secondary mb-4 flex items-center gap-2">
            <span>Pareto Distribution</span>
            <InfoTooltip metric="Pareto" />
          </h3>
          <div className="min-h-[320px]">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={paretoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={80} />
                <YAxis 
                  yAxisId="left" 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                  label={{ value: 'Conversions', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} 
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                  domain={[0, 100]} 
                  tickFormatter={v => `${v}%`} 
                  label={{ value: 'Cumulative %', angle: 90, position: 'insideRight', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} 
                />
                <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="conversions" name="Conversions" fill="#4A6BD6" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="right" dataKey="cumPct" name="Cumulative %" fill="#EDBF63" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════════════ DEMOGRAPHICS ═══════════════════════ */}
      {activeTab === 'Demographics' && (
        <div className="space-y-4 sm:space-y-6 mx-1">
          {/* Age Group Performance */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
              <span>Performance by Age Group</span>
              <InfoTooltip metric="Demographics Analysis" />
            </h3>
            <div className="space-y-3">
              {demographicsAge.map((row) => (
                <div key={row.group} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-12 text-xs text-text-secondary font-medium shrink-0">{row.group}</div>
                  <div className="flex-1 h-8 bg-bg-elevated rounded-md overflow-hidden relative min-w-0">
                    <div
                      className="h-full rounded-md transition-all"
                      style={{
                        width: `${(row.conversions / 248) * 100}%`,
                        backgroundColor: row.cpa <= 700 ? '#10B981' : row.cpa <= 800 ? '#EDBF63' : '#EF4444',
                        opacity: 0.8,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 sm:px-3 justify-between">
                      <span className="text-xs font-medium text-text-primary truncate">{row.conversions} conv.</span>
                      <span className={`text-xs font-medium shrink-0 ${row.cpa <= 700 ? 'text-success' : row.cpa <= 800 ? 'text-warm-gold' : 'text-danger'}`}>₱{row.cpa} CPA</span>
                    </div>
                  </div>
                  <div className="w-12 sm:w-16 text-right text-xs text-text-secondary shrink-0">{row.roas.toFixed(2)}x</div>
                </div>
              ))}
            </div>
          </div>

          {/* Gender Breakdown */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <h3 className="text-sm font-medium text-text-primary mb-4">Performance by Gender</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {demographicsGender.map((row) => (
                <div key={row.gender} className="bg-bg-elevated border border-border rounded-lg p-4">
                  <div className="text-sm font-medium text-text-primary mb-3">{row.gender}</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-text-secondary">Spend</span><span className="text-text-primary font-medium">{formatCurrency(row.spend)}</span></div>
                    <div className="flex justify-between"><span className="text-text-secondary">Conversions</span><span className="text-text-primary font-medium">{row.conversions} ({row.pctConversions}%)</span></div>
                    <div className="flex justify-between"><span className="text-text-secondary">CPA</span><span className={row.cpa <= 700 ? 'text-success font-medium' : row.cpa <= 800 ? 'text-warm-gold font-medium' : 'text-danger font-medium'}>₱{row.cpa}</span></div>
                    <div className="flex justify-between"><span className="text-text-secondary">ROAS</span><span className={row.roas >= 3.0 ? 'text-success font-medium' : 'text-warm-gold font-medium'}>{row.roas.toFixed(2)}x</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gender+Age Stacked Area over time */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <h3 className="text-sm font-medium text-text-primary mb-2">Spend by Gender & Age Over Time</h3>
            <div className="flex gap-1 sm:gap-2 mb-4 flex-wrap">
              {demoKeys.map((key, i) => (
                <div key={key} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: demoColors[i] }} />
                  <span className="text-[10px] text-text-secondary">{key}</span>
                </div>
              ))}
            </div>
            <div className="min-h-[320px]" style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demographicsGenderAge} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="week" tick={{ fill: 'var(--color-text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" height={60} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }}
                    formatter={(value: any, name: any) => [formatCurrency(value), name]}
                  />
                  <Area type="monotone" dataKey="F 18-24" stackId="demo" fill="#fca5a5" stroke="#fca5a5" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="F 25-34" stackId="demo" fill="#ef4444" stroke="#ef4444" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="F 35-44" stackId="demo" fill="#dc2626" stroke="#dc2626" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="F 45-54" stackId="demo" fill="#b91c1c" stroke="#b91c1c" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="F 55+" stackId="demo" fill="#7f1d1d" stroke="#7f1d1d" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="M 18-24" stackId="demo" fill="#93c5fd" stroke="#93c5fd" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="M 25-34" stackId="demo" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="M 35-44" stackId="demo" fill="#2563eb" stroke="#2563eb" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="M 45-54" stackId="demo" fill="#1d4ed8" stroke="#1d4ed8" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="M 55+" stackId="demo" fill="#1e3a8a" stroke="#1e3a8a" fillOpacity={0.85} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insight callout */}
          <div className="bg-success/5 border border-success/20 rounded-lg p-4">
            <div className="text-xs font-medium text-success mb-1">💡 Key Insight</div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Women 25-44 drive 62% of conversions at the lowest CPA (₱613-656 vs ₱724-1250 for other segments).
              This is your core buying demographic. Align creative production to this audience , if you're producing TikTok-style Gen Z content
              but your buyers are 25-44 women, you're misallocating resources.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════ OTHER TABS (Placeholder) ═══════════════════════ */}
      {!['Performance', 'Pareto', 'Account Control', 'Ad Churn', 'Creative Launches', 'Top Creatives', 'Demographics'].includes(activeTab) && (
        <div className="bg-bg-surface border border-border rounded-lg p-8 sm:p-12 text-center mx-1">
          <div className="text-text-secondary text-sm">{activeTab} view</div>
          <div className="text-text-secondary text-xs mt-1">Data will populate when connected to live sources</div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mx-1">
        {[
          { label: 'Total Spend', value: formatCurrency(filtered.reduce((s, c) => s + c.spend, 0)) },
          { label: 'Total Conversions', value: filtered.reduce((s, c) => s + c.conversions, 0).toLocaleString() },
          { label: 'Blended CPA', value: formatCurrency(filtered.reduce((s, c) => s + c.spend, 0) / filtered.reduce((s, c) => s + c.conversions, 0)) },
          { label: 'Blended ROAS', value: `${(filtered.reduce((s, c) => s + c.roas * c.spend, 0) / filtered.reduce((s, c) => s + c.spend, 0)).toFixed(2)}x` },
        ].map((card) => (
          <div key={card.label} className="bg-bg-surface border border-border rounded-lg p-4 min-h-[80px] flex flex-col justify-between">
            <div className="text-xs text-text-secondary mb-1">{card.label}</div>
            <div className="text-lg sm:text-xl font-bold text-text-primary truncate">{card.value}</div>
          </div>
        ))}
      </div>

      {/* AI Suggestions */}
      <div className="px-1">
        <AISuggestionsPanel 
          suggestions={creativeAISuggestions} 
          title="Creative Intelligence"
          attributionModel={attrModel}
          attributionWindow={attrWindow}
        />
      </div>
    </div>
  );
}
