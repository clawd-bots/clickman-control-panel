'use client';
import { useState, useMemo, useEffect } from 'react';
import KPICard from '@/components/ui/KPICard';
import InfoTooltip from '@/components/ui/InfoTooltip';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import DataSource from '@/components/ui/DataSource';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { SkeletonKPICard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { useCurrency } from '@/components/CurrencyProvider';
import { useDateRange } from '@/components/DateProvider';
import { filterByDateRange, formatDateLabel, aggregateToWeeks } from '@/lib/dateUtils';
import { fetchTripleWhaleData, getMetric, getDailyData, TWData } from '@/lib/triple-whale-client';
import { fetchGA4Data, getGA4Metric, GA4Data } from '@/lib/ga4-client';
import { useTargets } from '@/lib/useTargets';

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
  const { currency, convertValue } = useCurrency();
  const { dateRange } = useDateRange();
  const { getTarget, getTargetAchievement } = useTargets();
  const [activeAttributionTab, setActiveAttributionTab] = useState('Last Click');
  const [attributionWindow, setAttributionWindow] = useState('7-day/1-day');
  const [twData, setTwData] = useState<TWData | null>(null);
  const [twLoading, setTwLoading] = useState(true);
  const [ga4Data, setGA4Data] = useState<GA4Data | null>(null);
  const [ga4Loading, setGA4Loading] = useState(true);

  useEffect(() => {
    setTwLoading(true);
    setGA4Loading(true);
    const startDate = dateRange.startDate.toISOString().split('T')[0];
    const endDate = dateRange.endDate.toISOString().split('T')[0];
    fetchTripleWhaleData(startDate, endDate, 'all')
      .then(setTwData)
      .catch(console.error)
      .finally(() => setTwLoading(false));
    fetchGA4Data(startDate, endDate, 'summary')
      .then(setGA4Data)
      .catch(console.error)
      .finally(() => setGA4Loading(false));
  }, [dateRange]);

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

  // Generate chart data based on selected date range
  // Use TW daily data when available, fall back to sample data
  const chartData = useMemo(() => {
    const { startDate, endDate } = dateRange;
    
    // If TW daily data is available, use it
    const twRevDaily = getDailyData(twData, 'orderRevenue');
    const twOrdersDaily = getDailyData(twData, 'orders');
    const twNCDaily = getDailyData(twData, 'newCustomerOrders');
    const twSessionsDaily = getDailyData(twData, 'sessions');
    
    if (twRevDaily.length > 0) {
      // Build a map from all daily series
      const dateMap: Record<string, { revenue: number; costs: number; orders: number; newCustomers: number; sessions: number }> = {};
      
      // Collect spend daily data for costs
      const twMetaSpendDaily = getDailyData(twData, 'metaAdSpend');
      const twGoogleSpendDaily = getDailyData(twData, 'googleAdSpend');
      const twTiktokSpendDaily = getDailyData(twData, 'tiktokAdSpend');
      const twRedditSpendDaily = getDailyData(twData, 'redditAdSpend');
      
      twRevDaily.forEach(d => {
        if (!dateMap[d.date]) dateMap[d.date] = { revenue: 0, costs: 0, orders: 0, newCustomers: 0, sessions: 0 };
        dateMap[d.date].revenue = d.value;
      });
      twOrdersDaily.forEach(d => {
        if (!dateMap[d.date]) dateMap[d.date] = { revenue: 0, costs: 0, orders: 0, newCustomers: 0, sessions: 0 };
        dateMap[d.date].orders = d.value;
      });
      twNCDaily.forEach(d => {
        if (!dateMap[d.date]) dateMap[d.date] = { revenue: 0, costs: 0, orders: 0, newCustomers: 0, sessions: 0 };
        dateMap[d.date].newCustomers = d.value;
      });
      twSessionsDaily.forEach(d => {
        if (!dateMap[d.date]) dateMap[d.date] = { revenue: 0, costs: 0, orders: 0, newCustomers: 0, sessions: 0 };
        dateMap[d.date].sessions = d.value;
      });
      // Sum up spend across channels per day
      [twMetaSpendDaily, twGoogleSpendDaily, twTiktokSpendDaily, twRedditSpendDaily].forEach(series => {
        series.forEach(d => {
          if (!dateMap[d.date]) dateMap[d.date] = { revenue: 0, costs: 0, orders: 0, newCustomers: 0, sessions: 0 };
          dateMap[d.date].costs += d.value;
        });
      });
      
      const daily = Object.entries(dateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({
          date,
          displayDate: formatDateLabel(date, 'day'),
          revenue: vals.revenue,
          costs: vals.costs,
          orders: vals.orders,
          newCustomers: vals.newCustomers,
          sessions: vals.sessions,
          profit: vals.revenue - vals.costs,
        }));
      
      if (daily.length > 30) {
        return aggregateToWeeks(daily, 'date');
      }
      return daily;
    }
    
    // Fallback: use sample data
    const filteredSample = filterByDateRange(dailyMetrics, 'date', startDate, endDate);
    
    if (filteredSample.length > 0) {
      const daily = filteredSample.map(d => ({
        date: d.date,
        displayDate: formatDateLabel(d.date, 'day'),
        revenue: d.revenue,
        costs: d.spend,
        orders: d.orders,
        newCustomers: d.newCustomers,
        sessions: d.sessions,
        profit: d.revenue - d.spend,
      }));

      if (daily.length > 30) {
        return aggregateToWeeks(daily, 'date');
      }
      return daily;
    }
    
    // No sample data for this range - generate synthetic data
    const data = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const isoDate = `${y}-${m}-${day}`;
      
      const baseRevenue = 350000 + Math.sin(current.getTime() / (1000 * 60 * 60 * 24)) * 50000;
      const baseCosts = 80000 + Math.cos(current.getTime() / (1000 * 60 * 60 * 24)) * 20000;
      const baseOrders = 140 + Math.floor(Math.sin(current.getTime() / (1000 * 60 * 60 * 24 * 2)) * 30);
      const baseNewCustomers = Math.floor(baseOrders * 0.7);
      const baseSessions = 4800 + Math.floor(Math.sin(current.getTime() / (1000 * 60 * 60 * 24 * 1.5)) * 800);
      
      data.push({
        date: isoDate,
        displayDate: formatDateLabel(isoDate, 'day'),
        revenue: Math.round(baseRevenue),
        costs: Math.round(baseCosts),
        orders: baseOrders,
        newCustomers: baseNewCustomers,
        sessions: baseSessions,
        profit: Math.round(baseRevenue - baseCosts),
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return data;
  }, [dateRange, twData]);

  // Revenue composition data filtered by date range
  const filteredRevenueMonthly = useMemo(() => {
    const filtered = filterByDateRange(revenueInsights.monthly, 'month', dateRange.startDate, dateRange.endDate);
    // If no data in range, show all (fallback)
    const data = filtered.length > 0 ? filtered : revenueInsights.monthly;
    return data.map(d => ({
      ...d,
      displayMonth: formatDateLabel(d.month, 'month'),
    }));
  }, [dateRange]);

  // Calculate aggregated values — use TW summary metrics when available, fallback to chart data
  const aggregatedData = useMemo(() => {
    if (twData) {
      const totalRevenue = getMetric(twData, 'orderRevenue');
      const totalCosts = getMetric(twData, 'metaAdSpend') + getMetric(twData, 'googleAdSpend') + getMetric(twData, 'tiktokAdSpend') + getMetric(twData, 'redditAdSpend');
      const totalOrders = getMetric(twData, 'orders');
      const totalNewCustomers = getMetric(twData, 'newCustomerOrders');
      const totalSessions = getMetric(twData, 'sessions');
      const mer = getMetric(twData, 'mer');
      const cac = getMetric(twData, 'blendedCpa');
      const ncac = getMetric(twData, 'ncpa');
      
      return { totalRevenue, totalCosts, totalOrders, totalNewCustomers, totalSessions, mer, cac, ncac };
    }
    
    const totalRevenue = chartData.reduce((sum, day) => sum + day.revenue, 0);
    const totalCosts = chartData.reduce((sum, day) => sum + day.costs, 0);
    const totalOrders = chartData.reduce((sum, day) => sum + day.orders, 0);
    const totalNewCustomers = chartData.reduce((sum, day) => sum + day.newCustomers, 0);
    const totalSessions = chartData.reduce((sum, day) => sum + day.sessions, 0);
    
    return {
      totalRevenue,
      totalCosts,
      totalOrders,
      totalNewCustomers,
      totalSessions,
      mer: totalCosts > 0 ? totalRevenue / totalCosts : 0,
      cac: totalOrders > 0 ? totalCosts / totalOrders : 0,
      ncac: totalNewCustomers > 0 ? totalCosts / totalNewCustomers : 0,
    };
  }, [chartData, twData]);

  // TW-powered channel data for the attribution table
  const twChannelData = useMemo(() => {
    if (!twData) return null;
    return [
      { channel: 'Meta Ads', costs: getMetric(twData, 'metaAdSpend'), revenue: getMetric(twData, 'metaConversionValue'), roas: getMetric(twData, 'metaRoas'), orders: getMetric(twData, 'metaPurchases'), cpo: getMetric(twData, 'metaCpa'), newCustomers: 0, ncPct: 0 },
      { channel: 'Google Ads', costs: getMetric(twData, 'googleAdSpend'), revenue: getMetric(twData, 'googleConversionValue'), roas: getMetric(twData, 'googleRoas'), orders: 0, cpo: getMetric(twData, 'googleCpa'), newCustomers: 0, ncPct: 0 },
      { channel: 'TikTok Ads', costs: getMetric(twData, 'tiktokAdSpend'), revenue: getMetric(twData, 'tiktokConversionValue'), roas: getMetric(twData, 'tiktokRoas'), orders: getMetric(twData, 'tiktokPurchases'), cpo: getMetric(twData, 'tiktokCpa'), newCustomers: 0, ncPct: 0 },
      { channel: 'Reddit Ads', costs: getMetric(twData, 'redditAdSpend'), revenue: getMetric(twData, 'redditConversionValue'), roas: getMetric(twData, 'redditRoas'), orders: getMetric(twData, 'redditConversions'), cpo: getMetric(twData, 'redditCpa'), newCustomers: 0, ncPct: 0 },
    ].filter(ch => ch.costs > 0 || ch.revenue > 0);
  }, [twData]);

  // Different attribution data sets  
  const channelAttributionData = {
    'Last Click': [
      { channel: 'Meta Ads', costs: 320000, revenue: 1180000, roas: 3.69, orders: 545, cpo: 587, newCustomers: 380, ncPct: 69.7 },
      { channel: 'Google Ads', costs: 165000, revenue: 620000, roas: 3.76, orders: 315, cpo: 524, newCustomers: 200, ncPct: 63.5 },
      { channel: 'TikTok Ads', costs: 88000, revenue: 295000, roas: 3.35, orders: 165, cpo: 533, newCustomers: 130, ncPct: 78.8 },
      { channel: 'Organic Search', costs: 0, revenue: 95000, roas: 0, orders: 58, cpo: 0, newCustomers: 40, ncPct: 69.0 },
      { channel: 'Direct', costs: 0, revenue: 48000, roas: 0, orders: 35, cpo: 0, newCustomers: 20, ncPct: 57.1 },
      { channel: 'Referral', costs: 40000, revenue: 15000, roas: 0.38, orders: 8, cpo: 5000, newCustomers: 9, ncPct: 112.5 },
    ],
    'Linear': channelAttribution,
    'First Click': [
      { channel: 'Meta Ads', costs: 320000, revenue: 950000, roas: 2.97, orders: 465, cpo: 688, newCustomers: 420, ncPct: 90.3 },
      { channel: 'Google Ads', costs: 165000, revenue: 720000, roas: 4.36, orders: 385, cpo: 429, newCustomers: 285, ncPct: 74.0 },
      { channel: 'TikTok Ads', costs: 88000, revenue: 380000, roas: 4.32, orders: 185, cpo: 476, newCustomers: 165, ncPct: 89.2 },
      { channel: 'Organic Search', costs: 0, revenue: 125000, roas: 0, orders: 72, cpo: 0, newCustomers: 58, ncPct: 80.6 },
      { channel: 'Direct', costs: 0, revenue: 35000, roas: 0, orders: 22, cpo: 0, newCustomers: 15, ncPct: 68.2 },
      { channel: 'Referral', costs: 40000, revenue: 28000, roas: 0.70, orders: 18, cpo: 2222, newCustomers: 16, ncPct: 88.9 },
    ],
    'Linear Paid': [
      { channel: 'Meta Ads', costs: 320000, revenue: 1050000, roas: 3.28, orders: 485, cpo: 660, newCustomers: 340, ncPct: 70.1 },
      { channel: 'Google Ads', costs: 165000, revenue: 580000, roas: 3.52, orders: 295, cpo: 559, newCustomers: 190, ncPct: 64.4 },
      { channel: 'TikTok Ads', costs: 88000, revenue: 320000, roas: 3.64, orders: 175, cpo: 503, newCustomers: 145, ncPct: 82.9 },
      { channel: 'Organic Search', costs: 0, revenue: 95000, roas: 0, orders: 58, cpo: 0, newCustomers: 40, ncPct: 69.0 },
      { channel: 'Direct', costs: 0, revenue: 48000, roas: 0, orders: 35, cpo: 0, newCustomers: 20, ncPct: 57.1 },
      { channel: 'Referral', costs: 40000, revenue: 15000, roas: 0.38, orders: 8, cpo: 5000, newCustomers: 9, ncPct: 112.5 },
    ],
    'Triple': [
      { channel: 'Meta Ads', costs: 320000, revenue: 1120000, roas: 3.50, orders: 520, cpo: 615, newCustomers: 365, ncPct: 70.2 },
      { channel: 'Google Ads', costs: 165000, revenue: 650000, roas: 3.94, orders: 325, cpo: 508, newCustomers: 210, ncPct: 64.6 },
      { channel: 'TikTok Ads', costs: 88000, revenue: 310000, roas: 3.52, orders: 175, cpo: 503, newCustomers: 140, ncPct: 80.0 },
      { channel: 'Organic Search', costs: 0, revenue: 95000, roas: 0, orders: 58, cpo: 0, newCustomers: 40, ncPct: 69.0 },
      { channel: 'Direct', costs: 0, revenue: 48000, roas: 0, orders: 35, cpo: 0, newCustomers: 20, ncPct: 57.1 },
      { channel: 'Referral', costs: 40000, revenue: 15000, roas: 0.38, orders: 8, cpo: 5000, newCustomers: 9, ncPct: 112.5 },
    ],
  };
  
  const getCurrentChannelData = () => {
    // Use TW live data for Triple tab, fallback sample for others
    if (activeAttributionTab === 'Triple' && twChannelData) {
      return twChannelData;
    }
    return channelAttributionData[activeAttributionTab as keyof typeof channelAttributionData];
  };

  // Comprehensive cross-page AI analysis
  const getCrossPageInsights = () => {
    return [
      {
        type: 'success',
        title: 'Strong Performance',
        insight: `MER at 3.67x exceeds the healthy 3.5x threshold with nCAC improving 2.6% MoM to ${formatCurrencyValue(787)}. Meta remains your highest-performing channel at 3.91x ROAS. Oct-Dec cohorts show improving M1 retention (28.5% to 32.8%), validating recent targeting changes.`
      },
      {
        type: 'warning', 
        title: 'Watch',
        insight: `aMER at ${kpiCards.nmer.value}x shows heavy reliance on repeat purchases. Server-side GTM is down (0 events/day), losing ~15% of conversion data. Creative fatigue detected in "Doc Consultation UGC" with CTR dropping from 1.8% to 1.3%.`
      },
      {
        type: 'action',
        title: 'Immediate Actions',
        insight: `Scale Meta spend +15% (Hair Before/After creative at ${formatCurrencyValue(577)} CPA is top performer). Fix server-side GTM before budget reallocation. Launch subscription for GLP-1 (highest repeat rate at 51.8%). Cap TikTok at current levels until LTV:CAC improves above 2.0x.`
      },
      {
        type: 'strategic',
        title: 'Strategic Opportunities', 
        insight: `Revenue is 90% of target with 2 weeks remaining - achievable at current ${formatCurrencyValue(322000)} daily run rate. Consider MMM model using past 6 months data for channel validation. TikTok CPCs 60% lower than Meta - test creative format migration for cheaper reach.`
      }
    ];
  };

  if (twLoading || ga4Loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Daily Overview</h2>
          <p className="text-sm text-text-secondary mt-0.5">Fetching live data...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart /><SkeletonChart />
        </div>
        <SkeletonTable rows={5} cols={7} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart /><SkeletonChart height="h-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">Daily Overview</h2>
        <p className="text-sm text-text-secondary mt-0.5">What's happening right now, actuals, trends, and channel performance.</p>
      </div>

      {/* KPI Cards Row 1: Net Revenue, Marketing Costs, MER, aMER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div data-testid="kpi-net-revenue">
          <KPICard 
            label="Net Revenue" 
            value={formatCurrencyValue(aggregatedData.totalRevenue)} 
            change={pctChange(aggregatedData.totalRevenue, kpiCards.netRevenue.prev)} 
            sparkline={[]}
            target={formatCurrencyValue(getTarget('Net Revenue') ?? kpiCards.netRevenue.target)}
            targetAchievement={getTargetAchievement('Net Revenue', aggregatedData.totalRevenue) ?? (aggregatedData.totalRevenue / kpiCards.netRevenue.target) * 100}
          />
        </div>
        <div data-testid="kpi-marketing-costs">
          <KPICard 
            label="Marketing Costs" 
            value={formatCurrencyValue(aggregatedData.totalCosts)} 
            change={pctChange(aggregatedData.totalCosts, kpiCards.marketingCosts.prev)} 
            sparkline={[]}
            target={formatCurrencyValue(getTarget('Marketing Costs') ?? kpiCards.marketingCosts.target)}
            targetAchievement={getTargetAchievement('Marketing Costs', aggregatedData.totalCosts) ?? (aggregatedData.totalCosts / kpiCards.marketingCosts.target) * 100}
          />
        </div>
        <div data-testid="kpi-mer">
          <KPICard 
            label="MER" 
            value={`${aggregatedData.mer.toFixed(2)}x`} 
            change={pctChange(aggregatedData.mer, kpiCards.mer.prev)} 
            sparkline={[]}
            target={`${(getTarget('MER') ?? kpiCards.mer.target).toFixed?.(2) ?? kpiCards.mer.target}x`}
            targetAchievement={getTargetAchievement('MER', aggregatedData.mer) ?? (aggregatedData.mer / kpiCards.mer.target) * 100}
          />
        </div>
        <div data-testid="kpi-amer">
          <KPICard 
            label="aMER" 
            value={twData ? `${getMetric(twData, 'blendedAttributedRoas').toFixed(2)}x` : `${kpiCards.nmer.value}x`} 
            change={pctChange(twData ? getMetric(twData, 'blendedAttributedRoas') : kpiCards.nmer.value, kpiCards.nmer.prev)} 
            sparkline={[]}
            target={`${(getTarget('aMER') ?? kpiCards.nmer.target).toFixed?.(2) ?? kpiCards.nmer.target}x`}
            targetAchievement={getTargetAchievement('aMER', twData ? getMetric(twData, 'blendedAttributedRoas') : kpiCards.nmer.value) ?? ((twData ? getMetric(twData, 'blendedAttributedRoas') : kpiCards.nmer.value) / kpiCards.nmer.target) * 100}
          />
        </div>
      </div>

      {/* KPI Cards Row 2: Orders, New Customers, CAC, nCAC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div data-testid="kpi-orders">
          <KPICard 
            label="Orders" 
            value={formatNumber(aggregatedData.totalOrders)} 
            change={pctChange(aggregatedData.totalOrders, kpiCards.netOrders.prev)} 
            sparkline={[]}
            target={formatNumber(Math.round(getTarget('Orders') ?? kpiCards.netOrders.target))}
            targetAchievement={getTargetAchievement('Orders', aggregatedData.totalOrders) ?? (aggregatedData.totalOrders / kpiCards.netOrders.target) * 100}
          />
        </div>
        <div data-testid="kpi-nc-orders">
          <KPICard 
            label="NC Orders" 
            value={formatNumber(aggregatedData.totalNewCustomers)} 
            change={pctChange(aggregatedData.totalNewCustomers, kpiCards.newCustomers.prev)} 
            sparkline={[]}
            target={formatNumber(Math.round(getTarget('NC Orders') ?? kpiCards.newCustomers.target))}
            targetAchievement={getTargetAchievement('NC Orders', aggregatedData.totalNewCustomers) ?? (aggregatedData.totalNewCustomers / kpiCards.newCustomers.target) * 100}
          />
        </div>
        <div data-testid="kpi-cac">
          <KPICard 
            label="CAC" 
            value={formatCurrencyValue(aggregatedData.cac)} 
            change={pctChange(aggregatedData.cac, kpiCards.cac.prev)} 
            sparkline={[]}
            target={formatCurrencyValue(getTarget('CAC') ?? kpiCards.cac.target)}
            targetAchievement={getTargetAchievement('CAC', aggregatedData.cac) ?? (kpiCards.cac.target / aggregatedData.cac) * 100}
          />
        </div>
        <div data-testid="kpi-ncac">
          <KPICard 
            label="ncCAC" 
            value={formatCurrencyValue(aggregatedData.ncac)} 
            change={pctChange(aggregatedData.ncac, kpiCards.ncac.prev)} 
            sparkline={[]}
            target={formatCurrencyValue(getTarget('ncCAC') ?? kpiCards.ncac.target)}
            targetAchievement={getTargetAchievement('ncCAC', aggregatedData.ncac) ?? (kpiCards.ncac.target / aggregatedData.ncac) * 100}
          />
        </div>
      </div>

      {/* CAC/LTV and LTV per Customer KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KPICard 
          label="CAC/LTV Ratio" 
          value="1:3.2" 
          change={8.1} 
          sparkline={[]}
          target="1:3.5"
          targetAchievement={91.4}
        />
        <KPICard 
          label="LTV per Customer" 
          value={formatCurrencyValue(twData ? getMetric(twData, 'ltv') : 2520)} 
          change={12.4} 
          sparkline={[]}
          target={formatCurrencyValue(getTarget('AOV') ? (getTarget('AOV')! * 3.5) : 2800)}
          targetAchievement={twData ? (getMetric(twData, 'ltv') / (getTarget('AOV') ? getTarget('AOV')! * 3.5 : 2800)) * 100 : 90.0}
        />
      </div>

      {/* Revenue & Marketing Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5" data-testid="revenue-chart">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary truncate">Revenue & Marketing Costs</h3>
            <div className="flex items-center gap-2 shrink-0"><DataSource source="Triple Whale" /><LiveBadge /></div>
          </div>
          <div className="min-h-[240px]">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 9 }} 
                  angle={-30}
                  textAnchor="end"
                  height={50}
                  interval={0}
                />
                <YAxis 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} 
                  tickFormatter={(v) => formatCurrencyValue(v)}
                  width={60}
                />
                <Tooltip 
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }}
                  formatter={(value: any, name: any) => [formatCurrencyValue(value), String(name || '')]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="revenue" name="Net Revenue" stroke="#34D399" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="costs" name="Marketing Costs" stroke="#EDBF63" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5" data-testid="orders-chart">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary truncate">Net Orders & New Customers</h3>
            <div className="flex items-center gap-2 shrink-0"><DataSource source="Triple Whale" /><LiveBadge /></div>
          </div>
          <div className="min-h-[260px]">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                  label={{ value: 'Date', position: 'insideBottom', offset: -10, style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} 
                />
                <YAxis 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                  label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} 
                />
                <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="orders" name="Orders" stroke="#4A6BD6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="newCustomers" name="New Customers" stroke="#EDBF63" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Marketing Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary">Marketing Insights</h3>
            <div className="flex items-center gap-2"><DataSource source="Google Analytics" /><LiveBadge variant={ga4Data ? 'live' : 'sample'} /></div>
          </div>
          {[
            { label: 'Sessions', value: ga4Data ? getGA4Metric(ga4Data, 'sessions').toLocaleString() : (twData ? getMetric(twData, 'sessions').toLocaleString() : '33,850'), change: 8.2 },
            { label: 'CVR', value: twData ? `${getMetric(twData, 'conversionRate').toFixed(2)}%` : '3.33%', change: 2.1 },
            { label: 'Engagement Rate', value: ga4Data ? `${(getGA4Metric(ga4Data, 'engagementRate') * 100).toFixed(1)}%` : '78.0%', change: 5.4 },
            { label: 'Bounce Rate', value: ga4Data ? `${(getGA4Metric(ga4Data, 'bounceRate') * 100).toFixed(1)}%` : (twData ? `${getMetric(twData, 'bounceRate').toFixed(1)}%` : '42.7%'), change: -3.4 },
            { label: 'Pages/Session', value: ga4Data ? getGA4Metric(ga4Data, 'screenPageViewsPerSession').toFixed(2) : '3.97', change: 2.1 },
            { label: 'Avg Session', value: ga4Data ? `${Math.floor(getGA4Metric(ga4Data, 'averageSessionDuration') / 60)}m ${Math.floor(getGA4Metric(ga4Data, 'averageSessionDuration') % 60)}s` : '2m 34s', change: 12.1 },
            { label: 'Conversions', value: ga4Data ? getGA4Metric(ga4Data, 'conversions').toLocaleString() : '0', change: 0 },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between">
              <div className="flex items-center text-xs text-text-secondary gap-1">
                <span>{m.label}</span>
                <InfoTooltip metric={m.label} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">{m.value}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${m.change >= 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                  {m.change >= 0 ? '↑' : '↓'}{Math.abs(m.change)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary">Marketing Metrics Trend</h3>
            <div className="flex items-center gap-2"><DataSource source="Triple Whale" /><LiveBadge /></div>
          </div>
          <div className="min-h-[180px]">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                  label={{ value: 'Date', position: 'insideBottom', offset: -10, style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} 
                />
                <YAxis 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                  label={{ value: 'Sessions', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} 
                />
                <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="sessions" name="Sessions" fill="#334FB4" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Channel Attribution Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5" data-testid="attribution-table">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
          <div>
            <h3 className="text-sm font-medium text-text-primary">Channel Attribution</h3>
            <div className="flex gap-2 sm:gap-3 mt-2 flex-wrap">
              {['Last Click', 'Linear', 'First Click', 'Linear Paid', 'Triple'].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveAttributionTab(tab)}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${activeAttributionTab === tab ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-2">Attribution Window</div>
            <select
              value={attributionWindow}
              onChange={(e) => setAttributionWindow(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-border bg-bg-surface text-text-primary min-w-[140px]"
            >
              <option value="1-day">1-day</option>
              <option value="7-day/1-day">7-day/1-day</option>
              <option value="28-day/1-day">28-day/1-day</option>
              <option value="28-day/28-day">28-day/28-day</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-border text-xs text-text-secondary uppercase">
                  <th className="text-left py-3 px-2 sm:px-3 font-medium min-w-[100px]">Channel</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[80px]">Costs</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[100px]">Net Revenue</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[80px]">
                    <div className="flex items-center justify-end gap-1">
                      <span>ROAS</span>
                      <InfoTooltip metric="ROAS" />
                    </div>
                  </th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[60px]">Orders</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[80px]">
                    <div className="flex items-center justify-end gap-1">
                      <span>CPO</span>
                      <InfoTooltip metric="CPO" />
                    </div>
                  </th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[80px]">New Cust.</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[60px]">
                    <div className="flex items-center justify-end gap-1">
                      <span>NC%</span>
                      <InfoTooltip metric="NC%" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {getCurrentChannelData().map((row) => (
                  <tr key={row.channel} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                    <td className="py-3 px-2 sm:px-3 font-medium text-text-primary">{row.channel}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{formatCurrencyValue(row.costs)}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-primary">{formatCurrencyValue(row.revenue)}</td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <span className={row.roas >= 3.5 ? 'text-success' : row.roas >= 2.5 ? 'text-warm-gold' : 'text-danger'}>
                        {row.roas > 0 ? `${row.roas.toFixed(2)}x` : '0'}
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.orders}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.cpo > 0 ? formatCurrencyValue(row.cpo) : '0'}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.newCustomers}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.ncPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      {/* Revenue Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5" data-testid="revenue-composition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary truncate">Revenue Composition (NC vs RC)</h3>
            <div className="flex items-center gap-2 shrink-0"><DataSource source="Triple Whale" /><LiveBadge /></div>
          </div>
          <div className="min-h-[240px]">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={filteredRevenueMonthly} margin={{ top: 10, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  dataKey="displayMonth" 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} 
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  interval={0}
                />
                <YAxis 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                  tickFormatter={(v) => formatCurrencyValue(v)} 
                  label={{ value: `Revenue (${currency}M)`, angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} 
                />
                <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="nc" name="New Customer Rev" stackId="a" fill="#4A6BD6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="rc" name="Repeat Customer Rev" stackId="a" fill="#34D399" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary">Revenue Breakdown</h3>
            <div className="flex items-center gap-2"><DataSource source="Triple Whale" /><LiveBadge /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { label: 'NC Revenue', value: formatCurrencyValue(twData ? getMetric(twData, 'newCustomerRevenue') : revenueInsights.ncRevenue), metric: 'NC Revenue' },
              { label: 'RC Revenue', value: formatCurrencyValue(twData ? getMetric(twData, 'returningCustomerRevenue') : revenueInsights.rcRevenue), metric: 'RC Revenue' },
              { label: 'NC AOV', value: formatCurrencyValue(twData ? getMetric(twData, 'aov') : revenueInsights.ncAOV), metric: 'NC AOV' },
              { label: 'RC AOV', value: formatCurrencyValue(twData ? getMetric(twData, 'aov') : revenueInsights.rcAOV), metric: 'RC AOV' },
            ].map((item) => (
              <div key={item.label} className="bg-bg-elevated rounded-md p-3 min-h-[70px] flex flex-col justify-between">
                <div className="flex items-center text-xs text-text-secondary mb-1 gap-1">
                  <span className="truncate">{item.label}</span>
                  <InfoTooltip metric={item.metric} />
                </div>
                <div className="text-base sm:text-lg font-bold text-text-primary truncate">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="min-w-[200px]">
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
            </div>
            <div className="text-xs text-text-secondary space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue-light shrink-0" />
                <span>First Purchase: {revenueInsights.firstPurchasePct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
                <span>Repeat: {revenueInsights.repeatPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product KPIs */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5" data-testid="product-kpis">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-primary">Product KPIs</h3>
          <div className="flex items-center gap-2"><DataSource source="N/A" /><LiveBadge variant="sample" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-border text-xs text-text-secondary uppercase">
                  <th className="text-left py-3 px-2 sm:px-3 font-medium min-w-[120px]">Product</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[100px]">Net Revenue</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[80px]">Units Sold</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[120px]">
                    <div className="flex items-center justify-end gap-1">
                      <span>Inventory Remaining</span>
                      <InfoTooltip metric="Inventory" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {productKPIs.map((row) => (
                  <tr key={row.product} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                    <td className="py-3 px-2 sm:px-3 font-medium text-text-primary">{row.product}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-primary">{formatCurrencyValue(row.revenue)}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.units}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary italic">Pending API</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      {/* Summary AI Analysis with full controls */}
      <div>
        <AISuggestionsPanel 
          suggestions={getCrossPageInsights().map((item, i) => `${item.title}: ${item.insight}`)}
          title="Daily Summary & Intelligence"
        />
      </div>
    </div>
  );
}
