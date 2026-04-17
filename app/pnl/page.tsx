'use client';
import { useState, useMemo, useEffect } from 'react';
import KPICard from '@/components/ui/KPICard';
import DataSource from '@/components/ui/DataSource';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { SkeletonKPICard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/components/CurrencyProvider';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// Types matching the new API response
interface PnlRowData {
  label: string;
  isSection: boolean;
  isSubItem: boolean;
  isSummary: boolean;
  months: {
    [monthKey: string]: {
      value: number;
      pctOfNet: number | null;
    };
  };
  change: {
    value: number;
    pctChange: number | null;
  };
  ytd: {
    value: number;
    pctOfNet: number | null;
  };
}

interface SheetData {
  company: string;
  reportTitle: string;
  currency: string;
  currencyNote: string;
  months: string[];
  rows: PnlRowData[];
}

// Styling for specific row types
function getRowStyle(row: PnlRowData): { bg: string; text: string; font: string; border: string } {
  const label = row.label;
  // Major summary lines (CM1, CM2, CM3, EBITDA, Net Income)
  if (/^(CM\d|EBITDA)$/.test(label)) {
    return { bg: 'bg-brand-blue/5', text: 'text-text-primary', font: 'font-bold', border: 'border-t border-border' };
  }
  if (label.startsWith('Net Income') || label.startsWith('Net Revenue')) {
    return { bg: 'bg-success/5', text: 'text-text-primary', font: 'font-bold text-base', border: 'border-t-2 border-border' };
  }
  if (label.startsWith('Total Operating')) {
    return { bg: 'bg-warning/5', text: 'text-text-primary', font: 'font-semibold', border: 'border-t border-border' };
  }
  // Section headers
  if (row.isSection) {
    return { bg: 'bg-bg-elevated', text: 'text-text-secondary', font: 'font-semibold uppercase text-xs tracking-wide', border: '' };
  }
  // Sub items (indented)
  if (row.isSubItem) {
    return { bg: '', text: 'text-text-secondary', font: 'font-normal', border: '' };
  }
  // Regular items
  return { bg: '', text: 'text-text-primary', font: 'font-medium', border: '' };
}

// Color indicator dot for contribution margin rows
function getIndicatorColor(label: string): string | null {
  if (label === 'Net Revenue') return '#34D399';
  if (label === 'CM1') return '#6366F1';
  if (label === 'CM2') return '#EDBF63';
  if (label === 'CM3') return '#F97316';
  if (label === 'EBITDA') return '#8B5CF6';
  if (label.startsWith('Net Income')) return '#22C55E';
  return null;
}

export default function PnLPage() {
  const { currency, convertValue } = useCurrency();
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [sheetLoading, setSheetLoading] = useState(true);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'monthly' | 'ytd'>('monthly');

  useEffect(() => {
    setSheetLoading(true);
    fetch('/api/google-sheets')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setSheetData(json.data);
          setSheetError(null);
        } else {
          setSheetError(json.error || 'Failed to load P&L data');
        }
      })
      .catch(err => setSheetError(err.message))
      .finally(() => setSheetLoading(false));
  }, []);

  const fmt = (value: number) => formatCurrency(convertValue(value), currency);

  // Find key rows by label
  const findRow = (label: string): PnlRowData | undefined =>
    sheetData?.rows.find(r => r.label === label);

  // Get the latest month's data for a row
  const getLatestValue = (row: PnlRowData | undefined): number => {
    if (!row || !sheetData) return 0;
    const latestMonth = sheetData.months[sheetData.months.length - 1];
    return row.months[latestMonth]?.value ?? 0;
  };

  // KPI summary values (from YTD)
  const netRevenue = findRow('Net Revenue');
  const cm1 = findRow('CM1');
  const cm3 = findRow('CM3');
  const ebitda = findRow('EBITDA');
  const netIncome = sheetData?.rows.find(r => r.label.startsWith('Net Income'));

  // Chart data: contribution margin waterfall by month
  const waterfallChartData = useMemo(() => {
    if (!sheetData) return [];
    return sheetData.months.map(month => {
      const shortMonth = month.replace(/\s*20\d{2}/, '').trim();
      const getVal = (label: string) => {
        const row = sheetData.rows.find(r => r.label === label);
        return row?.months[month]?.value ?? 0;
      };
      return {
        month: shortMonth,
        'Net Revenue': getVal('Net Revenue'),
        'CM1': getVal('CM1'),
        'CM2': getVal('CM2'),
        'CM3': getVal('CM3'),
        'EBITDA': getVal('EBITDA'),
      };
    });
  }, [sheetData]);

  // Margin % chart data
  const marginChartData = useMemo(() => {
    if (!sheetData) return [];
    return sheetData.months.map(month => {
      const shortMonth = month.replace(/\s*20\d{2}/, '').trim();
      const getPct = (label: string) => {
        const row = sheetData.rows.find(r => r.label === label);
        return row?.months[month]?.pctOfNet ?? 0;
      };
      return {
        month: shortMonth,
        'CM1 %': getPct('CM1'),
        'CM2 %': getPct('CM2'),
        'CM3 %': getPct('CM3'),
        'EBITDA %': getPct('EBITDA'),
      };
    });
  }, [sheetData]);

  const isLive = sheetData !== null && !sheetError;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">Profit & Loss</h2>
            <DataSource source={isLive ? 'Google Sheets' : 'N/A'} />
            <LiveBadge variant={isLive ? 'live' : 'sample'} />
          </div>
          {sheetData && (
            <p className="text-xs text-text-tertiary mt-1">
              {sheetData.company} — {sheetData.currencyNote}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'monthly'
                ? 'bg-brand-blue/15 text-brand-blue-light'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewMode('ytd')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'ytd'
                ? 'bg-brand-blue/15 text-brand-blue-light'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            YTD
          </button>
        </div>
      </div>

      {sheetError && (
        <div className="mx-1 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
          Failed to load P&L data: {sheetError}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mx-1">
        {sheetLoading ? (
          <>
            <SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard />
          </>
        ) : sheetData ? (
          <>
            <KPICard
              label="Net Revenue"
              value={fmt(netRevenue?.ytd.value ?? 0)}
              change={netRevenue?.change.pctChange ?? 0}
              sparkline={[]}
              secondary="YTD"
              dataSource="Google Sheets"
            />
            <KPICard
              label="CM1 (Gross)"
              value={fmt(cm1?.ytd.value ?? 0)}
              change={cm1?.change.pctChange ?? 0}
              sparkline={[]}
              secondary={cm1?.ytd.pctOfNet != null ? `${cm1.ytd.pctOfNet.toFixed(1)}% margin` : 'YTD'}
              dataSource="Google Sheets"
            />
            <KPICard
              label="CM3 (Post-Ads)"
              value={fmt(cm3?.ytd.value ?? 0)}
              change={cm3?.change.pctChange ?? 0}
              sparkline={[]}
              secondary={cm3?.ytd.pctOfNet != null ? `${cm3.ytd.pctOfNet.toFixed(1)}% margin` : 'YTD'}
              dataSource="Google Sheets"
            />
            <KPICard
              label="EBITDA"
              value={fmt(ebitda?.ytd.value ?? 0)}
              change={ebitda?.change.pctChange ?? 0}
              sparkline={[]}
              secondary={ebitda?.ytd.pctOfNet != null ? `${ebitda.ytd.pctOfNet.toFixed(1)}% margin` : 'YTD'}
              dataSource="Google Sheets"
            />
            <KPICard
              label="Net Income"
              value={fmt(netIncome?.ytd.value ?? 0)}
              change={netIncome?.change.pctChange ?? 0}
              sparkline={[]}
              secondary={netIncome?.ytd.pctOfNet != null ? `${netIncome.ytd.pctOfNet.toFixed(1)}% net margin` : 'YTD'}
              dataSource="Google Sheets"
            />
          </>
        ) : null}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contribution Margin Waterfall */}
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary">Revenue → Contribution Margins</h3>
            <div className="flex items-center gap-2 shrink-0">
              <DataSource source={isLive ? 'Google Sheets' : 'N/A'} />
              <LiveBadge variant={isLive ? 'live' : 'sample'} />
            </div>
          </div>
          {sheetLoading ? <SkeletonChart /> : (
            <div className="min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={waterfallChartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Net Revenue" fill="#34D399" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="CM1" fill="#6366F1" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="CM2" fill="#EDBF63" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="CM3" fill="#F97316" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="EBITDA" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Margin % Trend */}
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary">Margin % Trend</h3>
            <div className="flex items-center gap-2 shrink-0">
              <DataSource source={isLive ? 'Google Sheets' : 'N/A'} />
              <LiveBadge variant={isLive ? 'live' : 'sample'} />
            </div>
          </div>
          {sheetLoading ? <SkeletonChart /> : (
            <div className="min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={marginChartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <defs>
                    <linearGradient id="gradientCM1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradientCM2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EDBF63" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#EDBF63" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradientCM3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradientEBITDA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }}
                    formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="CM1 %" stroke="#6366F1" strokeWidth={2} dot={{ r: 4 }} fill="url(#gradientCM1)" />
                  <Area type="monotone" dataKey="CM2 %" stroke="#EDBF63" strokeWidth={2} dot={{ r: 4 }} fill="url(#gradientCM2)" />
                  <Area type="monotone" dataKey="CM3 %" stroke="#F97316" strokeWidth={2} dot={{ r: 4 }} fill="url(#gradientCM3)" />
                  <Area type="monotone" dataKey="EBITDA %" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} fill="url(#gradientEBITDA)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Full P&L Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-primary">
            Full P&L Statement
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <DataSource source={isLive ? 'Google Sheets' : 'N/A'} />
            <LiveBadge variant={isLive ? 'live' : 'sample'} />
          </div>
        </div>

        {sheetLoading ? (
          <SkeletonTable />
        ) : sheetData ? (
          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <div className="min-w-[800px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border text-xs text-text-secondary uppercase">
                    <th className="text-left py-3 px-3 font-medium w-[240px] sticky left-0 bg-bg-surface z-10">Line Item</th>
                    {viewMode === 'monthly' ? (
                      <>
                        {sheetData.months.map(m => (
                          <th key={m} className="text-right py-3 px-3 font-medium min-w-[100px]">
                            {m.replace(/\s*20\d{2}/, '')}
                          </th>
                        ))}
                        {sheetData.months.map(m => (
                          <th key={`${m}-pct`} className="text-right py-3 px-2 font-medium min-w-[70px] text-text-tertiary">
                            % Net
                          </th>
                        ))}
                        <th className="text-right py-3 px-3 font-medium min-w-[90px]">MoM Δ</th>
                      </>
                    ) : (
                      <>
                        <th className="text-right py-3 px-3 font-medium min-w-[120px]">YTD</th>
                        <th className="text-right py-3 px-3 font-medium min-w-[80px]">% of Net</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sheetData.rows.map((row, idx) => {
                    const style = getRowStyle(row);
                    const indicator = getIndicatorColor(row.label);

                    return (
                      <tr
                        key={`${row.label}-${idx}`}
                        className={`${style.bg} ${style.border} border-b border-border/30 hover:bg-bg-elevated/30 transition-colors`}
                      >
                        <td className={`py-2.5 px-3 sticky left-0 bg-inherit z-10 ${row.isSubItem ? 'pl-8' : ''}`}>
                          <div className="flex items-center gap-2">
                            {indicator && (
                              <span
                                className="w-1.5 h-5 rounded-full shrink-0"
                                style={{ background: indicator }}
                              />
                            )}
                            <span className={`${style.text} ${style.font}`}>
                              {row.label}
                            </span>
                          </div>
                        </td>
                        {viewMode === 'monthly' ? (
                          <>
                            {sheetData.months.map(m => {
                              const val = row.months[m]?.value ?? 0;
                              return (
                                <td
                                  key={m}
                                  className={`py-2.5 px-3 text-right tabular-nums ${style.font} ${
                                    val < 0 ? 'text-danger' : style.text
                                  }`}
                                >
                                  {val !== 0 ? fmt(val) : '—'}
                                </td>
                              );
                            })}
                            {sheetData.months.map(m => {
                              const pct = row.months[m]?.pctOfNet;
                              return (
                                <td
                                  key={`${m}-pct`}
                                  className="py-2.5 px-2 text-right tabular-nums text-text-tertiary text-xs"
                                >
                                  {pct !== null && pct !== undefined ? `${pct.toFixed(1)}%` : ''}
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-3 text-right tabular-nums">
                              {row.change.pctChange !== null ? (
                                <span className={row.change.pctChange >= 0 ? 'text-success' : 'text-danger'}>
                                  {row.change.pctChange >= 0 ? '↑' : '↓'} {Math.abs(row.change.pctChange).toFixed(1)}%
                                </span>
                              ) : row.change.value !== 0 ? (
                                <span className={row.change.value >= 0 ? 'text-success' : 'text-danger'}>
                                  {fmt(row.change.value)}
                                </span>
                              ) : '—'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className={`py-2.5 px-3 text-right tabular-nums ${style.font} ${
                              row.ytd.value < 0 ? 'text-danger' : style.text
                            }`}>
                              {row.ytd.value !== 0 ? fmt(row.ytd.value) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-text-secondary">
                              {row.ytd.pctOfNet !== null ? `${row.ytd.pctOfNet.toFixed(1)}%` : ''}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
