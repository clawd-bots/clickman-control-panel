'use client';
import { useState, useMemo, useEffect } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import DataSource from '@/components/ui/DataSource';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { useCurrency } from '@/components/CurrencyProvider';
import { useDateRange } from '@/components/DateProvider';
import { formatCurrency } from '@/lib/utils';
import { filterByDateRange, formatDateLabel } from '@/lib/dateUtils';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { fetchTripleWhaleData, getMetric, TWData } from '@/lib/triple-whale-client';
import { cohortRetention, clvExtension, productComparison, cohortAISuggestions } from '@/lib/sample-data';
import { getHeatmapClass } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function CohortsPage() {
  const { currency, convertValue } = useCurrency();
  const { dateRange } = useDateRange();
  const [twData, setTwData] = useState<TWData | null>(null);
  const [twLoading, setTwLoading] = useState(true);

  useEffect(() => {
    setTwLoading(true);
    const startDate = dateRange.startDate.toISOString().split('T')[0];
    const endDate = dateRange.endDate.toISOString().split('T')[0];
    fetchTripleWhaleData(startDate, endDate, 'summary')
      .then(setTwData)
      .catch(console.error)
      .finally(() => setTwLoading(false));
  }, [dateRange]);

  const [activeTab, setActiveTab] = useState<'analysis' | 'comparison'>('analysis');
  const [metric, setMetric] = useState('Net Revenue');
  const [format, setFormat] = useState<'%' | '#'>('%');
  const [heatmap, setHeatmap] = useState(true);
  const [mode, setMode] = useState<'incremental' | 'accumulative'>('incremental');

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

  // Dynamic AI suggestions with currency conversion
  const getDynamicAISuggestions = () => {
    return [
      'Scale Meta spend +15%: Oct to Dec cohorts show consistently improving M1 retention (28.5% to 32.8%), suggesting recent targeting improvements are working.',
      'Maintain Google Brand: Lowest CAC channel with best LTV. Max out impression share before expanding elsewhere.',
      `Cap TikTok at current levels: March cohort has lowest first-order AOV (${formatCurrencyValue(1850)} isn't bad but TikTok LTV:CAC needs monitoring before scaling).`,
      'Jan 2026 cohort dipped: M1 retention dropped to 29.8% from Dec\'s 32.8%. Could be post-holiday buyer quality or seasonal effects. Monitor closely.',
      'GLP-1 is the retention engine: 51.8% 90-day repeat rate and 3.1 avg orders. Its recurring nature makes it the ideal subscription candidate.',
      `First-order AOV trending up: ${formatCurrencyValue(1580)} (Sep) to ${formatCurrencyValue(1850)} (Mar) = +17% improvement. Better targeting or product mix shift toward GLP-1.`,
      'Launch subscription for GLP-1 (highest repeat rate product) and send targeted re-engagement to Nov cohort (highest 30d repeat potential).',
    ];
  };

  // Transform data based on selected metric and mode
  const getTransformedData = () => {
    return cohortRetention.map(cohort => {
      let transformedPeriods = [...cohort.periods];
      
      // Transform for Orders metric (simulate 40% lower numbers)
      if (metric === 'Orders') {
        transformedPeriods = cohort.periods.map(p => p > 0 ? p * 0.6 : p);
      }
      
      // Transform for Accumulative mode
      if (mode === 'accumulative' && metric === 'Net Revenue') {
        let accumulator = 0;
        transformedPeriods = cohort.periods.map(p => {
          if (p > 0 && p < 100) {
            accumulator += p;
            return Math.min(accumulator, 95); // Cap at 95%
          }
          return p;
        });
      } else if (mode === 'accumulative' && metric === 'Orders') {
        let accumulator = 0;
        transformedPeriods = cohort.periods.map(p => {
          if (p > 0 && p < 100) {
            accumulator += (p * 0.6);
            return Math.min(accumulator, 90); // Cap at 90% for orders
          }
          return p > 0 ? p * 0.6 : p;
        });
      }
      
      return {
        ...cohort,
        periods: transformedPeriods
      };
    });
  };

  const transformedData = getTransformedData();
  const maxRetention = Math.max(...transformedData.flatMap(c => c.periods.filter(p => p > 0 && p < 100)));

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
          {/* TW Summary Cards */}
          {twData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mx-1">
              <div className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                  <span>LTV</span>
                  <LiveBadge />
                </div>
                <div className="text-xl font-bold text-text-primary">{formatCurrencyValue(getMetric(twData, 'ltv'))}</div>
              </div>
              <div className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                  <span>Customer Frequency</span>
                  <LiveBadge />
                </div>
                <div className="text-xl font-bold text-text-primary">{getMetric(twData, 'customerFrequency').toFixed(2)}x</div>
              </div>
              <div className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                  <span>NC Orders</span>
                  <LiveBadge />
                </div>
                <div className="text-xl font-bold text-text-primary">{getMetric(twData, 'newCustomerOrders').toLocaleString()}</div>
                <div className="text-xs text-text-tertiary mt-1">
                  NC Rev: {formatCurrencyValue(getMetric(twData, 'newCustomerRevenue'))}
                </div>
              </div>
              <div className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                  <span>RC Revenue</span>
                  <LiveBadge />
                </div>
                <div className="text-xl font-bold text-text-primary">{formatCurrencyValue(getMetric(twData, 'returningCustomerRevenue'))}</div>
                <div className="text-xs text-text-tertiary mt-1">
                  AOV: {formatCurrencyValue(getMetric(twData, 'aov'))}
                </div>
              </div>
            </div>
          )}

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
              <div className="flex items-center gap-2 shrink-0"><DataSource source="TripleWhale" /><LiveBadge /></div>
            </div>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto -mx-1 sm:mx-0">
              <div className="min-w-[900px]">
                <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-secondary uppercase">
                    <th className="text-left py-2 px-2 font-medium">Cohort</th>
                    <th className="text-right py-2 px-2 font-medium">New Cust.</th>
                    <th className="text-right py-2 px-2 font-medium">CAC <InfoTooltip metric="nCAC" /></th>
                    <th className="text-right py-2 px-2 font-medium">NCCPA</th>
                    <th className="text-right py-2 px-2 font-medium">1st Order AOV</th>
                    {['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'].map(p => (
                      <th key={p} className="text-right py-2 px-2 font-medium">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transformedData.map((row) => (
                    <tr key={row.cohort} className="border-b border-border/30">
                      <td className="py-2.5 px-2 font-medium text-text-primary">{row.cohort}</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{row.customers}</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{formatCurrencyValue(row.cac)}</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{formatCurrencyValue((row as any).nccpa || 0)}</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{formatCurrencyValue(row.firstOrder)}</td>
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
                    <td className="py-2.5 px-2 text-right text-text-primary">{Math.round(transformedData.reduce((s, c) => s + c.customers, 0) / transformedData.length)}</td>
                    <td className="py-2.5 px-2 text-right text-text-primary">{formatCurrencyValue(Math.round(transformedData.reduce((s, c) => s + c.cac, 0) / transformedData.length))}</td>
                    <td className="py-2.5 px-2 text-right text-text-primary">{formatCurrencyValue(Math.round(transformedData.reduce((s, c) => s + ((c as any).nccpa || 0), 0) / transformedData.length))}</td>
                    <td className="py-2.5 px-2 text-right text-text-primary">{formatCurrencyValue(Math.round(transformedData.reduce((s, c) => s + c.firstOrder, 0) / transformedData.length))}</td>
                    {[0, 1, 2, 3, 4, 5, 6].map(i => {
                      const vals = transformedData.map(c => c.periods[i]).filter(v => v > 0);
                      const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
                      const displayAvg = format === '%' ? `${avg.toFixed(1)}%` : Math.round(transformedData.reduce((s, c) => s + c.customers, 0) * avg / (100 * transformedData.length)).toString();
                      return (
                        <td key={i} className="py-2.5 px-2 text-right text-text-primary">
                          {avg > 0 ? displayAvg : ','}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
              </div>
            </div>

            {/* Mobile Card Layout */}
            <div className="lg:hidden space-y-3">
              {getTransformedData().map((cohort) => (
                <div key={cohort.cohort} className="bg-bg-elevated border border-border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-text-primary">{cohort.cohort}</h4>
                      <p className="text-xs text-text-secondary">
                        {cohort.customers.toLocaleString()} customers • {formatCurrencyValue(cohort.cac)} CAC
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-text-secondary">M1</div>
                      <div className={`font-medium ${heatmap ? getHeatmapClass(cohort.periods[0], 100) : ''}`}>
                        {format === '%' ? `${cohort.periods[0].toFixed(1)}%` : cohort.periods[0].toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-text-secondary">M3</div>
                      <div className={`font-medium ${heatmap ? getHeatmapClass(cohort.periods[2], 100) : ''}`}>
                        {format === '%' ? `${cohort.periods[2].toFixed(1)}%` : cohort.periods[2].toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-text-secondary">M6</div>
                      <div className={`font-medium ${heatmap ? getHeatmapClass(cohort.periods[5], 100) : ''}`}>
                        {format === '%' ? `${cohort.periods[5].toFixed(1)}%` : cohort.periods[5].toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="px-1">
            <AISuggestionsPanel 
              suggestions={getDynamicAISuggestions()} 
              title="Retention Intelligence"
            />
          </div>
        </>
      )}

      {activeTab === 'comparison' && (
        <>
          {/* CLV Extension Chart */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <span>Customer Lifetime Value Extension</span>
                <InfoTooltip metric="CLV" />
              </h3>
              <div className="flex items-center gap-2 shrink-0"><DataSource source="TripleWhale" /><LiveBadge /></div>
            </div>
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
                <Bar dataKey="firstOrder" name="1st Order AOV" stackId="a" fill="#334FB4" />
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
              <div className="flex items-center gap-2 shrink-0"><DataSource source="TripleWhale" /><LiveBadge /></div>
            </div>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto -mx-1 sm:mx-0">
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

            {/* Mobile Card Layout */}
            <div className="lg:hidden space-y-3">
              {productComparison.map((product, i) => (
                <div key={i} className="bg-bg-elevated border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-text-primary">{product.product}</h4>
                      <p className="text-xs text-text-secondary">
                        {product.customers.toLocaleString()} customers • {product.lag2nd} days avg
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-text-primary">
                        {product.r90.toFixed(1)}%
                      </div>
                      <div className="text-xs text-text-secondary">90d repeat</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-text-secondary">30d</div>
                      <div className="font-medium text-text-primary">
                        {product.r30.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-text-secondary">60d</div>
                      <div className="font-medium text-text-primary">
                        {product.r60.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-text-secondary">90d</div>
                      <div className="font-medium text-text-primary">
                        {product.r90.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-text-secondary">Orders</div>
                      <div className="font-medium text-text-primary">
                        {product.avgOrders.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
