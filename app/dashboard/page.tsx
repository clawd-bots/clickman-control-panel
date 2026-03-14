'use client';
import KPICard from '@/components/ui/KPICard';
import InfoTooltip from '@/components/ui/InfoTooltip';
import ExportButton from '@/components/ui/ExportButton';
import { kpiCards, dailyMetrics, channelAttribution, productKPIs, revenueInsights } from '@/lib/sample-data';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#334FB4', '#EDBF63', '#34D399', '#EF4444', '#4A6BD6', '#94A3B8'];

function pctChange(curr: number, prev: number) {
  return ((curr - prev) / prev) * 100;
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h2 className="text-lg font-semibold">Daily Overview</h2>
        <p className="text-sm text-text-secondary mt-0.5">What&apos;s happening right now — actuals, trends, and channel performance.</p>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Net Revenue" value={formatCurrency(kpiCards.netRevenue.value)} change={pctChange(kpiCards.netRevenue.value, kpiCards.netRevenue.prev)} sparkline={kpiCards.netRevenue.sparkline} />
        <KPICard label="Net Orders" value={formatNumber(kpiCards.netOrders.value)} change={pctChange(kpiCards.netOrders.value, kpiCards.netOrders.prev)} sparkline={kpiCards.netOrders.sparkline} />
        <KPICard label="Marketing Costs" value={formatCurrency(kpiCards.marketingCosts.value)} change={pctChange(kpiCards.marketingCosts.value, kpiCards.marketingCosts.prev)} sparkline={kpiCards.marketingCosts.sparkline} />
        <KPICard label="MER" value={`${kpiCards.mer.value}x`} change={pctChange(kpiCards.mer.value, kpiCards.mer.prev)} sparkline={kpiCards.mer.sparkline} />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="New Customers" value={formatNumber(kpiCards.newCustomers.value)} change={pctChange(kpiCards.newCustomers.value, kpiCards.newCustomers.prev)} sparkline={kpiCards.newCustomers.sparkline} />
        <KPICard label="nCAC" value={formatCurrency(kpiCards.ncac.value)} change={pctChange(kpiCards.ncac.value, kpiCards.ncac.prev)} sparkline={kpiCards.ncac.sparkline} />
        <KPICard label="nMER" value={`${kpiCards.nmer.value}x`} change={pctChange(kpiCards.nmer.value, kpiCards.nmer.prev)} sparkline={kpiCards.nmer.sparkline} />
        <KPICard label="CAC" value={formatCurrency(kpiCards.cac.value)} change={pctChange(kpiCards.cac.value, kpiCards.cac.prev)} sparkline={kpiCards.cac.sparkline} />
      </div>

      {/* Revenue & Marketing Chart */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Revenue & Marketing Costs</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="revenue" name="Net Revenue" stroke="#34D399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="spend" name="Marketing Costs" stroke="#EDBF63" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Net Orders & New Customers</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="orders" name="Orders" stroke="#4A6BD6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="newCustomers" name="New Customers" stroke="#EDBF63" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Marketing Insights */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-medium text-text-secondary">Marketing Insights</h3>
          {[
            { label: 'Sessions', value: '33,850', change: 8.2 },
            { label: 'CVR', value: '3.33%', change: 2.1 },
            { label: 'EPS', value: '₱66.58', change: 5.4 },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between">
              <div className="flex items-center text-xs text-text-secondary">
                {m.label} <InfoTooltip metric={m.label} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">{m.value}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${m.change >= 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                  {m.change >= 0 ? '↑' : '↓'}{Math.abs(m.change)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-2 bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Marketing Metrics Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="sessions" name="Sessions" fill="#334FB4" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel Attribution Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary">Channel Attribution</h3>
            <div className="flex gap-3 mt-2">
              {['Data Driven', 'Order Date', 'Validated'].map((tab, i) => (
                <button key={tab} className={`text-xs px-3 py-1 rounded-md ${i === 0 ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <ExportButton />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-secondary uppercase">
                <th className="text-left py-3 px-3 font-medium">Channel</th>
                <th className="text-right py-3 px-3 font-medium">Costs</th>
                <th className="text-right py-3 px-3 font-medium">Net Revenue</th>
                <th className="text-right py-3 px-3 font-medium">ROAS <InfoTooltip metric="ROAS" /></th>
                <th className="text-right py-3 px-3 font-medium">Orders</th>
                <th className="text-right py-3 px-3 font-medium">CPO <InfoTooltip metric="CPO" /></th>
                <th className="text-right py-3 px-3 font-medium">New Cust.</th>
                <th className="text-right py-3 px-3 font-medium">NC% <InfoTooltip metric="NC%" /></th>
              </tr>
            </thead>
            <tbody>
              {channelAttribution.map((row) => (
                <tr key={row.channel} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="py-3 px-3 font-medium text-text-primary">{row.channel}</td>
                  <td className="py-3 px-3 text-right text-text-secondary">{formatCurrency(row.costs)}</td>
                  <td className="py-3 px-3 text-right text-text-primary">{formatCurrency(row.revenue)}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={row.roas >= 3.5 ? 'text-success' : row.roas >= 2.5 ? 'text-warm-gold' : 'text-danger'}>
                      {row.roas > 0 ? `${row.roas.toFixed(2)}x` : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-text-secondary">{row.orders}</td>
                  <td className="py-3 px-3 text-right text-text-secondary">{row.cpo > 0 ? formatCurrency(row.cpo) : '—'}</td>
                  <td className="py-3 px-3 text-right text-text-secondary">{row.newCustomers}</td>
                  <td className="py-3 px-3 text-right text-text-secondary">{row.ncPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Insights */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Revenue Composition (NC vs RC)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueInsights.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="nc" name="New Customer Rev" stackId="a" fill="#4A6BD6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="rc" name="Repeat Customer Rev" stackId="a" fill="#34D399" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-medium text-text-secondary">Revenue Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'NC Revenue', value: formatCurrency(revenueInsights.ncRevenue), metric: 'NC Revenue' },
              { label: 'RC Revenue', value: formatCurrency(revenueInsights.rcRevenue), metric: 'RC Revenue' },
              { label: 'NC AOV', value: formatCurrency(revenueInsights.ncAOV), metric: 'NC AOV' },
              { label: 'RC AOV', value: formatCurrency(revenueInsights.rcAOV), metric: 'RC AOV' },
            ].map((item) => (
              <div key={item.label} className="bg-bg-elevated rounded-md p-3">
                <div className="flex items-center text-xs text-text-secondary mb-1">
                  {item.label} <InfoTooltip metric={item.metric} />
                </div>
                <div className="text-lg font-bold text-text-primary">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width={200} height={140}>
              <PieChart>
                <Pie data={[
                  { name: 'First Purchase', value: revenueInsights.firstPurchasePct },
                  { name: 'Repeat', value: revenueInsights.repeatPct },
                ]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                  <Cell fill="#4A6BD6" />
                  <Cell fill="#34D399" />
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-xs text-text-secondary space-y-1">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-brand-blue-light" /> First Purchase: {revenueInsights.firstPurchasePct}%</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-success" /> Repeat: {revenueInsights.repeatPct}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Product KPIs */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-primary">Product KPIs</h3>
          <ExportButton />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-secondary uppercase">
                <th className="text-left py-3 px-3 font-medium">Product</th>
                <th className="text-right py-3 px-3 font-medium">Net Revenue</th>
                <th className="text-right py-3 px-3 font-medium">Units Sold</th>
                <th className="text-right py-3 px-3 font-medium">Price Reduction % <InfoTooltip metric="Price Reductions" /></th>
                <th className="text-right py-3 px-3 font-medium">Discount Code % <InfoTooltip metric="Discount Codes" /></th>
              </tr>
            </thead>
            <tbody>
              {productKPIs.map((row) => (
                <tr key={row.product} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="py-3 px-3 font-medium text-text-primary">{row.product}</td>
                  <td className="py-3 px-3 text-right text-text-primary">{formatCurrency(row.revenue)}</td>
                  <td className="py-3 px-3 text-right text-text-secondary">{row.units}</td>
                  <td className="py-3 px-3 text-right text-text-secondary">{row.priceReduction > 0 ? `${row.priceReduction}%` : '—'}</td>
                  <td className="py-3 px-3 text-right text-text-secondary">{row.discountCode > 0 ? `${row.discountCode}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
