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
import { filterByDateRange, formatDateLabel, aggregateToWeeks, toLocalDateString } from '@/lib/dateUtils';
import { fetchTripleWhaleData, getMetric, getPrevMetric, getDelta, getDailyData, TWData } from '@/lib/triple-whale-client';
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
  const [attributionWindow, setAttributionWindow] = useState('7-day');
  const [twData, setTwData] = useState<TWData | null>(null);
  const [twLoading, setTwLoading] = useState(true);
  const [ga4Data, setGA4Data] = useState<GA4Data | null>(null);
  const [ga4Loading, setGA4Loading] = useState(true);
  const [ga4DailyData, setGA4DailyData] = useState<Array<{ date: string; sessions: number; totalUsers: number }>>([]);
  const [attrData, setAttrData] = useState<any[] | null>(null);
  const [attrLoading, setAttrLoading] = useState(false);

  useEffect(() => {
    setTwLoading(true);
    setGA4Loading(true);
    const startDate = toLocalDateString(dateRange.startDate);
    const endDate = toLocalDateString(dateRange.endDate);
    fetchTripleWhaleData(startDate, endDate, 'all')
      .then(setTwData)
      .catch(console.error)
      .finally(() => setTwLoading(false));
    // Fetch GA4 summary + daily in parallel
    Promise.all([
      fetchGA4Data(startDate, endDate, 'summary'),
      fetch(`/api/ga4?startDate=${startDate}&endDate=${endDate}&mode=daily`)
        .then(r => r.json())
        .then(json => json.success ? json.data.daily : [])
        .catch(() => []),
    ]).then(([summary, daily]) => {
      setGA4Data(summary);
      setGA4DailyData(daily.map((d: any) => ({
        date: d.date,
        sessions: d.sessions ?? 0,
        totalUsers: d.totalUsers ?? 0,
      })));
    }).catch(console.error)
      .finally(() => setGA4Loading(false));
  }, [dateRange]);

  // Fetch attribution data when tab or date range changes
  useEffect(() => {
    setAttrLoading(true);
    const startDate = toLocalDateString(dateRange.startDate);
    const endDate = toLocalDateString(dateRange.endDate);
    fetch(`/api/triple-whale/attribution?startDate=${startDate}&endDate=${endDate}&model=${encodeURIComponent(activeAttributionTab)}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setAttrData(json.data);
        }
      })
      .catch(console.error)
      .finally(() => setAttrLoading(false));
  }, [dateRange, activeAttributionTab]);

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
      // MER = TW's "Blended ROAS" metric (roas/topKpiRoas)
      const mer = getMetric(twData, 'twRoas') || getMetric(twData, 'topRoas');
      const cac = getMetric(twData, 'blendedCpa');
      const ncac = getMetric(twData, 'ncpa');
      // aMER = New Customer Revenue / Total Ad Spend (always lower than MER)
      const amer = totalCosts > 0 ? getMetric(twData, 'newCustomerRevenue') / totalCosts : 0;
      
      // Previous period values from TW for accurate % change
      const prevRevenue = getPrevMetric(twData, 'orderRevenue');
      const prevCosts = getPrevMetric(twData, 'metaAdSpend') + getPrevMetric(twData, 'googleAdSpend') + getPrevMetric(twData, 'tiktokAdSpend') + getPrevMetric(twData, 'redditAdSpend');
      const prevOrders = getPrevMetric(twData, 'orders');
      const prevNewCustomers = getPrevMetric(twData, 'newCustomerOrders');
      const prevSessions = getPrevMetric(twData, 'sessions');
      const prevMer = getPrevMetric(twData, 'twRoas') || getPrevMetric(twData, 'topRoas');
      const prevCac = getPrevMetric(twData, 'blendedCpa');
      const prevNcac = getPrevMetric(twData, 'ncpa');
      const prevAmer = prevCosts > 0 ? getPrevMetric(twData, 'newCustomerRevenue') / prevCosts : 0;
      
      // Computed AOVs
      const ncAov = totalNewCustomers > 0 ? getMetric(twData, 'newCustomerRevenue') / totalNewCustomers : 0;
      const rcOrders = totalOrders - totalNewCustomers;
      const rcAov = rcOrders > 0 ? getMetric(twData, 'returningCustomerRevenue') / rcOrders : 0;
      
      // LTV & CAC/LTV ratio (lifetime data, not tied to date picker)
      const ltv = getMetric(twData, 'ltv');
      const prevLtv = getPrevMetric(twData, 'ltv');
      const cacLtvRatio = cac > 0 ? ltv / cac : 0;

      return {
        totalRevenue, totalCosts, totalOrders, totalNewCustomers, totalSessions,
        mer, cac, ncac, amer,
        prevRevenue, prevCosts, prevOrders, prevNewCustomers, prevSessions,
        prevMer, prevCac, prevNcac, prevAmer,
        ncAov, rcAov, ltv, prevLtv, cacLtvRatio,
      };
    }
    
    const totalRevenue = chartData.reduce((sum, day) => sum + day.revenue, 0);
    const totalCosts = chartData.reduce((sum, day) => sum + day.costs, 0);
    const totalOrders = chartData.reduce((sum, day) => sum + day.orders, 0);
    const totalNewCustomers = chartData.reduce((sum, day) => sum + day.newCustomers, 0);
    const totalSessions = chartData.reduce((sum, day) => sum + day.sessions, 0);
    
    return {
      totalRevenue, totalCosts, totalOrders, totalNewCustomers, totalSessions,
      mer: totalCosts > 0 ? totalRevenue / totalCosts : 0,
      cac: totalOrders > 0 ? totalCosts / totalOrders : 0,
      ncac: totalNewCustomers > 0 ? totalCosts / totalNewCustomers : 0,
      prevRevenue: kpiCards.netRevenue.prev,
      prevCosts: kpiCards.marketingCosts.prev,
      prevOrders: kpiCards.netOrders.prev,
      prevNewCustomers: kpiCards.newCustomers.prev,
      prevSessions: 0,
      prevMer: kpiCards.mer.prev,
      prevCac: kpiCards.cac.prev,
      prevNcac: kpiCards.ncac.prev,
      amer: kpiCards.nmer.value,
      prevAmer: kpiCards.nmer.prev,
      ncAov: revenueInsights.ncAOV,
      rcAov: revenueInsights.rcAOV,
      ltv: 2520,
      prevLtv: 0,
      cacLtvRatio: 3.2,
    };
  }, [chartData, twData]);

  // TW-powered channel data for the attribution table
  // Columns: Spend, CPA, NC CPA, AOV, CV (Conversion Value), Purchases, ROAS, NC ROAS, NCP (New Customer Purchases), CR (Conversion Rate)
  const twChannelData = useMemo(() => {
    if (!twData) return null;

    const buildRow = (channel: string, spend: number, cpa: number, cv: number, purchases: number, roas: number, extras?: { ncCpa?: number; aov?: number; cr?: number }) => {
      // Compute AOV from CV / Purchases when not provided directly
      const aov = extras?.aov || (purchases > 0 ? cv / purchases : 0);
      // CR = Purchases / Sessions is not per-channel, show if provided
      return {
        channel, spend, cpa,
        ncCpa: extras?.ncCpa || 0,
        aov,
        cv, purchases, roas,
        ncRoas: 0, // Not available per-channel from TW Summary API
        ncp: 0, // Not available per-channel from TW Summary API
        cr: extras?.cr || 0,
      };
    };

    return [
      buildRow('Meta Ads',
        getMetric(twData, 'metaAdSpend'),
        getMetric(twData, 'metaCpa'),
        getMetric(twData, 'metaConversionValue'),
        getMetric(twData, 'metaPurchases') || getMetric(twData, 'metaTotalPurchases'),
        getMetric(twData, 'metaRoas'),
      ),
      buildRow('Google Ads',
        getMetric(twData, 'googleAdSpend'),
        getMetric(twData, 'googleCpa'),
        getMetric(twData, 'googleConversionValue'),
        // Google doesn't report purchases in TW summary — compute from CV/AOV if possible
        0,
        getMetric(twData, 'googleRoas'),
        { ncCpa: getMetric(twData, 'googleAllCpa') },
      ),
      buildRow('TikTok Ads',
        getMetric(twData, 'tiktokAdSpend'),
        getMetric(twData, 'tiktokCpa'),
        getMetric(twData, 'tiktokConversionValue'),
        getMetric(twData, 'tiktokPurchases'),
        getMetric(twData, 'tiktokRoas'),
      ),
      buildRow('Reddit Ads',
        getMetric(twData, 'redditAdSpend'),
        getMetric(twData, 'redditCpa'),
        getMetric(twData, 'redditConversionValue'),
        getMetric(twData, 'redditConversions'),
        getMetric(twData, 'redditRoas'),
        { aov: getMetric(twData, 'redditAov'), cr: getMetric(twData, 'redditConversionRate') },
      ),
    ].filter(ch => ch.spend > 0 || ch.cv > 0);
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
    // Use SQL-based attribution data (per-model) when available, fallback to summary data
    if (attrData && attrData.length > 0) return attrData;
    if (twChannelData) return twChannelData;
    return null;
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
        <div data-testid="kpi-order-revenue">
          <KPICard 
            label="Order Revenue" 
            value={formatCurrencyValue(aggregatedData.totalRevenue)} 
            change={aggregatedData.prevRevenue > 0 ? pctChange(aggregatedData.totalRevenue, aggregatedData.prevRevenue) : 0} 
            sparkline={[]}
            target={getTarget('Net Revenue') !== null ? formatCurrencyValue(getTarget('Net Revenue')!) : undefined}
            targetAchievement={getTargetAchievement('Net Revenue', aggregatedData.totalRevenue) ?? undefined}
            dataSource="Triple Whale"
          />
        </div>
        <div data-testid="kpi-ad-spend">
          <KPICard 
            label="Ad Spend" 
            value={formatCurrencyValue(aggregatedData.totalCosts)} 
            change={aggregatedData.prevCosts > 0 ? pctChange(aggregatedData.totalCosts, aggregatedData.prevCosts) : 0} 
            sparkline={[]}
            target={getTarget('Marketing Costs') !== null ? formatCurrencyValue(getTarget('Marketing Costs')!) : undefined}
            targetAchievement={getTargetAchievement('Marketing Costs', aggregatedData.totalCosts) ?? undefined}
            dataSource="Triple Whale"
          />
        </div>
        <div data-testid="kpi-mer">
          <KPICard 
            label="MER" 
            value={`${aggregatedData.mer.toFixed(2)}x`} 
            change={aggregatedData.prevMer > 0 ? pctChange(aggregatedData.mer, aggregatedData.prevMer) : 0} 
            sparkline={[]}
            target={getTarget('MER') !== null ? `${getTarget('MER')!.toFixed(2)}x` : undefined}
            targetAchievement={getTargetAchievement('MER', aggregatedData.mer) ?? undefined}
            dataSource="Triple Whale"
          />
        </div>
        <div data-testid="kpi-amer">
          <KPICard 
            label="aMER" 
            value={`${aggregatedData.amer.toFixed(2)}x`} 
            change={aggregatedData.prevAmer > 0 ? pctChange(aggregatedData.amer, aggregatedData.prevAmer) : 0} 
            sparkline={[]}
            target={getTarget('aMER') !== null ? `${getTarget('aMER')!.toFixed(2)}x` : undefined}
            targetAchievement={getTargetAchievement('aMER', aggregatedData.amer) ?? undefined}
            dataSource="Triple Whale"
          />
        </div>
      </div>

      {/* KPI Cards Row 2: Orders, New Customers, CAC, nCAC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div data-testid="kpi-orders">
          <KPICard 
            label="Orders" 
            value={formatNumber(aggregatedData.totalOrders)} 
            change={aggregatedData.prevOrders > 0 ? pctChange(aggregatedData.totalOrders, aggregatedData.prevOrders) : 0} 
            sparkline={[]}
            target={getTarget('Orders') !== null ? formatNumber(Math.round(getTarget('Orders')!)) : undefined}
            targetAchievement={getTargetAchievement('Orders', aggregatedData.totalOrders) ?? undefined}
            dataSource="Triple Whale"
          />
        </div>
        <div data-testid="kpi-nc-orders">
          <KPICard 
            label="NC Orders" 
            value={formatNumber(aggregatedData.totalNewCustomers)} 
            change={aggregatedData.prevNewCustomers > 0 ? pctChange(aggregatedData.totalNewCustomers, aggregatedData.prevNewCustomers) : 0} 
            sparkline={[]}
            target={getTarget('NC Orders') !== null ? formatNumber(Math.round(getTarget('NC Orders')!)) : undefined}
            targetAchievement={getTargetAchievement('NC Orders', aggregatedData.totalNewCustomers) ?? undefined}
            dataSource="Triple Whale"
          />
        </div>
        <div data-testid="kpi-cac">
          <KPICard 
            label="CAC" 
            value={formatCurrencyValue(aggregatedData.cac)} 
            change={aggregatedData.prevCac > 0 ? pctChange(aggregatedData.cac, aggregatedData.prevCac) : 0} 
            sparkline={[]}
            target={getTarget('CAC') !== null ? formatCurrencyValue(getTarget('CAC')!) : undefined}
            targetAchievement={getTargetAchievement('CAC', aggregatedData.cac) ?? undefined}
            dataSource="Triple Whale"
          />
        </div>
        <div data-testid="kpi-ncac">
          <KPICard 
            label="ncCAC" 
            value={formatCurrencyValue(aggregatedData.ncac)} 
            change={aggregatedData.prevNcac > 0 ? pctChange(aggregatedData.ncac, aggregatedData.prevNcac) : 0} 
            sparkline={[]}
            target={getTarget('ncCAC') !== null ? formatCurrencyValue(getTarget('ncCAC')!) : undefined}
            targetAchievement={getTargetAchievement('ncCAC', aggregatedData.ncac) ?? undefined}
            dataSource="Triple Whale"
          />
        </div>
      </div>

      {/* CAC/LTV and LTV per Customer KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <KPICard 
            label="CAC/LTV Ratio" 
            value={`1:${aggregatedData.cacLtvRatio.toFixed(1)}`} 
            change={0} 
            sparkline={[]}
            dataSource="Triple Whale"
          />
          <p className="text-[10px] text-text-tertiary mt-1 px-1">Lifetime data — not tied to date picker</p>
        </div>
        <div>
          <KPICard 
            label="LTV per Customer" 
            value={formatCurrencyValue(aggregatedData.ltv)} 
            change={0} 
            sparkline={[]}
            target={getTarget('AOV') !== null ? formatCurrencyValue(getTarget('AOV')! * 3.5) : undefined}
            targetAchievement={getTarget('AOV') !== null ? (aggregatedData.ltv / (getTarget('AOV')! * 3.5)) * 100 : undefined}
            dataSource="Triple Whale"
          />
          <p className="text-[10px] text-text-tertiary mt-1 px-1">Lifetime data — not tied to date picker</p>
        </div>
      </div>

      {/* Revenue & Marketing Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5" data-testid="revenue-chart">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary truncate">Order Revenue & Ad Spend</h3>
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
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11, color: 'var(--color-text-primary)' }}
                  formatter={(value: any, name: any) => [formatCurrencyValue(value), String(name || '')]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="revenue" name="Order Revenue" stroke="#34D399" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="costs" name="Ad Spend" stroke="#EDBF63" strokeWidth={2.5} dot={false} />
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
                />
                <YAxis 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                />
                <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="newCustomers" name="New Customers" stroke="#EDBF63" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="orders" name="Net Orders" stroke="#4A6BD6" strokeWidth={2} dot={false} />
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
            { label: 'Sessions', value: ga4Data ? getGA4Metric(ga4Data, 'sessions').toLocaleString() : (twData ? getMetric(twData, 'sessions').toLocaleString() : '33,850') },
            { label: 'CVR', value: twData ? `${getMetric(twData, 'conversionRate').toFixed(2)}%` : '3.33%' },
            { label: 'Engagement Rate', value: ga4Data ? `${(getGA4Metric(ga4Data, 'engagementRate') * 100).toFixed(1)}%` : '78.0%' },
            { label: 'Bounce Rate', value: ga4Data ? `${(getGA4Metric(ga4Data, 'bounceRate') * 100).toFixed(1)}%` : (twData ? `${getMetric(twData, 'bounceRate').toFixed(1)}%` : '42.7%') },
            { label: 'Pages/Session', value: ga4Data ? getGA4Metric(ga4Data, 'screenPageViewsPerSession').toFixed(2) : '3.97' },
            { label: 'Avg Session', value: ga4Data ? `${Math.floor(getGA4Metric(ga4Data, 'averageSessionDuration') / 60)}m ${Math.floor(getGA4Metric(ga4Data, 'averageSessionDuration') % 60)}s` : '2m 34s' },
            { label: 'Conversions', value: ga4Data ? getGA4Metric(ga4Data, 'conversions').toLocaleString() : '0' },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between">
              <div className="flex items-center text-xs text-text-secondary gap-1">
                <span>{m.label}</span>
                <InfoTooltip metric={m.label} />
              </div>
              <span className="text-sm font-semibold text-text-primary">{m.value}</span>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary">Unique Sessions</h3>
            <div className="flex items-center gap-2"><DataSource source="Google Analytics" /><LiveBadge variant={ga4DailyData.length > 0 ? 'live' : 'sample'} /></div>
          </div>
          <div className="min-h-[180px]">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ga4DailyData.length > 0 
                ? ga4DailyData.map(d => ({ displayDate: formatDateLabel(d.date, 'day'), sessions: d.sessions }))
                : chartData.map(d => ({ displayDate: d.displayDate, sessions: d.sessions }))
              }>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} 
                  tickFormatter={(v) => v.toLocaleString()}
                />
                <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }} />
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-text-primary">Channel Attribution</h3>
              <DataSource source="Triple Whale" />
              <LiveBadge />
            </div>
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
          <div className="text-[10px] text-text-tertiary self-end">
            Lifetime window
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border text-xs text-text-secondary uppercase">
                  <th className="text-left py-3 px-2 sm:px-3 font-medium min-w-[100px]">Channel</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[80px]">Spend</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[70px]">CPA</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[70px]">NC CPA</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[70px]">AOV</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[90px]">CV</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[70px]">Purchases</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[60px]">ROAS</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[70px]">NC ROAS</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[50px]">NCP</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[50px]">CR</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentChannelData()?.map((row) => (
                  <tr key={row.channel} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                    <td className="py-3 px-2 sm:px-3 font-medium text-text-primary">{row.channel}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{formatCurrencyValue(row.spend)}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.cpa > 0 ? formatCurrencyValue(row.cpa) : '—'}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.ncCpa > 0 ? formatCurrencyValue(row.ncCpa) : '—'}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.aov > 0 ? formatCurrencyValue(row.aov) : '—'}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-primary">{row.cv > 0 ? formatCurrencyValue(row.cv) : '—'}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.purchases > 0 ? row.purchases : '—'}</td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <span className={row.roas >= 3.5 ? 'text-success' : row.roas >= 2.5 ? 'text-warm-gold' : row.roas > 0 ? 'text-danger' : 'text-text-tertiary'}>
                        {row.roas > 0 ? `${row.roas.toFixed(2)}x` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.ncRoas > 0 ? `${row.ncRoas.toFixed(2)}x` : '—'}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.ncp > 0 ? row.ncp : '—'}</td>
                    <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.cr > 0 ? `${row.cr.toFixed(2)}%` : '—'}</td>
                  </tr>
                )) ?? (
                  <tr><td colSpan={11} className="py-6 text-center text-text-tertiary text-sm">Loading channel data...</td></tr>
                )}
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
                <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }} />
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
              { label: 'NC AOV', value: formatCurrencyValue(twData ? aggregatedData.ncAov : revenueInsights.ncAOV), metric: 'NC AOV' },
              { label: 'RC AOV', value: formatCurrencyValue(twData ? aggregatedData.rcAov : revenueInsights.rcAOV), metric: 'RC AOV' },
              { label: 'NC Orders', value: twData ? formatNumber(getMetric(twData, 'newCustomerOrders')) : formatNumber(revenueInsights.firstPurchasePct), metric: 'NC Orders' },
              { label: 'RC Orders', value: twData ? formatNumber(getMetric(twData, 'orders') - getMetric(twData, 'newCustomerOrders')) : '—', metric: 'RC Orders' },
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
          {(() => {
            const ncRev = twData ? getMetric(twData, 'newCustomerRevenue') : revenueInsights.ncRevenue;
            const rcRev = twData ? getMetric(twData, 'returningCustomerRevenue') : revenueInsights.rcRevenue;
            const total = ncRev + rcRev;
            const ncPct = total > 0 ? (ncRev / total) * 100 : 50;
            const rcPct = total > 0 ? (rcRev / total) * 100 : 50;
            return (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="min-w-[200px]">
                  <ResponsiveContainer width={200} height={140}>
                    <PieChart>
                      <Pie data={[
                        { name: 'New Customer', value: ncPct },
                        { name: 'Returning', value: rcPct },
                      ]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                        <Cell fill="#4A6BD6" />
                        <Cell fill="#34D399" />
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs text-text-secondary space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-blue-light shrink-0" />
                    <span>New Customer: {ncPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
                    <span>Returning: {rcPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })()}
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
          promptId="dashboard-intelligence"
        />
      </div>
    </div>
  );
}
