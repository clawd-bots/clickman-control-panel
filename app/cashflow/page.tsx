'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import ExportButton from '@/components/ui/ExportButton';
import { cashFlowDefaults, cohortWaterfall, monthlySummary, sensitivityCards } from '@/lib/sample-data';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Check } from 'lucide-react';

export default function CashFlowPage() {
  const [inputs, setInputs] = useState({
    ...cashFlowDefaults,
    subAttachRate: 0,
    subRetentionM1: 85,
    subRetentionM3: 70,
    subRetentionM6: 55,
    subRetentionM12: 40,
  });

  const months = ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12'] as const;

  const allSensitivityCards = [
    ...sensitivityCards,
    { label: 'Sub Attach +10%', metric: 'Year-End Cash', current: '₱13.4M', adjusted: '₱14.8M', impact: '+₱1.4M from recurring rev' },
  ];

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
              <label className="block text-xs text-text-secondary mb-1.5">{label} <InfoTooltip metric={label} /></label>
              <div className="flex items-center bg-bg-elevated border border-border rounded-md">
                {prefix && <span className="pl-2.5 text-xs text-text-secondary">{prefix}</span>}
                <input
                  type="number"
                  value={inputs[key]}
                  onChange={(e) => setInputs(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                  className="w-full bg-transparent px-2.5 py-2 text-sm text-text-primary outline-none"
                />
                {suffix && <span className="pr-2.5 text-xs text-text-secondary">{suffix}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Subscription Model Section */}
        <div className="mt-5 pt-4 border-t border-border">
          <h4 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wide">Subscription Model (Hybrid)</h4>
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Attach Rate <InfoTooltip metric="Subscription Attach Rate" /></label>
              <div className="flex items-center bg-bg-elevated border border-border rounded-md">
                <input
                  type="number"
                  value={inputs.subAttachRate}
                  onChange={(e) => setInputs(prev => ({ ...prev, subAttachRate: Number(e.target.value) }))}
                  className="w-full bg-transparent px-2.5 py-2 text-sm text-text-primary outline-none"
                />
                <span className="pr-2.5 text-xs text-text-secondary">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Sub Retention M1</label>
              <div className="flex items-center bg-bg-elevated border border-border rounded-md">
                <input type="number" value={inputs.subRetentionM1} onChange={(e) => setInputs(prev => ({ ...prev, subRetentionM1: Number(e.target.value) }))}
                  className="w-full bg-transparent px-2.5 py-2 text-sm text-text-primary outline-none" />
                <span className="pr-2.5 text-xs text-text-secondary">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Sub Retention M3</label>
              <div className="flex items-center bg-bg-elevated border border-border rounded-md">
                <input type="number" value={inputs.subRetentionM3} onChange={(e) => setInputs(prev => ({ ...prev, subRetentionM3: Number(e.target.value) }))}
                  className="w-full bg-transparent px-2.5 py-2 text-sm text-text-primary outline-none" />
                <span className="pr-2.5 text-xs text-text-secondary">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Sub Retention M6</label>
              <div className="flex items-center bg-bg-elevated border border-border rounded-md">
                <input type="number" value={inputs.subRetentionM6} onChange={(e) => setInputs(prev => ({ ...prev, subRetentionM6: Number(e.target.value) }))}
                  className="w-full bg-transparent px-2.5 py-2 text-sm text-text-primary outline-none" />
                <span className="pr-2.5 text-xs text-text-secondary">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Sub Retention M12</label>
              <div className="flex items-center bg-bg-elevated border border-border rounded-md">
                <input type="number" value={inputs.subRetentionM12} onChange={(e) => setInputs(prev => ({ ...prev, subRetentionM12: Number(e.target.value) }))}
                  className="w-full bg-transparent px-2.5 py-2 text-sm text-text-primary outline-none" />
                <span className="pr-2.5 text-xs text-text-secondary">%</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Currently {inputs.subAttachRate}% subscription attach rate. {inputs.subAttachRate === 0 ? 'Projected subscription launch in 1–2 months.' : ''}
          </p>
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
          <div key={card.label} className="bg-bg-surface border border-border rounded-lg p-4 min-w-0">
            <div className="text-xs text-text-secondary mb-1 flex items-center truncate">{card.label} <InfoTooltip metric={card.metric} /></div>
            <div className="text-xl font-bold text-text-primary truncate">{card.value}</div>
            <div className="text-xs text-text-secondary mt-1 truncate">{card.desc}</div>
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
              <tr className="border-b border-border text-text-secondary uppercase">
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
                    <span className="text-text-secondary ml-1">M{row.breakEvenMonth}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Revenue Composition — now with 3 streams */}
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Revenue Composition</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlySummary.map(m => ({
              month: m.month,
              new: m.newCust * inputs.aov * (1 - inputs.subAttachRate / 100),
              repeat: m.repeatOrders * inputs.aov * 0.7,
              subscription: m.newCust * inputs.aov * (inputs.subAttachRate / 100) * (inputs.subRetentionM6 / 100),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2E2B" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: '#1A1D1B', border: '1px solid #2A2E2B', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="new" name="New (One-time)" stackId="1" fill="#4A6BD6" stroke="#4A6BD6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="repeat" name="Repeat (One-time)" stackId="1" fill="#34D399" stroke="#34D399" fillOpacity={0.6} />
              <Area type="monotone" dataKey="subscription" name="Subscription" stackId="1" fill="#EDBF63" stroke="#EDBF63" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cash Flow Waterfall */}
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Cumulative Cash Flow</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlySummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2E2B" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: '#1A1D1B', border: '1px solid #2A2E2B', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="cumulative" name="Cumulative Cash" fill="#34D399" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sensitivity Analysis */}
      <div className="grid grid-cols-5 gap-4">
        {allSensitivityCards.map((card) => (
          <div key={card.label} className="bg-bg-surface border border-border rounded-lg p-4 min-w-0">
            <div className="text-xs font-medium text-warm-gold mb-2 truncate">{card.label}</div>
            <div className="text-xs text-text-secondary mb-1">{card.metric}</div>
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
              <tr className="border-b border-border text-text-secondary uppercase">
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
