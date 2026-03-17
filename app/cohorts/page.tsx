'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { cohortRetention, clvExtension, productComparison, cohortAISuggestions } from '@/lib/sample-data';
import { getHeatmapClass } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function CohortsPage() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'comparison'>('analysis');
  const [metric, setMetric] = useState('Net Revenue');
  const [format, setFormat] = useState<'%' | '#'>('%');
  const [heatmap, setHeatmap] = useState(true);
  const [mode, setMode] = useState<'incremental' | 'accumulative'>('incremental');

  const maxRetention = Math.max(...cohortRetention.flatMap(c => c.periods.filter(p => p > 0 && p < 100)));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <h2 className="text-lg sm:text-xl font-semibold">Cohort Analysis & Retention</h2>
        <div className="flex gap-1">
          <button onClick={() => setActiveTab('analysis')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'analysis' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
            Cohort Analysis
          </button>
          <button onClick={() => setActiveTab('comparison')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'comparison' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
            Cohort Comparison
          </button>
        </div>
      </div>

      {activeTab === 'analysis' && (
        <>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mx-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium shrink-0">Metric:</span>
              <div className="flex gap-1">
                {['Net Revenue', 'Orders'].map(m => (
                  <button key={m} onClick={() => setMetric(m)} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${metric === m ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>{m}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium shrink-0">Mode:</span>
              <div className="flex gap-1">
                <button onClick={() => setMode('incremental')} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${mode === 'incremental' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>Incremental</button>
                <button onClick={() => setMode('accumulative')} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${mode === 'accumulative' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>Accumulative</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium shrink-0">Format:</span>
              <div className="flex gap-1">
                <button onClick={() => setFormat('%')} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${format === '%' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>%</button>
                <button onClick={() => setFormat('#')} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${format === '#' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>#</button>
              </div>
            </div>
          </div>

          {/* Cohort Table */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <span>Retention by Cohort</span>
                <InfoTooltip metric="Cohort" />
              </h3>
            </div>
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <div className="min-w-[900px]">
                <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-secondary uppercase">
                    <th className="text-left py-2 px-2 font-medium">Cohort</th>
                    <th className="text-right py-2 px-2 font-medium">New Cust.</th>
                    <th className="text-right py-2 px-2 font-medium">CAC <InfoTooltip metric="nCAC" /></th>
                    <th className="text-right py-2 px-2 font-medium">1st Order</th>
                    {['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'].map(p => (
                      <th key={p} className="text-right py-2 px-2 font-medium">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohortRetention.map((row) => (
                    <tr key={row.cohort} className="border-b border-border/30">
                      <td className="py-2.5 px-2 font-medium text-text-primary">{row.cohort}</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{row.customers}</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">₱{row.cac}</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">₱{row.firstOrder.toLocaleString()}</td>
                      {row.periods.map((val, i) => {
                        const displayVal = format === '%' ? `${val.toFixed(1)}%` : Math.round(row.customers * val / 100).toString();
                        const hClass = heatmap && val > 0 && val < 100 ? getHeatmapClass(val, maxRetention) : '';
                        return (
                          <td key={i} className={`py-2.5 px-2 text-right ${val === 0 ? 'text-text-tertiary' : val === 100 ? 'text-text-primary font-medium' : 'text-text-secondary'} ${hClass}`}>
                            {val > 0 ? displayVal : ','}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Average row */}
                  <tr className="border-t-2 border-border font-medium">
                    <td className="py-2.5 px-2 text-text-primary">Average</td>
                    <td className="py-2.5 px-2 text-right text-text-primary">{Math.round(cohortRetention.reduce((s, c) => s + c.customers, 0) / cohortRetention.length)}</td>
                    <td className="py-2.5 px-2 text-right text-text-primary">₱{Math.round(cohortRetention.reduce((s, c) => s + c.cac, 0) / cohortRetention.length)}</td>
                    <td className="py-2.5 px-2 text-right text-text-primary">₱{Math.round(cohortRetention.reduce((s, c) => s + c.firstOrder, 0) / cohortRetention.length).toLocaleString()}</td>
                    {[0, 1, 2, 3, 4, 5, 6].map(i => {
                      const vals = cohortRetention.map(c => c.periods[i]).filter(v => v > 0);
                      const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
                      return (
                        <td key={i} className="py-2.5 px-2 text-right text-text-primary">
                          {avg > 0 ? `${avg.toFixed(1)}%` : ','}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="px-1">
            <AISuggestionsPanel 
              suggestions={cohortAISuggestions} 
              title="Cohort Intelligence"
            />
          </div>
        </>
      )}

      {activeTab === 'comparison' && (
        <>
          {/* CLV Extension Chart */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
            <h3 className="text-sm font-medium text-text-secondary mb-4 flex items-center gap-2">
              <span>Customer Lifetime Value Extension</span>
              <InfoTooltip metric="CLV" />
            </h3>
            <div className="min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clvExtension} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}K`} />
                <YAxis dataKey="product" type="category" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => `₱${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="firstOrder" name="First Order" stackId="a" fill="#334FB4" />
                <Bar dataKey="clr90" name="90d CLR" stackId="a" fill="#4A6BD6" />
                <Bar dataKey="clr365" name="365d CLR" stackId="a" fill="#EDBF63" />
                <Bar dataKey="beyond365" name=">365d" stackId="a" fill="#34D399" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Product Comparison Table */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <span>Product Comparison</span>
                <InfoTooltip metric="Repeat Rate" />
              </h3>
            </div>
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <div className="min-w-[1000px]">
                <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-secondary uppercase">
                    <th className="text-left py-2 px-2 font-medium">Product</th>
                    <th className="text-right py-2 px-2 font-medium">Cust.</th>
                    <th className="text-right py-2 px-2 font-medium">Days</th>
                    <th className="text-right py-2 px-2 font-medium">2nd Order</th>
                    <th className="text-right py-2 px-2 font-medium">3rd Order</th>
                    <th className="text-right py-2 px-2 font-medium">4th Order</th>
                    <th className="text-right py-2 px-2 font-medium">Avg Ord</th>
                    <th className="text-right py-2 px-2 font-medium">30d</th>
                    <th className="text-right py-2 px-2 font-medium">60d</th>
                    <th className="text-right py-2 px-2 font-medium">90d</th>
                    <th className="text-right py-2 px-2 font-medium">180d</th>
                    <th className="text-right py-2 px-2 font-medium">365d</th>
                  </tr>
                </thead>
                <tbody>
                  {productComparison.map((row) => {
                    const maxRepeat = Math.max(...productComparison.map(p => p.r365));
                    return (
                      <tr key={row.product} className="border-b border-border/30 hover:bg-bg-elevated/50">
                        <td className="py-2.5 px-2 font-medium text-text-primary">{row.product}</td>
                        <td className="py-2.5 px-2 text-right text-text-secondary">{row.customers.toLocaleString()}</td>
                        <td className="py-2.5 px-2 text-right text-text-secondary">{row.daysSinceFirst}</td>
                        <td className="py-2.5 px-2 text-right text-text-secondary">{row.lag2nd}d</td>
                        <td className="py-2.5 px-2 text-right text-text-secondary">{row.lag3rd}d</td>
                        <td className="py-2.5 px-2 text-right text-text-secondary">{row.lag4th}d</td>
                        <td className="py-2.5 px-2 text-right text-text-primary font-medium">{row.avgOrders}</td>
                        {[row.r30, row.r60, row.r90, row.r180, row.r365].map((val, i) => (
                          <td key={i} className={`py-2.5 px-2 text-right ${getHeatmapClass(val, maxRepeat)}`}>
                            <span className={val >= 50 ? 'text-success' : val >= 30 ? 'text-warm-gold' : 'text-text-secondary'}>
                              {val.toFixed(1)}%
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
