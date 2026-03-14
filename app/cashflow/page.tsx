'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import ExportButton from '@/components/ui/ExportButton';
import { cashFlowDefaults, cohortWaterfall, monthlySummary, sensitivityCards } from '@/lib/sample-data';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Check, AlertTriangle } from 'lucide-react';

export default function CashFlowPage() {
  const [inputs, setInputs] = useState(cashFlowDefaults);

  const months = ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12'] as const;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <h2 className="text-lg font-semibold">Cash Flow Analysis</h2>

      {/* Input Panel */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium text-text-secondary mb-4">Model Inputs</h3>
        <div className="grid grid-cols-6 gap-4">
          {[
            { label: 'AOV', key: 'aov' as const, prefix: '₱' },
            { label: 'CPA', key: 'cpa' as const, prefix: '₱' },
            { label: 'Gross Margin %', key: 'grossMargin' as const, suffix: '%' },
            { label: 'Monthly Growth %', key: 'monthlyGrowth' as const, suffix: '%' },
            { label: 'M1 Spend', key: 'm1Spend' as const, prefix: '₱' },
            { label: 'Untracked Lift %', key: 'untrackedLift' as const, suffix: '%' },
          ].map(({ label, key, prefix, suffix }) => (
            <div key={key}>
              <label className="block text-xs text-text-tertiary mb-1.5">{label} <InfoTooltip metric={label === 'AOV' ? 'AOV' : label === 'CPA' ? 'nCAC' : label} /></label>
              <div className="flex items-center bg-bg-elevated border border-border rounded-md">
                {prefix && <span className="pl-2.5 text-xs text-text-tertiary">{prefix}</span>}
                <input
                  type="number"
                  value={inputs[key]}
                  onChange={(e) => setInputs(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                  className="w-full bg-transparent px-2.5 py-2 text-sm text-text-primary outline-none"
                />
                {suffix && <span className="pr-2.5 text-xs text-text-tertiary">{suffix}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4">
          <label className="text-xs text-text-tertiary">Retention Model:</label>
          {['E-Commerce', 'Subscription', 'Custom'].map((model) => (
            <button
              key={model}
              className={`px-3 py-1 rounded-md text-xs ${inputs.retentionModel === model.toLowerCase().replace('-','') ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              {model}
            </button>
          ))}
        </div>
      </div>

      {/* 12-Month Outlook */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Peak Deficit', value: '₱0', desc: 'No deficit projected', metric: 'Peak Deficit' },
          { label: 'Ending Position', value: '₱13.4M', desc: 'Cumulative cash at M12', metric: 'Peak Deficit' },
          { label: 'Monthly Break-Even', value: 'Month 1', desc: 'Profitable from start', metric: 'Monthly Break-Even' },
          { label: 'Total Spend', value: '₱5.93M', desc: '12-month acquisition spend', metric: 'Marketing Costs' },
          { label: 'LTV:CAC', value: '3.15x', desc: 'Healthy unit economics', metric: 'LTV:CAC' },
        ].map((card) => (
          <div key={card.label} className="bg-bg-surface border border-border rounded-lg p-4">
            <div className="text-xs text-text-tertiary mb-1 flex items-center">{card.label} <InfoTooltip metric={card.metric} /></div>
            <div className="text-xl font-bold text-text-primary">{card.value}</div>
            <div className="text-xs text-text-secondary mt-1">{card.desc}</div>
          </div>
        ))}
      </div>

      {/* Cohort Waterfall Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-primary">Cohort Waterfall (₱ thousands)</h3>
          <ExportButton />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-tertiary uppercase">
                <th className="text-left py-2 px-2 font-medium">Cohort</th>
                {months.map((m, i) => (
                  <th key={m} className="text-right py-2 px-2 font-medium">M{i + 1}</th>
                ))}
                <th className="text-center py-2 px-2 font-medium">B/E</th>
              </tr>
            </thead>
            <tbody>
              {cohortWaterfall.map((row) => (
                <tr key={row.cohort} className="border-b border-border/30 hover:bg-bg-elevated/50">
                  <td className="py-2 px-2 font-medium text-text-primary">{row.cohort}</td>
                  {months.map((m) => {
                    const val = row[m];
                    return (
                      <td key={m} className={`py-2 px-2 text-right ${val < 0 ? 'text-danger' : val > 0 ? 'text-success' : 'text-text-tertiary'}`}>
                        {val !== 0 ? val : '—'}
                      </td>
                    );
                  })}
                  <td className="py-2 px-2 text-center">
                    <Check size={14} className="inline text-success" />
                    <span className="text-text-tertiary ml-1">M{row.breakEvenMonth}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Revenue Composition */}
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Revenue Composition</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlySummary.map(m => ({
              month: m.month,
              new: m.newCust * inputs.aov,
              repeat: m.repeatOrders * inputs.aov * 0.7,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: '#161927', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="new" name="New Revenue" stackId="1" fill="#4A6BD6" stroke="#4A6BD6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="repeat" name="Repeat Revenue" stackId="1" fill="#34D399" stroke="#34D399" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cash Flow Waterfall */}
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Cumulative Cash Flow</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlySummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: '#161927', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="cumulative" name="Cumulative Cash" fill="#34D399" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sensitivity Analysis */}
      <div className="grid grid-cols-4 gap-4">
        {sensitivityCards.map((card) => (
          <div key={card.label} className="bg-bg-surface border border-border rounded-lg p-4">
            <div className="text-xs font-medium text-warm-gold mb-2">{card.label}</div>
            <div className="text-xs text-text-tertiary mb-1">{card.metric}</div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary">Current: {card.current}</span>
              <span className="text-xs text-success">→ {card.adjusted}</span>
            </div>
            <div className="text-xs text-brand-blue-light font-medium">{card.impact}</div>
          </div>
        ))}
      </div>

      {/* Monthly Summary Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-primary">Monthly Summary</h3>
          <ExportButton />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-tertiary uppercase">
                <th className="text-left py-2 px-2 font-medium">Month</th>
                <th className="text-right py-2 px-2 font-medium">New Cust</th>
                <th className="text-right py-2 px-2 font-medium">Acq Spend</th>
                <th className="text-right py-2 px-2 font-medium">Repeat Orders</th>
                <th className="text-right py-2 px-2 font-medium">Total Revenue</th>
                <th className="text-right py-2 px-2 font-medium">Gross Profit</th>
                <th className="text-right py-2 px-2 font-medium">Net Cash</th>
                <th className="text-right py-2 px-2 font-medium">Cumulative</th>
                <th className="text-right py-2 px-2 font-medium">LTV:CAC <InfoTooltip metric="LTV:CAC" /></th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary.map((row) => (
                <tr key={row.month} className="border-b border-border/30 hover:bg-bg-elevated/50">
                  <td className="py-2 px-2 font-medium text-text-primary">{row.month}</td>
                  <td className="py-2 px-2 text-right text-text-secondary">{row.newCust}</td>
                  <td className="py-2 px-2 text-right text-text-secondary">{formatCurrency(row.acqSpend)}</td>
                  <td className="py-2 px-2 text-right text-text-secondary">{row.repeatOrders}</td>
                  <td className="py-2 px-2 text-right text-text-primary">{formatCurrency(row.totalRevenue)}</td>
                  <td className="py-2 px-2 text-right text-success">{formatCurrency(row.grossProfit)}</td>
                  <td className="py-2 px-2 text-right text-text-primary">{formatCurrency(row.netCash)}</td>
                  <td className="py-2 px-2 text-right text-text-primary font-medium">{formatCurrency(row.cumulative)}</td>
                  <td className="py-2 px-2 text-right">
                    <span className={row.ltvCac >= 3 ? 'text-success' : row.ltvCac >= 2 ? 'text-warm-gold' : 'text-danger'}>
                      {row.ltvCac.toFixed(2)}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
