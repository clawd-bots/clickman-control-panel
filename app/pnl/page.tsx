'use client';
import { useState, useMemo, useEffect } from 'react';
import KPICard from '@/components/ui/KPICard';
import DataSource from '@/components/ui/DataSource';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { SkeletonKPICard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/components/CurrencyProvider';
import { useDateRange } from '@/components/DateProvider';
import { ChevronRight, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// Types for Google Sheets P&L data
interface SheetPnlRow {
  label: string;
  jan: number;
  janPct: number | null;
  feb: number;
  febPct: number | null;
  change: number;
  changePct: number | null;
  ytd: number;
  ytdPct: number | null;
}

interface SheetData {
  title: string;
  currency: string;
  periods: string[];
  ytdLabel: string;
  pnl: Record<string, SheetPnlRow>;
  opexItems: SheetPnlRow[];
  deepDive: Array<{ category: string; vendor: string; jan: number; feb: number; change: number; changePct: string }>;
}

interface PnlDisplayRow {
  label: string;
  values: { jan: number; feb: number; ytd: number };
  pcts: { jan: number | null; feb: number | null; ytd: number | null };
  change: number;
  changePct: number | null;
  color: string;
  isHeader?: boolean;
  children?: PnlDisplayRow[];
}

export default function PnLPage() {
  const { currency, convertValue } = useCurrency();
  const { dateRange } = useDateRange();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [sheetLoading, setSheetLoading] = useState(true);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [viewPeriod, setViewPeriod] = useState<'jan' | 'feb' | 'ytd'>('ytd');

  // Fetch Google Sheets P&L data
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

  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

  // Helper to get value for selected period
  const getVal = (row: SheetPnlRow | undefined, period: 'jan' | 'feb' | 'ytd'): number => {
    if (!row) return 0;
    return period === 'jan' ? row.jan : period === 'feb' ? row.feb : row.ytd;
  };

  const getPct = (row: SheetPnlRow | undefined, period: 'jan' | 'feb' | 'ytd'): number | null => {
    if (!row) return null;
    return period === 'jan' ? row.janPct : period === 'feb' ? row.febPct : row.ytdPct;
  };

  // Build the P&L display rows from sheet data
  const pnlRows = useMemo((): PnlDisplayRow[] => {
    if (!sheetData) return [];
    const d = sheetData.pnl;
    const p = viewPeriod;

    const makeRow = (key: string, color: string, isHeader = true, children?: PnlDisplayRow[]): PnlDisplayRow => {
      const row = d[key];
      return {
        label: row?.label || key,
        values: { jan: row?.jan || 0, feb: row?.feb || 0, ytd: row?.ytd || 0 },
        pcts: { jan: row?.janPct ?? null, feb: row?.febPct ?? null, ytd: row?.ytdPct ?? null },
        change: row?.change || 0,
        changePct: row?.changePct ?? null,
        color,
        isHeader,
        children,
      };
    };

    const makeLeaf = (key: string, color: string): PnlDisplayRow => makeRow(key, color, false);

    return [
      // Revenue Section
      makeRow('grossSales', '#EDBF63', true, [
        makeLeaf('discounts', '#EF4444'),
        makeLeaf('refunds', '#EF4444'),
      ]),
      makeRow('netRevenue', '#34D399', true, [
        makeLeaf('orders', '#94A3B8'),
        makeLeaf('aov', '#94A3B8'),
      ]),
      // COGS → CM1
      makeRow('cogs', '#EF4444'),
      makeRow('cm1', '#EDBF63'),
      // Variable costs → CM2
      makeRow('logistics', '#F97316', true),
      makeRow('packaging', '#F97316', true),
      makeRow('transactionFees', '#F97316', true),
      makeRow('cm2', '#4A6BD6'),
      // Ad Spend → CM3
      makeRow('metaAds', '#8B5CF6', true),
      makeRow('googleAds', '#8B5CF6', true),
      makeRow('tiktokAds', '#8B5CF6', true),
      makeRow('cm3', '#A855F7'),
      // OpEx breakdown
      makeRow('totalOpex', '#F59E0B', true, 
        sheetData.opexItems.map(item => ({
          label: item.label,
          values: { jan: item.jan, feb: item.feb, ytd: item.ytd },
          pcts: { jan: item.janPct, feb: item.febPct, ytd: item.ytdPct },
          change: item.change,
          changePct: item.changePct,
          color: '#F59E0B',
        }))
      ),
      // Bottom line
      makeRow('ebitda', '#34D399'),
      makeRow('depreciation', '#94A3B8'),
      makeRow('operatingIncome', '#34D399'),
      makeRow('otherIncome', '#94A3B8'),
    ].filter(row => row.values.ytd !== 0 || row.values.jan !== 0 || row.values.feb !== 0);
  }, [sheetData, viewPeriod]);

  // Margin chart data from real sheet data
  const marginChartData = useMemo(() => {
    if (!sheetData) return [];
    const d = sheetData.pnl;
    return [
      {
        period: 'Jan 2026',
        cm1: d.cm1?.janPct ?? 0,
        cm2: d.cm2?.janPct ?? 0,
        cm3: d.cm3?.janPct ?? 0,
      },
      {
        period: 'Feb 2026',
        cm1: d.cm1?.febPct ?? 0,
        cm2: d.cm2?.febPct ?? 0,
        cm3: d.cm3?.febPct ?? 0,
      },
    ];
  }, [sheetData]);

  // Revenue waterfall chart data
  const waterfallData = useMemo(() => {
    if (!sheetData) return [];
    const d = sheetData.pnl;
    const p = viewPeriod;
    return [
      { name: 'Gross Sales', value: getVal(d.grossSales, p), fill: '#EDBF63' },
      { name: 'Discounts', value: getVal(d.discounts, p), fill: '#EF4444' },
      { name: 'Refunds', value: getVal(d.refunds, p), fill: '#EF4444' },
      { name: 'Net Revenue', value: getVal(d.netRevenue, p), fill: '#34D399' },
      { name: 'COGS', value: getVal(d.cogs, p), fill: '#EF4444' },
      { name: 'CM1', value: getVal(d.cm1, p), fill: '#EDBF63' },
      { name: 'Var. Costs', value: -(getVal(d.logistics, p) + getVal(d.packaging, p) + getVal(d.transactionFees, p)), fill: '#F97316' },
      { name: 'CM2', value: getVal(d.cm2, p), fill: '#4A6BD6' },
      { name: 'Ad Spend', value: -(getVal(d.metaAds, p) + getVal(d.googleAds, p) + getVal(d.tiktokAds, p)), fill: '#8B5CF6' },
      { name: 'CM3', value: getVal(d.cm3, p), fill: '#A855F7' },
    ].filter(item => item.value !== 0);
  }, [sheetData, viewPeriod]);

  const toggle = (label: string) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  
  const allExpandable = pnlRows.filter(r => r.children && r.children.length > 0).map(r => r.label);
  const allExpanded = allExpandable.every(l => expanded[l]);
  const toggleAll = () => {
    if (allExpanded) {
      setExpanded({});
    } else {
      const all: Record<string, boolean> = {};
      allExpandable.forEach(l => { all[l] = true; });
      setExpanded(all);
    }
  };

  const periodLabel = viewPeriod === 'jan' ? 'Jan 2026' : viewPeriod === 'feb' ? 'Feb 2026' : '2026 YTD';
  const isLive = sheetData !== null && !sheetError;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-semibold">Profit & Loss</h2>
          <div className="flex items-center gap-2">
            <DataSource source={isLive ? 'Google Sheets' : 'N/A'} />
            <LiveBadge variant={isLive ? 'live' : 'sample'} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex gap-1">
            {(['jan', 'feb', 'ytd'] as const).map(p => (
              <button 
                key={p} 
                onClick={() => setViewPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewPeriod === p 
                    ? 'bg-brand-blue/15 text-brand-blue-light' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                }`}
              >
                {p === 'jan' ? 'Jan 2026' : p === 'feb' ? 'Feb 2026' : 'YTD'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {sheetError && (
        <div className="mx-1 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
          Failed to load P&L data: {sheetError}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mx-1">
        {sheetLoading ? (
          <>
            <SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard />
          </>
        ) : sheetData ? (
          <>
            <KPICard 
              label="Net Revenue" 
              value={formatCurrencyValue(getVal(sheetData.pnl.netRevenue, viewPeriod))} 
              change={sheetData.pnl.netRevenue?.changePct ?? 0} 
              sparkline={[]} 
              dataSource="Google Sheets"
            />
            <KPICard 
              label="CM1" 
              value={`${(getPct(sheetData.pnl.cm1, viewPeriod) ?? 0).toFixed(1)}%`} 
              change={sheetData.pnl.cm1?.changePct ?? 0} 
              sparkline={[]} 
              secondary={formatCurrencyValue(getVal(sheetData.pnl.cm1, viewPeriod))}
              dataSource="Google Sheets"
            />
            <KPICard 
              label="CM2" 
              value={`${(getPct(sheetData.pnl.cm2, viewPeriod) ?? 0).toFixed(1)}%`} 
              change={sheetData.pnl.cm2?.changePct ?? 0} 
              sparkline={[]} 
              secondary={formatCurrencyValue(getVal(sheetData.pnl.cm2, viewPeriod))}
              dataSource="Google Sheets"
            />
            <KPICard 
              label="CM3" 
              value={`${(getPct(sheetData.pnl.cm3, viewPeriod) ?? 0).toFixed(1)}%`} 
              change={sheetData.pnl.cm3?.changePct ?? 0} 
              sparkline={[]} 
              secondary={formatCurrencyValue(getVal(sheetData.pnl.cm3, viewPeriod))}
              dataSource="Google Sheets"
            />
            <KPICard 
              label="EBITDA" 
              value={formatCurrencyValue(getVal(sheetData.pnl.ebitda, viewPeriod))}
              change={sheetData.pnl.ebitda?.changePct ?? 0} 
              sparkline={[]}
              secondary={`${(getPct(sheetData.pnl.ebitda, viewPeriod) ?? 0).toFixed(1)}% of Net Rev`}
              dataSource="Google Sheets"
            />
          </>
        ) : null}
      </div>

      {/* Margin Levels Chart */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-secondary">Margin Levels — CM1 / CM2 / CM3</h3>
          <div className="flex items-center gap-2 shrink-0">
            <DataSource source={isLive ? 'Google Sheets' : 'N/A'} />
            <LiveBadge variant={isLive ? 'live' : 'sample'} />
          </div>
        </div>
        {sheetLoading ? (
          <SkeletonChart />
        ) : (
          <div className="min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={marginChartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="period" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                <YAxis 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cm1" name="CM1 %" fill="#EDBF63" radius={[2, 2, 0, 0]} />
                <Bar dataKey="cm2" name="CM2 %" fill="#4A6BD6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="cm3" name="CM3 %" fill="#A855F7" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* P&L Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text-primary">P&L Breakdown — {periodLabel}</h3>
            {sheetData && (
              <span className="text-xs text-text-tertiary">({sheetData.currency})</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <DataSource source={isLive ? 'Google Sheets' : 'N/A'} />
              <LiveBadge variant={isLive ? 'live' : 'sample'} />
            </div>
            {pnlRows.length > 0 && (
              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronsUpDown size={13} />
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            )}
          </div>
        </div>
        
        {sheetLoading ? (
          <SkeletonTable />
        ) : (
          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <div className="min-w-[700px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-text-secondary uppercase">
                    <th className="text-left py-3 px-3 font-medium w-1/3">Line Item</th>
                    <th className="text-right py-3 px-3 font-medium">{periodLabel}</th>
                    <th className="text-right py-3 px-3 font-medium">% of Net Rev</th>
                    <th className="text-right py-3 px-3 font-medium">MoM Change</th>
                  </tr>
                </thead>
                <tbody>
                  {pnlRows.flatMap((row) => {
                    const val = viewPeriod === 'jan' ? row.values.jan : viewPeriod === 'feb' ? row.values.feb : row.values.ytd;
                    const pct = viewPeriod === 'jan' ? row.pcts.jan : viewPeriod === 'feb' ? row.pcts.feb : row.pcts.ytd;
                    const hasChildren = row.children && row.children.length > 0;

                    const rows = [
                      <tr
                        key={row.label}
                        className={`border-b border-border/50 ${hasChildren ? 'cursor-pointer hover:bg-bg-elevated/30' : 'hover:bg-bg-elevated/20'} transition-colors`}
                        onClick={() => hasChildren && toggle(row.label)}
                      >
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <span className="w-1 h-6 rounded-full shrink-0" style={{ background: row.color }} />
                            {hasChildren ? (
                              expanded[row.label] ? <ChevronDown size={14} className="text-text-secondary" /> : <ChevronRight size={14} className="text-text-secondary" />
                            ) : <span className="w-3.5" />}
                            <span className={`${row.isHeader ? 'text-text-primary font-semibold' : 'text-text-primary font-medium'}`}>
                              {row.label}
                            </span>
                            <InfoTooltip metric={row.label} />
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right text-text-primary font-semibold">
                          {formatCurrencyValue(val)}
                        </td>
                        <td className="py-3.5 px-3 text-right text-text-secondary">
                          {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          {row.changePct !== null ? (
                            <span className={row.changePct >= 0 ? 'text-success' : 'text-danger'}>
                              {row.changePct >= 0 ? '↑' : '↓'} {Math.abs(row.changePct).toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ];

                    if (expanded[row.label] && row.children) {
                      row.children.forEach((child) => {
                        const childVal = viewPeriod === 'jan' ? child.values.jan : viewPeriod === 'feb' ? child.values.feb : child.values.ytd;
                        const childPct = viewPeriod === 'jan' ? child.pcts.jan : viewPeriod === 'feb' ? child.pcts.feb : child.pcts.ytd;
                        rows.push(
                          <tr key={`${row.label}-${child.label}`} className="border-b border-border/20 hover:bg-bg-elevated/20 transition-colors">
                            <td className="py-2.5 px-3 pl-14">
                              <div className="flex items-center gap-2 text-text-secondary">
                                {child.label.replace(/^\s+/, '')}
                                <InfoTooltip metric={child.label.replace(/^\s+/, '')} />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-text-secondary">
                              {formatCurrencyValue(childVal)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-text-tertiary">
                              {childPct !== null ? `${childPct.toFixed(1)}%` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {child.changePct !== null ? (
                                <span className={`text-xs ${child.changePct >= 0 ? 'text-success' : 'text-danger'}`}>
                                  {child.changePct >= 0 ? '↑' : '↓'} {Math.abs(child.changePct).toFixed(1)}%
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      });
                    }
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
