'use client';
import { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import ExportButton from '@/components/ui/ExportButton';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { pnlData, pnlTrend } from '@/lib/sample-data';
import { formatCurrency } from '@/lib/utils';
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [timePeriod, setTimePeriod] = useState('Total');

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

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Profit & Loss</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-medium">View by:</span>
          <div className="flex gap-1">
            {['Total', 'Quarter', 'Month', 'Week', 'Day'].map(p => (
              <button key={p} onClick={() => setTimePeriod(p)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${timePeriod === p ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard label="Net Revenue" value={formatCurrency(pnlData.netRevenue.value)} change={9.5} sparkline={pnlTrend.map(t => t.netRevenue / 1000)} />
        <KPICard label="CM1" value={formatCurrency(pnlData.cm1.value)} change={8.2} sparkline={pnlTrend.map(t => t.cm1 / 1000)} />
        <KPICard label="CM2" value={formatCurrency(pnlData.cm2.value)} change={6.1} sparkline={pnlTrend.map(t => t.cm2 / 1000)} />
        <KPICard label="CM3" value={formatCurrency(pnlData.cm3.value)} change={11.8} sparkline={pnlTrend.map(t => t.cm3 / 1000)} />
        <KPICard label="EBITDA" value={formatCurrency(pnlData.ebitda.value)} change={14.2} sparkline={pnlTrend.map(t => t.cm3 * 0.76 / 1000)} />
      </div>

      {/* Trend Chart */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-text-secondary mb-4">Margin Levels Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={pnlTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2E2B" />
            <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000000).toFixed(1)}M`} />
            <Tooltip contentStyle={{ background: '#1A1D1B', border: '1px solid #2A2E2B', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="netRevenue" name="Net Revenue" stroke="#34D399" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cm1" name="CM1" stroke="#EDBF63" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cm2" name="CM2" stroke="#4A6BD6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cm3" name="CM3" stroke="#A855F7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* P&L Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-primary">P&L Breakdown</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronsUpDown size={13} />
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
            <ExportButton />
          </div>
        </div>
        <div className="overflow-x-auto">
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
                    <td className="py-3.5 px-3 text-right text-text-primary font-semibold">{formatCurrency(row.value)}</td>
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
                          <div className="flex items-center gap-2 text-text-secondary">
                            {child.label}
                            <InfoTooltip metric={child.label} />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-text-secondary">
                          {typeof child.value === 'number' && Math.abs(child.value) > 100
                            ? formatCurrency(child.value)
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
  );
}
