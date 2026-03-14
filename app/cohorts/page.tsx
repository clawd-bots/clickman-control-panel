'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import ExportButton from '@/components/ui/ExportButton';
import { cohortRetention, clvExtension, productComparison } from '@/lib/sample-data';
import { getHeatmapClass } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
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
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cohort Analysis & Retention</h2>
        <div className="flex gap-1">
          <button onClick={() => setActiveTab('analysis')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${activeTab === 'analysis' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary'}`}>
            Cohort Analysis
          </button>
          <button onClick={() => setActiveTab('comparison')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${activeTab === 'comparison' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary'}`}>
            Cohort Comparison
          </button>
        </div>
      </div>

      {activeTab === 'analysis' && (
        <>
          {/* Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium">Metric:</span>
              {['Net Revenue', 'CM2', 'Orders'].map(m => (
                <button key={m} onClick={() => setMetric(m)} className={`px-2.5 py-1 rounded-md text-xs ${metric === m ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary'}`}>{m}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium">Mode:</span>
              <button onClick={() => setMode('incremental')} className={`px-2.5 py-1 rounded-md text-xs ${mode === 'incremental' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary'}`}>Incremental</button>
              <button onClick={() => setMode('accumulative')} className={`px-2.5 py-1 rounded-md text-xs ${mode === 'accumulative' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary'}`}>Accumulative</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium">Format:</span>
              <button onClick={() => setFormat('%')} className={`px-2.5 py-1 rounded-md text-xs ${format === '%' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary'}`}>%</button>
              <button onClick={() => setFormat('#')} className={`px-2.5 py-1 rounded-md text-xs ${format === '#' ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary'}`}>#</button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={heatmap} onChange={() => setHeatmap(!heatmap)} className="rounded" />
                Heatmap
              </label>
            </div>
          </div>

          {/* Cohort Table */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-text-primary">Retention by Cohort <InfoTooltip metric="Cohort" /></h3>
              <ExportButton />
            </div>
            <div className="overflow-x-auto">
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
                            {val > 0 ? displayVal : '—'}
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
                          {avg > 0 ? `${avg.toFixed(1)}%` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Comprehensive AI Analysis */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={18} className="text-warm-gold" />
              <h3 className="text-sm font-semibold text-text-primary">Cohort Intelligence — AI Analysis</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Spending Recommendations */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-success uppercase tracking-wide">💰 Spending Recommendations</h4>
                <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
                  <p>• <strong className="text-text-primary">Scale Meta spend +15%:</strong> Oct–Dec cohorts show consistently improving M1 retention (28.5% → 32.8%), suggesting recent targeting improvements are working.</p>
                  <p>• <strong className="text-text-primary">Maintain Google Brand:</strong> Lowest CAC channel with best LTV. Max out impression share before expanding elsewhere.</p>
                  <p>• <strong className="text-text-primary">Cap TikTok at current levels:</strong> March cohort has lowest first-order AOV (₱1,850 isn&apos;t bad but TikTok LTV:CAC needs monitoring before scaling).</p>
                </div>
              </div>

              {/* Caution Areas */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-danger uppercase tracking-wide">⚠️ Caution Areas</h4>
                <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
                  <p>• <strong className="text-text-primary">Jan 2026 cohort dipped:</strong> M1 retention dropped to 29.8% from Dec&apos;s 32.8%. Could be post-holiday buyer quality or seasonal effects — monitor closely.</p>
                  <p>• <strong className="text-text-primary">CAC volatility:</strong> Range of ₱770–₱820 across cohorts. Jan spike to ₱800 coincides with competitive Q1 ad costs.</p>
                  <p>• <strong className="text-text-primary">Late-cohort retention unknown:</strong> Feb and Mar cohorts don&apos;t have enough maturity data yet. Don&apos;t extrapolate from M0–M1 alone.</p>
                </div>
              </div>

              {/* Channel Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-brand-blue-light uppercase tracking-wide">📊 Channel Breakdown</h4>
                <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
                  <p>• <strong className="text-text-primary">Meta customers:</strong> 30-day repeat rate of 26.2%, 90-day of 48.5%. Strong mid-funnel but acquisition CPAs trending up 12% MoM.</p>
                  <p>• <strong className="text-text-primary">Google customers:</strong> Highest 30-day repeat at 32.1%. Brand search buyers are highest quality — they already know you.</p>
                  <p>• <strong className="text-text-primary">TikTok customers:</strong> Lowest 30-day repeat (19.8%) but youngest cohorts. TikTok attracts first-time wellness buyers who need more nurturing.</p>
                </div>
              </div>

              {/* Product Impact */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-warm-gold uppercase tracking-wide">🛒 Product Impact</h4>
                <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
                  <p>• <strong className="text-text-primary">GLP-1 is the retention engine:</strong> 51.8% 90-day repeat rate and 3.1 avg orders. Its recurring nature (monthly refills) makes it the ideal subscription candidate.</p>
                  <p>• <strong className="text-text-primary">Hair Regrowth cross-sell opportunity:</strong> 45.2% 90-day repeat but only 2.8 avg orders. Product education + refill reminders could push this higher.</p>
                  <p>• <strong className="text-text-primary">Sleep &amp; Stress underperforms:</strong> Only 31.5% 90-day retention with 1.9 avg orders. Consider repositioning as an add-on rather than a lead product.</p>
                </div>
              </div>

              {/* AOV Analysis */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wide">💵 AOV Analysis</h4>
                <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
                  <p>• <strong className="text-text-primary">First-order AOV trending up:</strong> ₱1,580 (Sep) → ₱1,850 (Mar) = +17% improvement. Better targeting or product mix shift toward GLP-1.</p>
                  <p>• <strong className="text-text-primary">Repeat AOV 59% higher:</strong> RC AOV of ₱2,688 vs NC AOV of ₱1,694. Repeat customers trade up to larger sizes and bundles.</p>
                  <p>• <strong className="text-text-primary">Bundle opportunity:</strong> Products with highest lag-to-second-order (Skin Care: 52d, Sleep: 58d) may benefit from first-order bundle incentives.</p>
                </div>
              </div>

              {/* Key Outcome */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-warm-gold uppercase tracking-wide">🎯 Key Outcome</h4>
                <div className="bg-bg-elevated rounded-lg p-4">
                  <p className="text-sm text-text-primary leading-relaxed font-medium">
                    Cohort quality is improving: newer cohorts have higher first-order AOV, better M1 retention, and lower CAC. The business is becoming more efficient at acquiring better customers. Priority action: launch a subscription option for GLP-1 (highest repeat rate product) and send targeted re-engagement to the Nov cohort (highest 30d repeat potential at 31.5%).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'comparison' && (
        <>
          {/* CLV Extension Chart */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Customer Lifetime Value Extension <InfoTooltip metric="CLV" /></h3>
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

          {/* Product Comparison Table */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-text-primary">Product Comparison <InfoTooltip metric="Repeat Rate" /></h3>
              <ExportButton />
            </div>
            <div className="overflow-x-auto">
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
        </>
      )}
    </div>
  );
}
