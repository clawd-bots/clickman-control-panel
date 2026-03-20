'use client';
import { useState, useMemo, useEffect } from 'react';
import KPICard from '@/components/ui/KPICard';
import DataSource from '@/components/ui/DataSource';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { pnlData, pnlTrend } from '@/lib/sample-data';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/components/CurrencyProvider';
import { useDateRange } from '@/components/DateProvider';
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

// Extended P&L structure with hierarchical accordion
const extendedPnlRows: PnlRow[] = [
  { 
    label: 'GMV', 
    value: pnlData.gmv.value, 
    color: '#EDBF63', 
    isHeader: true, 
    children: [
      { label: 'Gross Orders', value: 1240 },
      { label: 'Gross AOV', value: 2298 },
      { label: 'Product Revenue', value: 2765000 },
      { label: 'Shipping Revenue', value: 85000 },
      ...pnlData.gmv.items.map(i => ({ label: i.label, value: i.value, pct: i.pct }))
    ]
  },
  { 
    label: 'Gross Revenue', 
    value: pnlData.grossRevenue.value, 
    color: '#F97316', 
    isHeader: true, 
    children: [
      { label: 'Net GMV (after discounts)', value: 2553000 },
      { label: 'Payment Processing', value: -45000, pct: -1.8 },
      { label: 'Chargebacks', value: -12000, pct: -0.5 },
      { label: 'Refunds', value: -18000, pct: -0.7 },
      ...pnlData.grossRevenue.items.map(i => ({ label: i.label, value: i.value, pct: i.pct }))
    ]
  },
  { 
    label: 'Net Revenue', 
    value: pnlData.netRevenue.value, 
    color: '#34D399', 
    isHeader: true, 
    children: [
      { label: 'Net Orders', value: 1126 },
      { label: 'Net AOV', value: 2001 },
      { label: 'Revenue per Customer', value: 1425 },
      { label: 'Repeat Customer %', value: 41.4, pct: 41.4 },
      ...pnlData.netRevenue.items.map(i => ({ label: i.label, value: i.value, pct: i.pct }))
    ]
  },
  { 
    label: 'COGS', 
    value: -675900, 
    pct: -30.0, 
    color: '#EF4444', 
    isHeader: true, 
    children: [
      { label: 'Raw Materials', value: -485000, pct: -21.5 },
      { label: 'Manufacturing', value: -125000, pct: -5.5 },
      { label: 'Quality Control', value: -32000, pct: -1.4 },
      { label: 'Packaging', value: -23900, pct: -1.1 },
      { label: 'Inventory Write-offs', value: -10000, pct: -0.4 }
    ]
  },
  { 
    label: 'CM1', 
    value: pnlData.cm1.value, 
    pct: pnlData.cm1.pct, 
    color: '#EDBF63', 
    isHeader: true, 
    children: [
      { label: 'CM1 Margin %', value: 70.0, pct: 70.0 },
      { label: 'Fulfillment Center Costs', value: -98000, pct: -4.4 },
      { label: 'Shipping & Delivery', value: -85000, pct: -3.8 },
      { label: 'Packaging Materials', value: -25000, pct: -1.1 },
      { label: 'Customer Service', value: -17300, pct: -0.8 },
      ...pnlData.cm1.items.map(i => ({ label: i.label, value: i.value, pct: i.pct }))
    ]
  },
  { 
    label: 'Operating Expenses', 
    value: -613000, 
    pct: -27.2, 
    color: '#8B5CF6', 
    isHeader: true, 
    children: [
      { label: 'Marketing Costs', value: -613000, pct: -27.2 },
      { label: '  Meta Ads', value: -320000, pct: -14.2 },
      { label: '  Google Ads', value: -165000, pct: -7.3 },
      { label: '  TikTok Ads', value: -88000, pct: -3.9 },
      { label: '  Creative Production', value: -25000, pct: -1.1 },
      { label: '  Attribution & Analytics', value: -15000, pct: -0.7 }
    ]
  },
  { 
    label: 'CM2', 
    value: pnlData.cm2.value, 
    pct: pnlData.cm2.pct, 
    color: '#4A6BD6', 
    isHeader: true, 
    children: [
      { label: 'CM2 Margin %', value: 55.0, pct: 55.0 },
      { label: 'CM2 per Order', value: 1101 },
      { label: 'CM2 per Customer', value: 1591 },
      ...pnlData.cm2.items.map(i => ({ label: i.label, value: i.value, pct: i.pct }))
    ]
  },
  { 
    label: 'Overhead', 
    value: -150000, 
    pct: -6.7, 
    color: '#F59E0B', 
    isHeader: true, 
    children: [
      { label: 'Salaries & Benefits', value: -85000, pct: -3.8 },
      { label: 'Software & Tools', value: -28000, pct: -1.2 },
      { label: 'Office & Equipment', value: -15000, pct: -0.7 },
      { label: 'Legal & Professional', value: -12000, pct: -0.5 },
      { label: 'Insurance', value: -7000, pct: -0.3 },
      { label: 'Other Admin', value: -3000, pct: -0.1 }
    ]
  },
  { 
    label: 'CM3', 
    value: pnlData.cm3.value, 
    pct: pnlData.cm3.pct, 
    color: '#A855F7', 
    isHeader: true, 
    children: [
      { label: 'CM3 Margin %', value: 27.8, pct: 27.8 },
      { label: 'CM3 per Order', value: 556 },
      { label: 'CM3 per Customer', value: 804 },
      ...pnlData.cm3.items.map(i => ({ label: i.label, value: i.value, pct: (i as { pct?: number }).pct }))
    ]
  },
  { 
    label: 'EBITDA', 
    value: pnlData.ebitda.value, 
    pct: pnlData.ebitda.pct, 
    color: '#34D399', 
    isHeader: true, 
    children: [
      { label: 'EBITDA Margin %', value: 21.1, pct: 21.1 },
      { label: 'EBITDA per Order', value: 423 },
      { label: 'EBITDA per Customer', value: 611 },
      { label: 'Monthly EBITDA', value: 158717 },
      { label: 'Daily EBITDA', value: 15360 }
    ]
  },
];

export default function PnLPage() {
  const { currency, convertValue } = useCurrency();
  const { dateRange } = useDateRange();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [timePeriod, setTimePeriod] = useState('Total');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

  // Update local state when global date context changes
  useEffect(() => {
    // Map global date preset to local time period
    const presetMapping: Record<string, string> = {
      'today': 'Day',
      'yesterday': 'Day', 
      '7d': 'Week',
      '30d': 'Month',
      'this-month': 'Month',
      'last-month': 'Month',
      'this-quarter': 'Quarter',
      'custom': 'Custom'
    };
    
    const mappedPeriod = presetMapping[dateRange.preset] || 'Total';
    setTimePeriod(mappedPeriod);
    
    // Handle custom date ranges
    if (dateRange.preset === 'custom') {
      setCustomDateRange({
        start: dateRange.startDate.toISOString().split('T')[0],
        end: dateRange.endDate.toISOString().split('T')[0]
      });
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
    }
  }, [dateRange]);

  // Get data based on selected date range with proper aggregation
  const getCurrentPnLData = useMemo(() => {
    const baseData = pnlData;
    
    // Calculate multiplier based on date range and preset
    let mult = 1;
    
    if (dateRange.preset === 'today' || dateRange.preset === 'yesterday') {
      mult = 0.0033; // Daily
    } else if (dateRange.preset === '7d') {
      mult = 0.025; // Weekly  
    } else if (dateRange.preset === '30d' || dateRange.preset === 'this-month' || dateRange.preset === 'last-month') {
      mult = 0.1; // Monthly
    } else if (dateRange.preset === 'this-quarter') {
      mult = 0.33; // Quarterly
    } else if (dateRange.preset === 'custom') {
      // Calculate based on actual date range
      const days = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
      mult = days / 365; // Scale based on days relative to full year
    }
    
    return {
      netRevenue: { value: Math.round(baseData.netRevenue.value * mult) },
      cm1: { value: Math.round(baseData.cm1.value * mult), pct: baseData.cm1.pct },
      cm2: { value: Math.round(baseData.cm2.value * mult), pct: baseData.cm2.pct },
      cm3: { value: Math.round(baseData.cm3.value * mult), pct: baseData.cm3.pct },
      ebitda: { value: Math.round(baseData.ebitda.value * mult), pct: baseData.ebitda.pct },
    };
  }, [dateRange]);

  // Generate margin chart data with proper date aggregation
  const marginTrendData = useMemo(() => {
    const rangeDays = getDateRangeDays();
    
    if (rangeDays <= 14) {
      // Daily data - expand existing monthly data into daily points
      const dailyData = [];
      for (let i = 0; i < 14; i++) {
        const baseData = pnlTrend[i % pnlTrend.length];
        dailyData.push({
          period: `Day ${i + 1}`,
          cm1: ((baseData.cm1 / baseData.netRevenue) * 100),
          cm2: ((baseData.cm2 / baseData.netRevenue) * 100),
          cm3: ((baseData.cm3 / baseData.netRevenue) * 100),
        });
      }
      return dailyData;
    } else if (rangeDays <= 90) {
      // Weekly data - aggregate monthly into weekly
      return pnlTrend.map((item, index) => ({
        period: `W${index + 1}`,
        cm1: ((item.cm1 / item.netRevenue) * 100),
        cm2: ((item.cm2 / item.netRevenue) * 100),
        cm3: ((item.cm3 / item.netRevenue) * 100),
      }));
    } else {
      // Monthly data (original)
      return pnlTrend.map(item => ({
        period: item.month,
        cm1: ((item.cm1 / item.netRevenue) * 100),
        cm2: ((item.cm2 / item.netRevenue) * 100),
        cm3: ((item.cm3 / item.netRevenue) * 100),
      }));
    }
  }, [timePeriod, customDateRange]);

  // Calculate date range in days for chart aggregation
  function getDateRangeDays(): number {
    if (timePeriod === 'Custom' && customDateRange.start && customDateRange.end) {
      const start = new Date(customDateRange.start);
      const end = new Date(customDateRange.end);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    const rangeDaysMap = {
      'Day': 1,
      'Week': 7,
      'Month': 30,
      'Quarter': 90,
      'Total': 365
    };
    
    return rangeDaysMap[timePeriod as keyof typeof rangeDaysMap] || 365;
  }

  const toggle = (label: string) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  const allExpandable = extendedPnlRows.filter(r => r.children && r.children.length > 0).map(r => r.label);
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <h2 className="text-lg sm:text-xl font-semibold">Profit & Loss</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-medium">
            Current Period: <span className="text-text-primary font-semibold">{timePeriod}</span>
          </span>
        </div>
      </div>



      {/* KPI Cards - PNL-1: EBITDA shows currency value, not percentage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mx-1">
        <KPICard label="Net Revenue" value={formatCurrencyValue(getCurrentPnLData.netRevenue.value)} change={9.5} sparkline={pnlTrend.map(t => t.netRevenue / 1000)} />
        <KPICard 
          label="CM1" 
          value={`${getCurrentPnLData.cm1.pct}%`} 
          change={8.2} 
          sparkline={pnlTrend.map(t => (t.cm1 / t.netRevenue) * 100)} 
          secondary={formatCurrencyValue(getCurrentPnLData.cm1.value)}
        />
        <KPICard 
          label="CM2" 
          value={`${getCurrentPnLData.cm2.pct}%`} 
          change={6.1} 
          sparkline={pnlTrend.map(t => (t.cm2 / t.netRevenue) * 100)} 
          secondary={formatCurrencyValue(getCurrentPnLData.cm2.value)}
        />
        <KPICard 
          label="CM3" 
          value={`${getCurrentPnLData.cm3.pct}%`} 
          change={11.8} 
          sparkline={pnlTrend.map(t => (t.cm3 / t.netRevenue) * 100)} 
          secondary={formatCurrencyValue(getCurrentPnLData.cm3.value)}
        />
        <KPICard 
          label="EBITDA" 
          value={formatCurrencyValue(getCurrentPnLData.ebitda.value)}
          change={14.2} 
          sparkline={pnlTrend.map(t => ((t.cm3 * 0.76) / t.netRevenue) * 100)}
        />
      </div>

      {/* Trend Chart - PNL-2 & PNL-3: Fixed Y-axis scale, removed Net Revenue, syncs with date selector */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-secondary">Margin Levels Over Time</h3>
          <DataSource source="Google Sheets" className="shrink-0" />
        </div>
        <div className="min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={marginTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis 
                dataKey="period" 
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} 
                angle={-45} 
                textAnchor="end" 
                height={60} 
                interval={0} 
              />
              <YAxis 
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--color-bg-surface)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 8, 
                  fontSize: 12 
                }}
                formatter={(value) => value ? [`${(value as number).toFixed(1)}%`, ''] : ['', '']}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="cm1" name="CM1" stroke="#EDBF63" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cm2" name="CM2" stroke="#4A6BD6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cm3" name="CM3" stroke="#A855F7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P&L Table - PNL-4: Expanded accordion with full hierarchy */}
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
              {extendedPnlRows.flatMap((row) => {
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
                      {row.pct !== undefined ? `${row.pct.toFixed(1)}%` : row.value > 0 ? `${((row.value / pnlData.netRevenue.value) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ];
                if (expanded[row.label] && row.children) {
                  row.children.forEach((child) => {
                    rows.push(
                      <tr key={`${row.label}-${child.label}`} className="border-b border-border/20 hover:bg-bg-elevated/20 transition-colors">
                        <td className="py-2.5 px-3 pl-14">
                          <div className={`flex items-center gap-2 text-text-secondary ${child.label.startsWith('  ') ? 'pl-4 text-text-tertiary' : ''}`}>
                            {child.label.replace(/^  /, '')}
                            <InfoTooltip metric={child.label.replace(/^  /, '')} />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-text-secondary">
                          {typeof child.value === 'number' && Math.abs(child.value) > 100
                            ? formatCurrencyValue(child.value)
                            : child.value.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-text-tertiary">
                          {child.pct !== undefined ? `${child.pct.toFixed(1)}%` : '—'}
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