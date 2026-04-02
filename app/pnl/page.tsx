'use client';
import { useState, useMemo, useEffect } from 'react';
import KPICard from '@/components/ui/KPICard';
import DataSource from '@/components/ui/DataSource';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { SkeletonKPICard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/components/CurrencyProvider';
import { ChevronRight, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// Types for MoM Google Sheets data
interface MomRow {
  label: string;
  monthly: Record<string, number>;
  total: number;
}

interface SheetData {
  title: string;
  dateRange: string;
  currency: string;
  months: string[];
  rows: Record<string, MomRow>;
  sections: Array<{ key: string; label: string; section: string; indent: number }>;
}

// Key P&L line items we want to display, in order
const PNL_STRUCTURE = [
  // Income
  { key: 'total_income', label: 'Total Income', color: '#34D399', isHeader: true },
  { key: 'affiliate_income', label: 'Affiliate Income', color: '#94A3B8', indent: true },
  { key: 'discounts_given', label: 'Discounts Given', color: '#EF4444', indent: true },
  { key: 'total_service_fee_income', label: 'Service/Fee Income', color: '#4A6BD6', indent: true },
  { key: 'total_services_sales', label: 'Services Sales', color: '#4A6BD6', indent: true },
  { key: 'unapplied_cash_payment_income', label: 'Unapplied Cash Payment', color: '#94A3B8', indent: true },
  
  // COGS
  { key: 'total_cost_of_goods_sold', label: 'Cost of Goods Sold', color: '#EF4444', isHeader: true },
  { key: 'client_ad_budget_spend', label: 'Client Ad Budget Spend', color: '#EF4444', indent: true },
  
  // Gross Profit
  { key: 'gross_profit', label: 'Gross Profit', color: '#EDBF63', isHeader: true },

  // Expenses
  { key: 'total_expenses', label: 'Total Expenses', color: '#F97316', isHeader: true },
  { key: 'advertising_marketing', label: 'Advertising & Marketing', color: '#F97316', indent: true },
  { key: 'company_req_softwares_tools', label: 'Software/Tools', color: '#F97316', indent: true },
  { key: 'total_contractors', label: 'Total Contractors', color: '#8B5CF6', indent: true },
  { key: 'legal_professional_services', label: 'Legal & Professional', color: '#F97316', indent: true },
  { key: 'quickbooks_payments_fees', label: 'QuickBooks Fees', color: '#F97316', indent: true },
  { key: 'total_sde', label: 'SDE (Owner)', color: '#F97316', indent: true },

  // Bottom line
  { key: 'net_operating_income', label: 'Net Operating Income', color: '#34D399', isHeader: true },
  { key: 'total_other_income', label: 'Other Income', color: '#94A3B8' },
  { key: 'net_income', label: 'Net Income', color: '#22C55E', isHeader: true },
];

export default function PnLPage() {
  const { currency, convertValue } = useCurrency();
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [sheetLoading, setSheetLoading] = useState(true);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // empty = Total
  const [showAllRows, setShowAllRows] = useState(false);

  // Fetch Google Sheets P&L data
  useEffect(() => {
    setSheetLoading(true);
    fetch('/api/google-sheets')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setSheetData(json.data);
          setSheetError(null);
          // Default to latest month
          if (json.data.months?.length > 0) {
            setSelectedMonth(json.data.months[json.data.months.length - 1]);
          }
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

  // Get value for selected period
  const getVal = (row: MomRow | undefined): number => {
    if (!row) return 0;
    if (!selectedMonth) return row.total;
    return row.monthly[selectedMonth] ?? 0;
  };

  // Get previous month's value for MoM comparison
  const getPrevVal = (row: MomRow | undefined): number => {
    if (!row || !selectedMonth || !sheetData) return 0;
    const monthIdx = sheetData.months.indexOf(selectedMonth);
    if (monthIdx <= 0) return 0;
    const prevMonth = sheetData.months[monthIdx - 1];
    return row.monthly[prevMonth] ?? 0;
  };

  // MoM change percentage
  const getMomChange = (row: MomRow | undefined): number | null => {
    const curr = getVal(row);
    const prev = getPrevVal(row);
    if (prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  // % of Net Revenue
  const getPctOfRevenue = (row: MomRow | undefined): number | null => {
    const netRevRow = sheetData?.rows?.total_income;
    if (!netRevRow || !row) return null;
    const revenue = getVal(netRevRow);
    if (revenue === 0) return null;
    return (getVal(row) / revenue) * 100;
  };

  // Build visible P&L rows
  const visibleRows = useMemo(() => {
    if (!sheetData) return [];
    
    if (showAllRows) {
      // Show all rows from the sheet
      return sheetData.sections
        .filter(s => sheetData.rows[s.key])
        .map(s => ({
          key: s.key,
          label: sheetData.rows[s.key].label,
          color: s.label.startsWith('Total') ? '#34D399' : '#94A3B8',
          isHeader: s.label.startsWith('Total') || s.label.startsWith('Gross') || s.label.startsWith('Net'),
          indent: s.indent > 1,
        }));
    }

    return PNL_STRUCTURE.filter(item => sheetData.rows[item.key]);
  }, [sheetData, showAllRows]);

  // Monthly trend chart for key metrics
  const trendChartData = useMemo(() => {
    if (!sheetData) return [];
    return sheetData.months.map(month => ({
      month: month.replace(' 2025', "'25").replace(' 2026', "'26").replace('Mar 1 - Mar 29 2026', "Mar'26"),
      income: sheetData.rows.total_income?.monthly[month] ?? 0,
      expenses: sheetData.rows.total_expenses?.monthly[month] ?? 0,
      netIncome: sheetData.rows.net_income?.monthly[month] ?? 0,
      grossProfit: sheetData.rows.gross_profit?.monthly[month] ?? 0,
    }));
  }, [sheetData]);

  // Gross margin chart data
  const marginChartData = useMemo(() => {
    if (!sheetData) return [];
    return sheetData.months.map(month => {
      const income = sheetData.rows.total_income?.monthly[month] ?? 0;
      const grossProfit = sheetData.rows.gross_profit?.monthly[month] ?? 0;
      const netIncome = sheetData.rows.net_income?.monthly[month] ?? 0;
      return {
        month: month.replace(' 2025', "'25").replace(' 2026', "'26").replace('Mar 1 - Mar 29 2026', "Mar'26"),
        grossMargin: income > 0 ? (grossProfit / income) * 100 : 0,
        netMargin: income > 0 ? (netIncome / income) * 100 : 0,
      };
    });
  }, [sheetData]);

  const isLive = sheetData !== null && !sheetError;

  // KPI summary values
  const totalIncome = sheetData ? getVal(sheetData.rows.total_income) : 0;
  const grossProfit = sheetData ? getVal(sheetData.rows.gross_profit) : 0;
  const totalExpenses = sheetData ? getVal(sheetData.rows.total_expenses) : 0;
  const netIncome = sheetData ? getVal(sheetData.rows.net_income) : 0;
  const grossMarginPct = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month selector */}
          {sheetData && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-bg-elevated border border-border text-text-primary"
            >
              <option value="">Total (All Months)</option>
              {sheetData.months.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {sheetError && (
        <div className="mx-1 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
          Failed to load P&L data: {sheetError}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mx-1">
        {sheetLoading ? (
          <>
            <SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard />
          </>
        ) : sheetData ? (
          <>
            <KPICard 
              label="Total Income" 
              value={formatCurrencyValue(totalIncome)} 
              change={getMomChange(sheetData.rows.total_income) ?? 0} 
              sparkline={[]} 
              dataSource="Google Sheets"
            />
            <KPICard 
              label="Gross Profit" 
              value={formatCurrencyValue(grossProfit)} 
              change={getMomChange(sheetData.rows.gross_profit) ?? 0} 
              sparkline={[]} 
              secondary={`${grossMarginPct.toFixed(1)}% margin`}
              dataSource="Google Sheets"
            />
            <KPICard 
              label="Total Expenses" 
              value={formatCurrencyValue(totalExpenses)} 
              change={getMomChange(sheetData.rows.total_expenses) ?? 0} 
              sparkline={[]} 
              dataSource="Google Sheets"
            />
            <KPICard 
              label="Net Income" 
              value={formatCurrencyValue(netIncome)} 
              change={getMomChange(sheetData.rows.net_income) ?? 0} 
              sparkline={[]} 
              secondary={totalIncome > 0 ? `${((netIncome / totalIncome) * 100).toFixed(1)}% net margin` : ''}
              dataSource="Google Sheets"
            />
          </>
        ) : null}
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-secondary">Income vs Expenses — Monthly Trend</h3>
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
              <BarChart data={trendChartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Total Income" fill="#34D399" radius={[2, 2, 0, 0]} />
                <Bar dataKey="expenses" name="Total Expenses" fill="#F97316" radius={[2, 2, 0, 0]} />
                <Bar dataKey="netIncome" name="Net Income" fill="#4A6BD6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Margin Trend Chart */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-secondary">Gross & Net Margin — Monthly Trend</h3>
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
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip 
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="grossMargin" name="Gross Margin %" fill="#EDBF63" radius={[2, 2, 0, 0]} />
                <Bar dataKey="netMargin" name="Net Margin %" fill="#22C55E" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* P&L Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text-primary">
              P&L Breakdown — {selectedMonth || 'All Months Total'}
            </h3>
            <span className="text-xs text-text-tertiary">(USD)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <DataSource source={isLive ? 'Google Sheets' : 'N/A'} />
              <LiveBadge variant={isLive ? 'live' : 'sample'} />
            </div>
            <button
              onClick={() => setShowAllRows(!showAllRows)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronsUpDown size={13} />
              {showAllRows ? 'Summary View' : 'Show All Rows'}
            </button>
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
                    <th className="text-right py-3 px-3 font-medium">{selectedMonth || 'Total'}</th>
                    <th className="text-right py-3 px-3 font-medium">% of Income</th>
                    {selectedMonth && <th className="text-right py-3 px-3 font-medium">MoM Change</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((item) => {
                    const row = sheetData?.rows[item.key];
                    if (!row) return null;
                    const val = getVal(row);
                    const pctRev = getPctOfRevenue(row);
                    const momChange = getMomChange(row);

                    return (
                      <tr
                        key={item.key}
                        className="border-b border-border/50 hover:bg-bg-elevated/20 transition-colors"
                      >
                        <td className={`py-3.5 px-3 ${item.indent ? 'pl-10' : ''}`}>
                          <div className="flex items-center gap-3">
                            <span className="w-1 h-6 rounded-full shrink-0" style={{ background: item.color }} />
                            <span className={item.isHeader ? 'text-text-primary font-semibold' : 'text-text-primary'}>
                              {item.label}
                            </span>
                          </div>
                        </td>
                        <td className={`py-3.5 px-3 text-right font-semibold ${val < 0 ? 'text-danger' : 'text-text-primary'}`}>
                          {formatCurrencyValue(val)}
                        </td>
                        <td className="py-3.5 px-3 text-right text-text-secondary">
                          {pctRev !== null ? `${pctRev.toFixed(1)}%` : '—'}
                        </td>
                        {selectedMonth && (
                          <td className="py-3.5 px-3 text-right">
                            {momChange !== null ? (
                              <span className={momChange >= 0 ? 'text-success' : 'text-danger'}>
                                {momChange >= 0 ? '↑' : '↓'} {Math.abs(momChange).toFixed(1)}%
                              </span>
                            ) : '—'}
                          </td>
                        )}
                      </tr>
                    );
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
