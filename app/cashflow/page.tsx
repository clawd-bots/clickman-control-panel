'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';

import { cashFlowDefaults, cohortWaterfall, monthlySummary, sensitivityCards } from '@/lib/sample-data';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/components/CurrencyProvider';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Check } from 'lucide-react';

export default function CashFlowPage() {
  const { currency, convertValue } = useCurrency();
  const [inputs, setInputs] = useState({
    ...cashFlowDefaults,
    subAttachRate: 0,
    subRetentionM1: 85,
    subRetentionM3: 70,
    subRetentionM6: 55,
    subRetentionM12: 40,
  });

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

  // Use real months instead of M1/M2 (Apr '26, May '26, etc.)
  const months = ['Apr 26','May 26','Jun 26','Jul 26','Aug 26','Sep 26','Oct 26','Nov 26','Dec 26','Jan 27','Feb 27','Mar 27'] as const;
  const monthKeys = ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12'] as const;

  // Save/Load Models functionality
  const saveModel = () => {
    const modelData = {
      inputs,
      timestamp: new Date().toISOString(),
      name: `Cash Flow Model - ${new Date().toLocaleDateString()}`
    };
    localStorage.setItem('clickman-cashflow-model', JSON.stringify(modelData));
  };

  const loadModel = () => {
    const saved = localStorage.getItem('clickman-cashflow-model');
    if (saved) {
      const modelData = JSON.parse(saved);
      setInputs(modelData.inputs);
    }
  };

  const allSensitivityCards = [
    { 
      label: 'AOV +10%', 
      metric: 'Year-End Cash', 
      current: formatCurrencyValue(13400000), 
      adjusted: formatCurrencyValue(14740000), 
      impact: `+${formatCurrencyValue(1340000)} from higher order values`,
      explanation: 'Higher average order value directly increases revenue per acquisition without additional marketing spend, improving cash flow efficiency.'
    },
    { 
      label: 'CPA -15%', 
      metric: 'Year-End Cash', 
      current: formatCurrencyValue(13400000), 
      adjusted: formatCurrencyValue(15200000), 
      impact: `+${formatCurrencyValue(1800000)} from lower acquisition costs`,
      explanation: 'Reducing cost per acquisition through better targeting or conversion optimization directly improves unit economics and cash generation.'
    },
    { 
      label: 'Retention +5%', 
      metric: 'Year-End Cash', 
      current: formatCurrencyValue(13400000), 
      adjusted: formatCurrencyValue(14100000), 
      impact: `+${formatCurrencyValue(700000)} from repeat purchases`,
      explanation: 'Higher retention rates increase lifetime value by generating more repeat orders from existing customers, compounding over time.'
    },
    { 
      label: 'Growth +2%', 
      metric: 'Year-End Cash', 
      current: formatCurrencyValue(13400000), 
      adjusted: formatCurrencyValue(16800000), 
      impact: `+${formatCurrencyValue(3400000)} from accelerated scaling`,
      explanation: 'Higher monthly growth rate compounds acquisition and revenue, but requires proportional increases in working capital for marketing spend.'
    },
    { 
      label: 'Sub Attach +10%', 
      metric: 'Year-End Cash', 
      current: formatCurrencyValue(13400000), 
      adjusted: formatCurrencyValue(14800000), 
      impact: `+${formatCurrencyValue(1400000)} from recurring revenue`,
      explanation: 'Subscription model provides predictable recurring revenue that improves cash flow stability and reduces dependency on constant acquisition.'
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-1">
        <h2 className="text-lg sm:text-xl font-semibold">Cash Flow Analysis</h2>
        <p className="text-sm text-text-secondary mt-2 max-w-4xl">
          <strong>Predictor & Modeling Tool:</strong> This cohort-based cash flow model projects your business performance across 12 months using acquisition spend, customer behavior patterns, and revenue composition. Adjust inputs to model different scenarios and understand working capital requirements. Models include subscription attach rates for hybrid revenue strategies.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={saveModel}
            className="text-xs px-3 py-1.5 bg-brand-blue/15 text-brand-blue-light rounded-md hover:bg-brand-blue/25 transition-colors"
          >
            Save Model
          </button>
          <button
            onClick={loadModel}
            className="text-xs px-3 py-1.5 bg-bg-elevated text-text-secondary border border-border rounded-md hover:bg-bg-surface transition-colors"
          >
            Load Model
          </button>
        </div>
      </div>

      {/* Input Panel */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <h3 className="text-sm font-medium text-text-secondary mb-4">Model Inputs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                {prefix && <span className="pl-2.5 text-xs text-text-secondary">{currency}</span>}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mx-1">
        {[
          { label: 'Peak Deficit', value: formatCurrencyValue(0), desc: 'No deficit projected', metric: 'Peak Deficit' },
          { label: 'Ending Position', value: formatCurrencyValue(13400000), desc: 'Cumulative cash at M12', metric: 'Ending Position' },
          { label: 'Monthly Break-Even', value: 'Month 1', desc: 'Profitable from start', metric: 'Monthly Break-Even' },
          { label: 'Total Spend', value: formatCurrencyValue(5930000), desc: '12-month acquisition spend', metric: 'Total Spend' },
          { label: 'LTV:CAC', value: '3.15x', desc: 'Healthy unit economics', metric: 'LTV:CAC' },
        ].map((card) => (
          <div key={card.label} className="bg-bg-surface border border-border rounded-lg p-4 min-h-[100px] flex flex-col justify-between">
            <div className="text-xs text-text-secondary mb-1 flex items-center gap-1 min-w-0">
              <span className="truncate">{card.label}</span>
              <InfoTooltip metric={card.metric} />
            </div>
            <div className="text-xl font-bold text-text-primary truncate">{card.value}</div>
            <div className="text-xs text-text-secondary mt-1 truncate">{card.desc}</div>
          </div>
        ))}
      </div>

      {/* Cohort Waterfall Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h3 className="text-sm font-medium text-text-primary">Cohort Waterfall ({currency} thousands)</h3>
            <span className="text-xs text-text-tertiary">Forecast Model</span>
          </div>
        </div>
        <div className="overflow-x-auto -mx-1 sm:mx-0">
          <div className="min-w-[800px]">
            <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-secondary uppercase">
                <th className="text-left py-2 px-2 font-medium">Cohort</th>
                {months.map((m, i) => (
                  <th key={m} className="text-right py-2 px-2 font-medium">{m}</th>
                ))}
                <th className="text-center py-2 px-2 font-medium">B/E</th>
              </tr>
            </thead>
            <tbody>
              {cohortWaterfall.map((row) => (
                <tr key={row.cohort} className="border-b border-border/30 hover:bg-bg-elevated/50">
                  <td className="py-2 px-2 font-medium text-text-primary">{row.cohort}</td>
                  {monthKeys.map((mk, i) => {
                    const originalVal = row[mk];
                    const val = convertValue(originalVal);
                    const displayVal = currency === '$' ? (val / 1000).toFixed(1) : Math.round(val / 1000);
                    return (
                      <td key={mk} className={`py-2 px-2 text-right ${originalVal < 0 ? 'text-danger' : originalVal > 0 ? 'text-success' : 'text-text-tertiary'}`}>
                        {originalVal !== 0 ? displayVal : ','}
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
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mx-1">
        {/* Revenue Composition , now with 3 streams */}
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-sm font-medium text-text-secondary">Revenue Composition</h3>
            <span className="text-xs text-text-tertiary">Forecast Model</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-text-secondary mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4A6BD6]" />
              <span>New Customer (One-time)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
              <span>Repeat Customer (One-time)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EDBF63]" />
              <span>Subscription Revenue</span>
            </div>
          </div>
          <div className="min-h-[240px]">
            <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlySummary.map(m => ({
              month: m.month,
              new: m.newCust * inputs.aov * (1 - inputs.subAttachRate / 100),
              repeat: m.repeatOrders * inputs.aov * 0.7,
              subscription: m.newCust * inputs.aov * (inputs.subAttachRate / 100) * (inputs.subRetentionM6 / 100),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                label={{ value: 'Month', position: 'insideBottom', offset: -5, style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} 
              />
              <YAxis 
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                tickFormatter={(v) => `${currency}${(convertValue(v)/1000000).toFixed(1)}M`} 
                label={{ value: `Revenue (${currency}M)`, angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} 
              />
              <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="new" name="New (One-time)" stackId="1" fill="#4A6BD6" stroke="#4A6BD6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="repeat" name="Repeat (One-time)" stackId="1" fill="#34D399" stroke="#34D399" fillOpacity={0.6} />
              <Area type="monotone" dataKey="subscription" name="Subscription" stackId="1" fill="#EDBF63" stroke="#EDBF63" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
          <div className="text-xs text-text-secondary mt-3 pt-3 border-t border-border">
            <strong>Chart Description:</strong> Three revenue streams over time. Blue shows new customer one-time purchases, green shows repeat customer purchases, and gold shows subscription revenue. Subscription revenue grows as attach rate increases and compounds through retention.
          </div>
        </div>

        {/* Cash Flow Waterfall */}
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-sm font-medium text-text-secondary">Cumulative Cash Flow</h3>
            <span className="text-xs text-text-tertiary">Forecast Model</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
            <span>Cumulative Cash Position</span>
          </div>
          <div className="min-h-[240px]">
            <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlySummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                label={{ value: 'Month', position: 'insideBottom', offset: -5, style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} 
              />
              <YAxis 
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                tickFormatter={(v) => `${currency}${(convertValue(v)/1000000).toFixed(1)}M`} 
                label={{ value: `Cash Flow (${currency}M)`, angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} 
              />
              <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="cumulative" name="Cumulative Cash" fill="#34D399" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
          <div className="text-xs text-text-secondary mt-3 pt-3 border-t border-border">
            <strong>Chart Description:</strong> Running total of cash position accounting for revenue inflows, cost of goods sold, and acquisition spend outflows. Green bars show positive cash accumulation month-over-month. Chart helps identify working capital requirements and cash flow timing.
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-text-primary">Sensitivity Analysis</h3>
          <p className="text-xs text-text-secondary mt-1">Impact of key variable changes on 12-month cash position. Shows how operational improvements affect working capital requirements.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {allSensitivityCards.map((card) => (
            <div key={card.label} className="bg-bg-elevated border border-border rounded-lg p-4 min-h-[140px] flex flex-col justify-between">
              <div className="text-xs font-medium text-warm-gold mb-2">{card.label}</div>
              <div>
                <div className="text-xs text-text-secondary mb-1">{card.metric}</div>
                <div className="flex flex-col gap-1 mb-2">
                  <span className="text-xs text-text-secondary">Current: {card.current}</span>
                  <span className="text-xs text-success">→ {card.adjusted}</span>
                </div>
                <div className="text-xs text-brand-blue-light font-medium mb-2">{card.impact}</div>
                <div className="text-xs text-text-tertiary leading-relaxed">{card.explanation}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-primary">Monthly Summary</h3>
        </div>
        <div className="overflow-x-auto -mx-1 sm:mx-0">
          <div className="min-w-[700px]">
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
                  <td className="py-2 px-2 text-right text-text-secondary">{formatCurrencyValue(row.acqSpend)}</td>
                  <td className="py-2 px-2 text-right text-text-secondary">{row.repeatOrders}</td>
                  <td className="py-2 px-2 text-right text-text-primary">{formatCurrencyValue(row.totalRevenue)}</td>
                  <td className="py-2 px-2 text-right text-success">{formatCurrencyValue(row.grossProfit)}</td>
                  <td className="py-2 px-2 text-right text-text-primary">{formatCurrencyValue(row.netCash)}</td>
                  <td className="py-2 px-2 text-right text-text-primary font-medium">{formatCurrencyValue(row.cumulative)}</td>
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
    </div>
  );
}
