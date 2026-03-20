'use client';
import { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import DataSource from '@/components/ui/DataSource';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { pnlData, pnlTrend } from '@/lib/sample-data';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/components/CurrencyProvider';
import { ChevronRight, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface PnlRow {
  label: string;
  value: number;
  pct?: number;
  color: string;
  isHeader?: boolean;
  children?: { label: string; value: number; pct?: number }[];
}

const pnlRows: PnlRow[] = [
  { label: 'GMV', value: pnlData.gmv.value, color: '#EDBF63', isHeader: true, children: pnlData.gmv.items.map(i => ({ label: i.label, value: i.value, pct: i.pct })) },
  { label: 'Gross Revenue', value: pnlData.grossRevenue.value, color: '#F97316', isHeader: true, children: pnlData.grossRevenue.items.map(i => ({ label: i.label, value: i.value, pct: i.pct })) },
  { label: 'Net Revenue', value: pnlData.netRevenue.value, color: '#34D399', isHeader: true, children: pnlData.netRevenue.items.map(i => ({ label: i.label, value: i.value, pct: i.pct })) },
  { label: 'CM1', value: pnlData.cm1.value, pct: pnlData.cm1.pct, color: '#EDBF63', isHeader: true, children: pnlData.cm1.items.map(i => ({ label: i.label, value: i.value, pct: i.pct })) },
  { label: 'CM2', value: pnlData.cm2.value, pct: pnlData.cm2.pct, color: '#4A6BD6', isHeader: true, children: pnlData.cm2.items.map(i => ({ label: i.label, value: i.value, pct: i.pct })) },
  { label: 'CM3', value: pnlData.cm3.value, pct: pnlData.cm3.pct, color: '#A855F7', isHeader: true, children: pnlData.cm3.items.map(i => ({ label: i.label, value: i.value, pct: (i as { pct?: number }).pct })) },
  { label: 'EBITDA', value: pnlData.ebitda.value, pct: pnlData.ebitda.pct, color: '#34D399', isHeader: true, children: [] },
];

export default function PnLPage() {
  const { currency, convertValue } = useCurrency();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [timePeriod, setTimePeriod] = useState('Total');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Convert absolute values to margin percentages for the chart
  const marginTrendData = pnlTrend.map(item => ({
    month: item.month,
    netRevenue: 100, // Net Revenue is always 100% baseline
    cm1: ((item.cm1 / item.netRevenue) * 100), // CM1 as % of Net Revenue
    cm2: ((item.cm2 / item.netRevenue) * 100), // CM2 as % of Net Revenue 
    cm3: ((item.cm3 / item.netRevenue) * 100), // CM3 as % of Net Revenue
  }));

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

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

  // Get data based on selected time period
  const getCurrentPnLData = () => {
    const baseData = pnlData;
    
    // Apply different multipliers based on time period
    const multipliers = {
      'Total': 1,
      'Quarter': 0.33,
      'Month': 0.1,
      'Week': 0.025,
      'Day': 0.0033,
    };
    
    const mult = multipliers[timePeriod as keyof typeof multipliers] || 1;
    
    return {
      netRevenue: { value: Math.round(baseData.netRevenue.value * mult) },
      cm1: { value: Math.round(baseData.cm1.value * mult), pct: baseData.cm1.pct },
      cm2: { value: Math.round(baseData.cm2.value * mult), pct: baseData.cm2.pct },
      cm3: { value: Math.round(baseData.cm3.value * mult), pct: baseData.cm3.pct },
      ebitda: { value: Math.round(baseData.ebitda.value * mult), pct: baseData.ebitda.pct },
    };
  };

  const currentPnLData = getCurrentPnLData();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <h2 className="text-lg sm:text-xl font-semibold">Profit & Loss</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs text-text-secondary font-medium">View by:</span>
          <div className="flex gap-1 flex-wrap">
            {['Total', 'Quarter', 'Month', 'Week', 'Day', 'Custom'].map(p => (
              <button key={p} onClick={() => {
                setTimePeriod(p);
                if (p === 'Custom') {
                  setShowCustomDatePicker(true);
                } else {
                  setShowCustomDatePicker(false);
                }
              }} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${timePeriod === p ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Picker */}
      {showCustomDatePicker && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 mx-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-medium text-text-primary">Custom Date Range:</span>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-secondary">From:</label>
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-1.5 bg-bg-elevated border border-border rounded-md text-xs text-text-primary outline-none focus:border-brand-blue"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-secondary">To:</label>
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-1.5 bg-bg-elevated border border-border rounded-md text-xs text-text-primary outline-none focus:border-brand-blue"
                />
              </div>
              <button
                onClick={() => {
                  // Here you would normally apply the custom date range to filter the data
                  console.log('Applying custom date range:', customDateRange);
                }}
                className="px-4 py-1.5 bg-brand-blue text-white text-xs font-medium rounded-md hover:bg-brand-blue/90 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mx-1">
        <KPICard label="Net Revenue" value={formatCurrencyValue(currentPnLData.netRevenue.value)} change={9.5} sparkline={pnlTrend.map(t => t.netRevenue / 1000)} />
        <KPICard 
          label="CM1" 
          value={`${currentPnLData.cm1.pct}%`} 
          change={8.2} 
          sparkline={pnlTrend.map(t => (t.cm1 / t.netRevenue) * 100)} 
          secondary={formatCurrencyValue(currentPnLData.cm1.value)}
        />
        <KPICard 
          label="CM2" 
          value={`${currentPnLData.cm2.pct}%`} 
          change={6.1} 
          sparkline={pnlTrend.map(t => (t.cm2 / t.netRevenue) * 100)} 
          secondary={formatCurrencyValue(currentPnLData.cm2.value)}
        />
        <KPICard 
          label="CM3" 
          value={`${currentPnLData.cm3.pct}%`} 
          change={11.8} 
          sparkline={pnlTrend.map(t => (t.cm3 / t.netRevenue) * 100)} 
          secondary={formatCurrencyValue(currentPnLData.cm3.value)}
        />
        <KPICard 
          label="EBITDA" 
          value={`${currentPnLData.ebitda.pct}%`} 
          change={14.2} 
          sparkline={pnlTrend.map(t => ((t.cm3 * 0.76) / t.netRevenue) * 100)} 
          secondary={formatCurrencyValue(currentPnLData.ebitda.value)}
        />
      </div>

      {/* Trend Chart */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-secondary">Margin Levels Over Time</h3>
          <DataSource source="Google Sheets" className="shrink-0" />
        </div>
        <div className="min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
          <LineChart data={marginTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} interval={0} />
            <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="netRevenue" name="Net Revenue" stroke="#34D399" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cm1" name="CM1" stroke="#EDBF63" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cm2" name="CM2" stroke="#4A6BD6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cm3" name="CM3" stroke="#A855F7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* P&L Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center justify-between w-full">
            <h3 className="text-sm font-medium text-text-primary">P&L Breakdown</h3>
            <DataSource source="Google Sheets" className="shrink-0" />
          </div>
        </div>
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronsUpDown size={13} />
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto -mx-1 sm:mx-0">
          <div className="min-w-[600px]">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-secondary uppercase">
                <th className="text-left py-3 px-3 font-medium w-1/3">Line Item</th>
                <th className="text-right py-3 px-3 font-medium">Value</th>
                <th className="text-right py-3 px-3 font-medium">% of Revenue</th>
              </tr>
            </thead>
            <tbody>
              {pnlRows.flatMap((row) => {
                const rows = [
                  <tr
                    key={row.label}
                    className="border-b border-border/50 cursor-pointer hover:bg-bg-elevated/30 transition-colors"
                    onClick={() => toggle(row.label)}
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <span className="w-1 h-6 rounded-full shrink-0" style={{ background: row.color }} />
                        {row.children && row.children.length > 0 ? (
                          expanded[row.label] ? <ChevronDown size={14} className="text-text-secondary" /> : <ChevronRight size={14} className="text-text-secondary" />
                        ) : <span className="w-3.5" />}
                        <span className="text-text-primary font-semibold">{row.label}</span>
                        <InfoTooltip metric={row.label} />
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right text-text-primary font-semibold">{formatCurrencyValue(row.value)}</td>
                    <td className="py-3.5 px-3 text-right text-text-secondary">
                      {row.pct !== undefined ? `${row.pct.toFixed(1)}%` : row.value > 0 ? `${((row.value / pnlData.netRevenue.value) * 100).toFixed(1)}%` : ','}
                    </td>
                  </tr>
                ];
                if (expanded[row.label] && row.children) {
                  row.children.forEach((child) => {
                    rows.push(
                      <tr key={`${row.label}-${child.label}`} className="border-b border-border/20 hover:bg-bg-elevated/20 transition-colors">
                        <td className="py-2.5 px-3 pl-14">
                          <div className="flex items-center gap-2 text-text-secondary">
                            {child.label}
                            <InfoTooltip metric={child.label} />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-text-secondary">
                          {typeof child.value === 'number' && Math.abs(child.value) > 100
                            ? formatCurrencyValue(child.value)
                            : child.value.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-text-tertiary">
                          {child.pct !== undefined ? `${child.pct.toFixed(1)}%` : ','}
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
      </div>
    </div>
  );
}
