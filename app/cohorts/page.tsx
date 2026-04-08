'use client';
import { useState, useMemo, useEffect } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import DataSource from '@/components/ui/DataSource';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { SkeletonMetricCard, SkeletonTable } from '@/components/ui/Skeleton';
import { useCurrency } from '@/components/CurrencyProvider';
import { formatCurrency } from '@/lib/utils';
import { toLocalDateString } from '@/lib/dateUtils';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { fetchTripleWhaleData, fetchTWCohorts, getMetric, TWData, TWCohortApiRow } from '@/lib/triple-whale-client';
import { clvExtension, productComparison } from '@/lib/sample-data';
import { getHeatmapClass } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COHORT_MONTH_KEYS = Array.from({ length: 13 }, (_, i) => `M${i}`);

type CohortMetric = 'LTV' | 'Total sales' | 'Number of customers' | 'Retention rate';

export default function CohortsPage() {
  const { currency, convertValue } = useCurrency();
  const [twData, setTwData] = useState<TWData | null>(null);
  const [twLoading, setTwLoading] = useState(true);
  const [twCohortRows, setTwCohortRows] = useState<TWCohortApiRow[]>([]);
  const [cohortGridLoading, setCohortGridLoading] = useState(true);

  useEffect(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const startDate = toLocalDateString(start);
    const endDate = toLocalDateString(end);

    fetchTripleWhaleData(startDate, endDate, 'summary')
      .then(setTwData)
      .catch(console.error)
      .finally(() => setTwLoading(false));

    fetchTWCohorts(startDate, endDate, 'Triple Attribution', 'Lifetime')
      .then(setTwCohortRows)
      .catch((e) => {
        console.error(e);
        setTwCohortRows([]);
      })
      .finally(() => setCohortGridLoading(false));
  }, []);

  const [activeTab, setActiveTab] = useState<'analysis' | 'comparison'>('analysis');
  const [metric, setMetric] = useState<CohortMetric>('LTV');
  const [heatmap] = useState(true);
  const [cumulative, setCumulative] = useState(false);

  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

  const formatCohortNumber = (value: number): string => {
    if (value === 0) return '0';
    // Cohort data is in shop currency (PHP) — convert to display currency to match TW UI
    return convertValue(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatCohortInt = (value: number): string => {
    return Math.round(value).toLocaleString('en-US');
  };

  const formatCohortPct = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

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

  const displayCohortRows: TWCohortApiRow[] = useMemo(() => {
    return twCohortRows;
  }, [twCohortRows]);

  const getCellValue = (row: TWCohortApiRow, monthIdx: number): number | null => {
    // If this month is beyond what's valid for this cohort (future), return null
    if (row.maxValidMonth !== undefined && monthIdx > row.maxValidMonth) return null;
    
    switch (metric) {
      case 'LTV': {
        // TW separates 1st order from monthly columns:
        // cumLTV[k] = firstOrderAov + M0 + M1 + ... + Mk
        // So Mk (non-cumulative) = cumLTV[k] - cumLTV[k-1]
        // And cumulative display Mk = cumLTV[k] - firstOrderAov
        // Non-cumulative M0 = cumLTV[0] - firstOrderAov (extra revenue in month 0 beyond first order)
        const raw = row.ltvByMonth?.[monthIdx];
        if (raw === null || raw === undefined) return null;
        const firstOrder = row.firstOrderAov ?? 0;
        
        if (cumulative) {
          // Cumulative: total LTV up to this month MINUS first order (TW shows it separately)
          const val = raw - firstOrder;
          return val > 0 ? val : 0;
        } else {
          // Non-cumulative: incremental revenue in this specific month
          if (monthIdx === 0) {
            // M0 = total month 0 revenue minus first order
            const val = raw - firstOrder;
            return val > 0 ? val : 0;
          } else {
            const prev = row.ltvByMonth?.[monthIdx - 1] ?? 0;
            const diff = raw - (prev ?? 0);
            return diff > 0 ? diff : 0;
          }
        }
      }
      case 'Total sales': {
        const raw = row.ltvByMonth?.[monthIdx];
        if (raw === null || raw === undefined) return null;
        const firstOrder = row.firstOrderAov ?? 0;
        
        if (cumulative) {
          const val = raw - firstOrder;
          return val > 0 ? val * row.customers : 0;
        } else {
          if (monthIdx === 0) {
            const val = raw - firstOrder;
            return val > 0 ? val * row.customers : 0;
          } else {
            const prev = row.ltvByMonth?.[monthIdx - 1] ?? 0;
            const diff = raw - (prev ?? 0);
            return diff > 0 ? diff * row.customers : 0;
          }
        }
      }
      case 'Number of customers': {
        const raw = row.customersByMonth?.[monthIdx];
        if (raw === null || raw === undefined) return null;
        return raw > 0 ? raw : null;
      }
      case 'Retention rate': {
        const raw = row.customersByMonth?.[monthIdx];
        if (raw === null || raw === undefined) return null;
        if (raw <= 0 || row.customers <= 0) return null;
        return (raw / row.customers) * 100;
      }
      default:
        return null;
    }
  };

  const formatCellValue = (value: number | null): string => {
    if (value === null) return '';
    switch (metric) {
      case 'LTV':
      case 'Total sales':
        return formatCohortNumber(value);
      case 'Number of customers':
        return formatCohortInt(value);
      case 'Retention rate':
        return formatCohortPct(value);
      default:
        return String(value);
    }
  };

  const getFirstOrderValue = (row: TWCohortApiRow): string => {
    switch (metric) {
      case 'LTV':
      case 'Total sales': {
        // TW shows first order AOV separately from monthly LTV columns
        return row.firstOrderAov > 0 ? formatCohortNumber(row.firstOrderAov) : '';
      }
      case 'Number of customers':
        return formatCohortInt(row.customers);
      case 'Retention rate':
        return '100%';
      default:
        return '';
    }
  };

  const maxCellValue = useMemo(() => {
    const vals = displayCohortRows.flatMap((c) =>
      COHORT_MONTH_KEYS.map((_, i) => getCellValue(c, i)).filter((v): v is number => v !== null && v > 0)
    );
    return vals.length ? Math.max(...vals) : 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCohortRows, metric, cumulative]);

  const totals = useMemo(() => {
    if (!displayCohortRows.length) return null;
    const totalCustomers = displayCohortRows.reduce((s, c) => s + c.customers, 0);
    const weightedNcpa = displayCohortRows.reduce((s, c) => s + c.ncpa * c.customers, 0);
    const avgNcpa = totalCustomers > 0 ? weightedNcpa / totalCustomers : 0;

    const allCustByMonth = displayCohortRows.reduce((s, c) => s + (c.customersByMonth?.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0), 0);
    const repeatCust = displayCohortRows.reduce((s, c) => s + Math.round(c.customers * c.rpr / 100), 0);
    const totalRpr = totalCustomers > 0 ? (repeatCust / totalCustomers) * 100 : 0;

    const monthValues = COHORT_MONTH_KEYS.map((_, i) => {
      switch (metric) {
        case 'LTV': {
          const vals = displayCohortRows.map((c) => c.ltvByMonth?.[i] ?? 0).filter((v) => v > 0);
          return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
        }
        case 'Total sales': {
          const vals = displayCohortRows
            .map((c) => (c.ltvByMonth?.[i] ?? 0) > 0 ? (c.ltvByMonth?.[i] ?? 0) * c.customers : 0)
            .filter((v) => v > 0);
          return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) : null;
        }
        case 'Number of customers': {
          const vals = displayCohortRows.map((c) => c.customersByMonth?.[i] ?? 0).filter((v) => v > 0);
          return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) : null;
        }
        case 'Retention rate': {
          const rates = displayCohortRows
            .map((c) => {
              const custCount = c.customersByMonth?.[i] ?? 0;
              return c.customers > 0 && custCount > 0 ? (custCount / c.customers) * 100 : 0;
            })
            .filter((v) => v > 0);
          return rates.length > 0 ? rates.reduce((s, v) => s + v, 0) / rates.length : null;
        }
        default:
          return null;
      }
    });

    return { totalCustomers, avgNcpa, totalRpr, monthValues, allCustByMonth };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCohortRows, metric, cumulative]);

  const averages = useMemo(() => {
    if (!displayCohortRows.length) return null;
    const avgCustomers = Math.round(displayCohortRows.reduce((s, c) => s + c.customers, 0) / displayCohortRows.length);
    const avgNcpa = displayCohortRows.reduce((s, c) => s + c.ncpa, 0) / displayCohortRows.length;
    const avgRpr = displayCohortRows.reduce((s, c) => s + c.rpr, 0) / displayCohortRows.length;

    const monthValues = COHORT_MONTH_KEYS.map((_, i) => {
      const vals = displayCohortRows.map((c) => getCellValue(c, i)).filter((v): v is number => v !== null && v > 0);
      return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    });

    return { avgCustomers, avgNcpa, avgRpr, monthValues };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCohortRows, metric, cumulative]);

  if (twLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Cohort Analysis & Retention</h2>
          <p className="text-xs text-text-tertiary mt-1">Loading all-time Triple Whale metrics…</p>
        </div>
        <p className="text-sm text-text-secondary">Fetching live data...</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard />
        </div>
        <SkeletonTable rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Cohort Analysis</h2>
          <p className="text-xs text-text-tertiary mt-1">
            Last 365 Days
          </p>
        </div>
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
            <div className="space-y-3 mx-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                    <span>LTV</span>
                    <DataSource source="TripleWhale" /><LiveBadge />
                  </div>
                  <div className="text-lg font-bold text-text-primary">{formatCurrencyValue(getMetric(twData, 'ltv'))}</div>
                </div>
                <div className="bg-bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                    <span>Customer Frequency</span>
                    <DataSource source="TripleWhale" /><LiveBadge />
                  </div>
                  <div className="text-lg font-bold text-text-primary">{getMetric(twData, 'customerFrequency').toFixed(2)}x</div>
                </div>
                <div className="bg-bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                    <span>AOV</span>
                    <DataSource source="TripleWhale" /><LiveBadge />
                  </div>
                  <div className="text-lg font-bold text-text-primary">{formatCurrencyValue(getMetric(twData, 'aov'))}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                    <span>New Customer Orders</span>
                    <DataSource source="TripleWhale" /><LiveBadge />
                  </div>
                  <div className="text-lg font-bold text-text-primary">{getMetric(twData, 'newCustomerOrders').toLocaleString()}</div>
                </div>
                <div className="bg-bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                    <span>Return Customer Orders</span>
                    <DataSource source="TripleWhale" /><LiveBadge />
                  </div>
                  <div className="text-lg font-bold text-text-primary">{(getMetric(twData, 'orders') - getMetric(twData, 'newCustomerOrders')).toLocaleString()}</div>
                </div>
                <div className="bg-bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                    <span>New Customer Revenue</span>
                    <DataSource source="TripleWhale" /><LiveBadge />
                  </div>
                  <div className="text-lg font-bold text-text-primary">{formatCurrencyValue(getMetric(twData, 'newCustomerRevenue'))}</div>
                </div>
                <div className="bg-bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                    <span>Return Customer Revenue</span>
                    <DataSource source="TripleWhale" /><LiveBadge />
                  </div>
                  <div className="text-lg font-bold text-text-primary">{formatCurrencyValue(getMetric(twData, 'returningCustomerRevenue'))}</div>
                </div>
              </div>
            </div>
          )}

          {/* Controls — matches TW layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mx-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium shrink-0">Metric</span>
              <InfoTooltip metric="Cohort" />
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as CohortMetric)}
                className="text-xs border border-border rounded-md px-2.5 py-1.5 bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="LTV">LTV</option>
                <option value="Total sales">Total sales</option>
                <option value="Number of customers">Number of customers</option>
                <option value="Retention rate">Retention rate</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                role="switch"
                aria-checked={cumulative}
                onClick={() => setCumulative(!cumulative)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${cumulative ? 'bg-brand-blue' : 'bg-border'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${cumulative ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs text-text-secondary font-medium">Cumulative</span>
            </label>
          </div>

          {/* Cohort Table */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <span>Retention by Cohort</span>
                <InfoTooltip metric="Cohort" />
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <DataSource source={displayCohortRows.length > 0 ? 'Triple Whale' : 'N/A'} />
                <LiveBadge variant={displayCohortRows.length > 0 ? 'live' : 'sample'} />
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto -mx-1 sm:mx-0">
              <div className="min-w-[1180px]">
                <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border text-text-secondary uppercase">
                    <th className="sticky left-0 z-20 text-center py-1.5 px-1.5 font-medium bg-bg-surface shadow-[4px_0_12px_-4px_rgba(0,0,0,0.12)] whitespace-nowrap">Cohort</th>
                    <th className="text-center py-1.5 px-1.5 font-medium whitespace-nowrap">Cust. <InfoTooltip metric="New Customers" /></th>
                    <th className="text-center py-1.5 px-1.5 font-medium whitespace-nowrap">NCPA <InfoTooltip metric="nCAC" /></th>
                    <th className="text-center py-1.5 px-1.5 font-medium whitespace-nowrap">RPR <InfoTooltip metric="Repeat Rate" /></th>
                    <th className="text-center py-1.5 px-1.5 font-medium whitespace-nowrap">1st ord <InfoTooltip metric="AOV" /></th>
                    {COHORT_MONTH_KEYS.map((label) => (
                      <th key={label} className="text-center py-1.5 px-1.5 font-medium whitespace-nowrap">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohortGridLoading ? (
                    <tr>
                      <td colSpan={5 + COHORT_MONTH_KEYS.length} className="py-8 text-center text-text-secondary text-sm">
                        Loading Triple Whale cohorts…
                      </td>
                    </tr>
                  ) : (
                    <>
                  {displayCohortRows.map((row) => (
                    <tr key={row.cohortMonth} className="border-b border-border/30">
                      <td className="sticky left-0 z-10 py-1.5 px-1.5 font-medium text-text-primary bg-bg-surface shadow-[4px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap">{row.cohortLabel}</td>
                      <td className="py-1.5 px-1.5 text-right text-text-secondary whitespace-nowrap">{row.customers.toLocaleString()}</td>
                      <td className="py-1.5 px-1.5 text-right text-text-secondary whitespace-nowrap">{row.ncpa > 0 ? `${currency}${convertValue(row.ncpa).toFixed(2)}` : ''}</td>
                      <td className="py-1.5 px-1.5 text-right text-text-secondary whitespace-nowrap">{row.rpr > 0 ? `${row.rpr.toFixed(2)}%` : ''}</td>
                      <td className="py-1.5 px-1.5 text-right text-text-secondary whitespace-nowrap">{getFirstOrderValue(row)}</td>
                      {COHORT_MONTH_KEYS.map((_, i) => {
                        const val = getCellValue(row, i);
                        const show = val !== null;
                        const hClass = heatmap && show ? getHeatmapClass(val, maxCellValue) : '';
                        return (
                          <td key={i} className={`py-1.5 px-1.5 text-right whitespace-nowrap ${show ? 'text-text-secondary' : 'text-text-tertiary'} ${hClass}`}>
                            {show ? formatCellValue(val) : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Total row */}
                  {totals && (
                    <tr className="border-t-2 border-border font-medium">
                      <td className="sticky left-0 z-10 py-1.5 px-1.5 text-text-primary bg-bg-surface whitespace-nowrap">Total</td>
                      <td className="py-1.5 px-1.5 text-right text-text-primary whitespace-nowrap">{totals.totalCustomers.toLocaleString()}</td>
                      <td className="py-1.5 px-1.5 text-right text-text-primary whitespace-nowrap">{totals.avgNcpa > 0 ? `${currency}${convertValue(totals.avgNcpa).toFixed(2)}` : ''}</td>
                      <td className="py-1.5 px-1.5 text-right text-text-primary whitespace-nowrap">{totals.totalRpr > 0 ? `${totals.totalRpr.toFixed(2)}%` : ''}</td>
                      <td className="py-1.5 px-1.5 text-right text-text-primary"></td>
                      {totals.monthValues.map((val, i) => (
                        <td key={i} className="py-1.5 px-1.5 text-right text-text-primary whitespace-nowrap">
                          {val !== null ? formatCellValue(val) : ''}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Average row */}
                  {averages && (
                    <tr className="border-t border-border/50 font-medium">
                      <td className="sticky left-0 z-10 py-1.5 px-1.5 text-text-primary bg-bg-surface whitespace-nowrap">Average</td>
                      <td className="py-1.5 px-1.5 text-right text-text-primary"></td>
                      <td className="py-1.5 px-1.5 text-right text-text-primary"></td>
                      <td className="py-1.5 px-1.5 text-right text-text-primary"></td>
                      <td className="py-1.5 px-1.5 text-right text-text-primary"></td>
                      {averages.monthValues.map((val, i) => (
                        <td key={i} className="py-1.5 px-1.5 text-right text-text-primary whitespace-nowrap">
                          {val !== null ? formatCellValue(val) : ''}
                        </td>
                      ))}
                    </tr>
                  )}
                    </>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            {/* Mobile Card Layout */}
            <div className="lg:hidden space-y-3">
              {cohortGridLoading ? (
                <p className="text-sm text-text-secondary text-center py-6">Loading Triple Whale cohorts…</p>
              ) : (
                displayCohortRows.map((row) => (
                <div key={row.cohortMonth} className="bg-bg-elevated border border-border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-text-primary">{row.cohortLabel}</h4>
                      <p className="text-xs text-text-secondary">
                        {row.customers.toLocaleString()} customers • {row.ncpa > 0 ? `${currency}${convertValue(row.ncpa).toFixed(2)}` : '—'} NCPA
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-text-primary">
                        {row.rpr > 0 ? `${row.rpr.toFixed(1)}%` : '—'}
                      </div>
                      <div className="text-xs text-text-secondary">RPR</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[0, 6, 12].map((mi) => {
                      const val = getCellValue(row, mi);
                      return (
                        <div key={mi} className="text-center">
                          <div className="text-text-secondary">M{mi}</div>
                          <div className={`font-medium ${heatmap && val !== null ? getHeatmapClass(val, maxCellValue) : ''}`}>
                            {val !== null ? formatCellValue(val) : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="px-1">
            <AISuggestionsPanel 
              suggestions={getDynamicAISuggestions()} 
              title="Retention Intelligence"
              promptId="cohorts-intelligence"
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
              <div className="flex items-center gap-2 shrink-0"><DataSource source="N/A" /><LiveBadge variant="sample" /></div>
            </div>
            <div className="min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clvExtension} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}K`} />
                <YAxis dataKey="product" type="category" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }}
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
              <div className="flex items-center gap-2 shrink-0"><DataSource source="N/A" /><LiveBadge variant="sample" /></div>
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
