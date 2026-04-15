'use client';
import { useState, useMemo, useEffect } from 'react';
import KPICard from '@/components/ui/KPICard';
import InfoTooltip from '@/components/ui/InfoTooltip';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import DataSource from '@/components/ui/DataSource';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { ChartTooltipContent } from '@/components/ui/ChartTooltipContent';
import { SkeletonKPICard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { useCurrency } from '@/components/CurrencyProvider';
import { useDateRange } from '@/components/DateProvider';
import { filterByDateRange, formatDateLabel, aggregateToWeeks, toLocalDateString, isWithinRange } from '@/lib/dateUtils';
import { formatYyyyMmDdInTimeZone } from '@/lib/ga4-reporting-dates';
import {
  fetchTripleWhaleData,
  fetchTWProductKpis,
  getMetric,
  getPrevMetric,
  getDelta,
  getDailyData,
  TWData,
  type TWProductKpiRow,
} from '@/lib/triple-whale-client';
import { fetchGA4Data, getGA4Metric, GA4Data } from '@/lib/ga4-client';
import { useTargets } from '@/lib/useTargets';
import { filterAttributionChannelRows } from '@/lib/attribution-filters';

import { kpiCards, dailyMetrics, revenueInsights } from '@/lib/sample-data';
import { formatCurrency, formatCurrencyWhole, formatNumber } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#334FB4', '#EDBF63', '#34D399', '#EF4444', '#4A6BD6', '#94A3B8'];

/** Triple Whale `pixel_joined_tvf` model labels (order matches UI dropdown). */
const CHANNEL_ATTRIBUTION_MODELS = [
  'First Click',
  'Last Click',
  'Linear All',
  'Linear Paid',
  'Triple Attribution',
] as const;

function pctChange(curr: number, prev: number) {
  return ((curr - prev) / prev) * 100;
}

export default function DashboardPage() {
  const { currency, convertValue, exchangeRate } = useCurrency();
  const { dateRange } = useDateRange();
  const { getTarget, getTargetAchievement } = useTargets();
  const [attributionModel, setAttributionModel] = useState<string>('Triple Attribution');
  const [attributionWindow, setAttributionWindow] = useState('7-day');
  const [twData, setTwData] = useState<TWData | null>(null);
  const [twLoading, setTwLoading] = useState(true);
  const [ga4Data, setGA4Data] = useState<GA4Data | null>(null);
  const [ga4Loading, setGA4Loading] = useState(true);
  const [ga4DailyData, setGA4DailyData] = useState<Array<{ date: string; sessions: number; totalUsers: number }>>([]);
  const [attrData, setAttrData] = useState<any[] | null>(null);
  const [attrLoading, setAttrLoading] = useState(true);
  const [attrError, setAttrError] = useState<string | null>(null);
  const [productKpiRows, setProductKpiRows] = useState<TWProductKpiRow[]>([]);
  const [productKpiLoading, setProductKpiLoading] = useState(true);
  const [productKpiError, setProductKpiError] = useState<string | null>(null);

  useEffect(() => {
    setTwLoading(true);
    setGA4Loading(true);
    const startDate = toLocalDateString(dateRange.startDate);
    const endDate = toLocalDateString(dateRange.endDate);
    fetchTripleWhaleData(startDate, endDate, 'all')
      .then(setTwData)
      .catch(console.error)
      .finally(() => setTwLoading(false));
    // Fetch GA4 summary + daily in parallel (reporting timezone comes from GA4 Data API metadata)
    Promise.all([
      fetchGA4Data(startDate, endDate, 'summary'),
      fetch(`/api/ga4?startDate=${startDate}&endDate=${endDate}&mode=daily`)
        .then((r) => r.json())
        .catch(() => ({ success: false })),
    ]).then(([ga4, dailyRes]) => {
      const daily =
        dailyRes && typeof dailyRes === 'object' && dailyRes.success && Array.isArray(dailyRes.data?.daily)
          ? dailyRes.data.daily
          : [];
      const tzFromDaily =
        dailyRes && typeof dailyRes === 'object' && dailyRes.success && dailyRes.data?.reportingTimeZone
          ? String(dailyRes.data.reportingTimeZone)
          : null;
      const reportingTimeZone = ga4.reportingTimeZone ?? tzFromDaily ?? null;
      setGA4Data({ ...ga4, reportingTimeZone });
      setGA4DailyData(daily.map((d: { date?: string; sessions?: number; totalUsers?: number }) => ({
        date: d.date ?? '',
        sessions: d.sessions ?? 0,
        totalUsers: d.totalUsers ?? 0,
      })));
    }).catch(console.error)
      .finally(() => setGA4Loading(false));
  }, [dateRange]);

  // Channel attribution: always from TW SQL (model + window); never mix in summary-channel fallback
  useEffect(() => {
    let cancelled = false;
    setAttrLoading(true);
    setAttrError(null);
    const startDate = toLocalDateString(dateRange.startDate);
    const endDate = toLocalDateString(dateRange.endDate);
    fetch(`/api/triple-whale/attribution?startDate=${startDate}&endDate=${endDate}&model=${encodeURIComponent(attributionModel)}&window=${encodeURIComponent(attributionWindow)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setAttrData(Array.isArray(json.data) ? json.data : []);
          setAttrError(null);
        } else {
          setAttrData([]);
          setAttrError(json.error || 'Could not load attribution data');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setAttrData([]);
          setAttrError(e?.message || 'Could not load attribution data');
        }
      })
      .finally(() => {
        if (!cancelled) setAttrLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange, attributionModel, attributionWindow]);

  useEffect(() => {
    let cancelled = false;
    setProductKpiLoading(true);
    setProductKpiError(null);
    const startDate = toLocalDateString(dateRange.startDate);
    const endDate = toLocalDateString(dateRange.endDate);
    fetchTWProductKpis(startDate, endDate)
      .then((rows) => {
        if (!cancelled) setProductKpiRows(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setProductKpiRows([]);
          setProductKpiError(e instanceof Error ? e.message : 'Could not load product KPIs');
        }
      })
      .finally(() => {
        if (!cancelled) setProductKpiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

  /** Same basis as KPIs/charts (TW raw → convertValue), integers + locale grouping — tooltips & dense axes */
  const formatCurrencyValueWhole = (value: number) => {
    return formatCurrencyWhole(convertValue(value), currency);
  };

  /** Triple Whale SQL attribution amounts are in USD; convert for display when user chooses ₱. */
  const formatAttributionCurrency = (usdValue: number) => {
    if (currency === '$') return formatCurrency(usdValue, '$');
    return formatCurrency(usdValue * exchangeRate, '₱');
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

  /** Stacked NC vs RC bars: TW daily series when available, else sample months intersecting the global range (no full Oct–Mar fallback). */
  const filteredRevenueMonthly = useMemo(() => {
    const ncDaily = getDailyData(twData, 'newCustomerRevenue');
    const rcDaily = getDailyData(twData, 'returningCustomerRevenue');

    if (ncDaily.length > 0 || rcDaily.length > 0) {
      const byDate = new Map<string, { nc: number; rc: number }>();
      for (const d of ncDaily) {
        const cur = byDate.get(d.date) ?? { nc: 0, rc: 0 };
        cur.nc = d.value;
        byDate.set(d.date, cur);
      }
      for (const d of rcDaily) {
        const cur = byDate.get(d.date) ?? { nc: 0, rc: 0 };
        cur.rc = d.value;
        byDate.set(d.date, cur);
      }

      const dailyRows = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({ date, nc: vals.nc, rc: vals.rc }))
        .filter((row) => isWithinRange(row.date, dateRange.startDate, dateRange.endDate));

      if (dailyRows.length === 0 && twData) {
        const nc = getMetric(twData, 'newCustomerRevenue');
        const rc = getMetric(twData, 'returningCustomerRevenue');
        const start = toLocalDateString(dateRange.startDate);
        const end = toLocalDateString(dateRange.endDate);
        return [
          {
            month: start,
            displayMonth: `${formatDateLabel(start, 'day')} – ${formatDateLabel(end, 'day')}`,
            nc,
            rc,
          },
        ];
      }

      if (dailyRows.length === 0) return [];

      if (dailyRows.length > 30) {
        const forWeeks = dailyRows.map((r) => ({ ...r, displayDate: '' as string }));
        const weekly = aggregateToWeeks(forWeeks, 'date');
        return weekly.map((w) => ({
          month: String(w.date),
          displayMonth: w.displayDate,
          nc: Number(w.nc ?? 0),
          rc: Number(w.rc ?? 0),
        }));
      }

      return dailyRows.map((d) => ({
        month: d.date,
        displayMonth: formatDateLabel(d.date, 'day'),
        nc: d.nc,
        rc: d.rc,
      }));
    }

    const filtered = filterByDateRange(revenueInsights.monthly, 'month', dateRange.startDate, dateRange.endDate);
    if (filtered.length === 0) return [];
    return filtered.map((d) => ({
      ...d,
      displayMonth: formatDateLabel(d.month, 'month'),
    }));
  }, [dateRange, twData]);

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

  const visibleAttrData = useMemo(
    () => filterAttributionChannelRows(attrData ?? []),
    [attrData],
  );

  const dashboardAnalysisContext = useMemo(
    () => ({
      dateRangeIso: {
        start: toLocalDateString(dateRange.startDate),
        end: toLocalDateString(dateRange.endDate),
      },
      /** Same IANA zone as GA4 admin "Reporting timezone" (from Data API metadata). */
      ga4ReportingTimeZone: ga4Data?.reportingTimeZone ?? null,
      /** Calendar "today" in that zone — use for AI, not UTC/server date. */
      ga4TodayInReportingTimeZone: ga4Data?.reportingTimeZone
        ? formatYyyyMmDdInTimeZone(new Date(), ga4Data.reportingTimeZone)
        : toLocalDateString(new Date()),
      kpis: {
        totalRevenue: aggregatedData.totalRevenue,
        totalCosts: aggregatedData.totalCosts,
        totalOrders: aggregatedData.totalOrders,
        totalNewCustomers: aggregatedData.totalNewCustomers,
        totalSessions: aggregatedData.totalSessions,
        mer: aggregatedData.mer,
        amer: aggregatedData.amer,
        cac: aggregatedData.cac,
        ncac: aggregatedData.ncac,
        ncAov: aggregatedData.ncAov,
        rcAov: aggregatedData.rcAov,
        ltv: aggregatedData.ltv,
        cacLtvRatio: aggregatedData.cacLtvRatio,
      },
      tripleWhaleConnected: Boolean(twData),
      ga4Summary: ga4Data
        ? {
            sessions: getGA4Metric(ga4Data, 'sessions'),
            conversions: getGA4Metric(ga4Data, 'conversions'),
            engagementRate: getGA4Metric(ga4Data, 'engagementRate'),
            /** conversions/sessions — aligns with session-scoped conversion rate when using aggregate metrics */
            conversionRateSessions: (() => {
              const s = getGA4Metric(ga4Data, 'sessions');
              const c = getGA4Metric(ga4Data, 'conversions');
              return s > 0 ? c / s : null;
            })(),
          }
        : null,
      channelAttributionRows: visibleAttrData.slice(0, 30),
      attributionModel,
      attributionWindow,
      productKpisSample: productKpiRows.slice(0, 40).map((p) => ({
        product: p.product,
        revenue: p.revenue,
        units: p.units,
      })),
      targetHints: {
        mer: getTarget('MER'),
        aMER: getTarget('aMER'),
        ncCAC: getTarget('ncCAC'),
      },
    }),
    [dateRange, aggregatedData, twData, ga4Data, visibleAttrData, attributionModel, attributionWindow, productKpiRows, getTarget]
  );

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
                  tickFormatter={(v) => formatCurrencyValueWhole(Number(v))}
                  width={60}
                />
                <Tooltip 
                  content={ChartTooltipContent}
                  itemSorter={(item) => (item.dataKey === 'revenue' ? 0 : item.dataKey === 'costs' ? 1 : 2)}
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11, color: 'var(--color-text-primary)' }}
                  formatter={(value: unknown, name: unknown) => [
                    formatCurrencyValueWhole(Number(value)),
                    String(name ?? ''),
                  ]}
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
                <Tooltip content={ChartTooltipContent} contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }} />
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
            {
              label: 'CVR',
              value: ga4Data
                ? (() => {
                    const s = getGA4Metric(ga4Data, 'sessions');
                    const c = getGA4Metric(ga4Data, 'conversions');
                    return s > 0 ? `${((c / s) * 100).toFixed(2)}%` : '—';
                  })()
                : twData
                  ? `${getMetric(twData, 'conversionRate').toFixed(2)}%`
                  : '3.33%',
            },
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
                <Tooltip content={ChartTooltipContent} contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }} />
                <Bar dataKey="sessions" name="Sessions" fill="#334FB4" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Channel Attribution Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5" data-testid="attribution-table">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-text-primary">Channel Attribution</h3>
            <DataSource source="Triple Whale" />
            <LiveBadge />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium shrink-0">Model:</span>
              <div className="relative">
                <select
                  value={attributionModel}
                  onChange={(e) => setAttributionModel(e.target.value)}
                  className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors min-w-[160px]"
                  aria-label="Attribution model"
                >
                  {CHANNEL_ATTRIBUTION_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium shrink-0">Attribution window:</span>
              <div className="relative">
                <select
                  value={attributionWindow}
                  onChange={(e) => setAttributionWindow(e.target.value)}
                  className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors min-w-[120px]"
                  aria-label="Attribution window"
                >
                  <option value="1-day">1 day</option>
                  <option value="7-day">7 days</option>
                  <option value="14-day">14 days</option>
                  <option value="28-day">28 days</option>
                  <option value="lifetime">Lifetime</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              </div>
            </div>
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
                {attrLoading ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-text-tertiary text-sm">
                      Loading channel data…
                    </td>
                  </tr>
                ) : attrError ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-danger text-sm">
                      {attrError}
                    </td>
                  </tr>
                ) : !attrData || attrData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-text-tertiary text-sm">
                      No channels for this model and window in the selected period.
                    </td>
                  </tr>
                ) : visibleAttrData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-text-tertiary text-sm">
                      No channels to display for this model and window.
                    </td>
                  </tr>
                ) : (
                  visibleAttrData.map((row, idx) => (
                    <tr
                      key={row.channelId ? `${row.channelId}-${idx}` : `${row.channel}-${idx}`}
                      className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors"
                    >
                      <td className="py-3 px-2 sm:px-3 font-medium text-text-primary">{row.channel}</td>
                      <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{formatAttributionCurrency(row.spend)}</td>
                      <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.cpa > 0 ? formatAttributionCurrency(row.cpa) : '—'}</td>
                      <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.ncCpa > 0 ? formatAttributionCurrency(row.ncCpa) : '—'}</td>
                      <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.aov > 0 ? formatAttributionCurrency(row.aov) : '—'}</td>
                      <td className="py-3 px-2 sm:px-3 text-right text-text-primary">{row.cv > 0 ? formatAttributionCurrency(row.cv) : '—'}</td>
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
                  ))
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
            {filteredRevenueMonthly.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-text-tertiary">
                No NC/RC breakdown for this period.
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={filteredRevenueMonthly} margin={{ top: 10, right: 20, bottom: 60, left: 28 }}>
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
                  tickFormatter={(v) => formatCurrencyValueWhole(Number(v))} 
                  label={{
                    content: (props) => {
                      const vb = props.viewBox;
                      if (
                        !vb ||
                        !('x' in vb) ||
                        typeof (vb as { x: number }).x !== 'number' ||
                        typeof (vb as { height: number }).height !== 'number'
                      ) {
                        return null;
                      }
                      const x = (vb as { x: number; y?: number; height: number }).x;
                      const y = (vb as { y?: number }).y ?? 0;
                      const height = (vb as { height: number }).height;
                      const cy = y + height / 2;
                      return (
                        <text
                          x={x}
                          y={cy}
                          fill="var(--color-text-tertiary)"
                          fontSize={11}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(-90, ${x}, ${cy})`}
                        >
                          <tspan x={25} dy={-10}>{`Revenue (${currency})`}</tspan>
                        </text>
                      );
                    },
                  }}
                />
                <Tooltip
                  content={ChartTooltipContent}
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }}
                  formatter={(value: unknown, name: unknown) => [
                    formatCurrencyValueWhole(Number(value)),
                    String(name ?? ''),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="nc" name="New Customer Rev" stackId="a" fill="#4A6BD6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="rc" name="Repeat Customer Rev" stackId="a" fill="#34D399" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
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
                      <Tooltip content={ChartTooltipContent} contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }} />
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
          <div className="flex items-center gap-2">
            <DataSource source="Triple Whale" />
            <LiveBadge variant={!productKpiLoading && !productKpiError ? 'live' : 'sample'} />
          </div>
        </div>
        {productKpiLoading ? (
          <SkeletonTable rows={5} cols={3} />
        ) : productKpiError ? (
          <p className="text-sm text-text-secondary">{productKpiError}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-border text-xs text-text-secondary uppercase">
                  <th className="text-left py-3 px-2 sm:px-3 font-medium min-w-[120px]">Product</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[100px]">Net Revenue</th>
                  <th className="text-right py-3 px-2 sm:px-3 font-medium min-w-[80px]">Units Sold</th>
                </tr>
              </thead>
              <tbody>
                {productKpiRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 px-3 text-center text-text-secondary text-sm">
                      No product sales in this date range.
                    </td>
                  </tr>
                ) : (
                  productKpiRows.map((row, i) => (
                    <tr
                      key={row.productId ? `${row.productId}-${i}` : `${row.product}-${i}`}
                      className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors"
                    >
                      <td className="py-3 px-2 sm:px-3 font-medium text-text-primary">{row.product}</td>
                      <td className="py-3 px-2 sm:px-3 text-right text-text-primary">
                        {formatCurrencyValue(row.revenue)}
                      </td>
                      <td className="py-3 px-2 sm:px-3 text-right text-text-secondary">{row.units}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary AI Analysis with full controls */}
      <div>
        <AISuggestionsPanel 
          suggestions={getCrossPageInsights().map((item, i) => `${item.title}: ${item.insight}`)}
          title="Daily Summary & Intelligence"
          promptId="dashboard-intelligence"
          pageLabel="Dashboard"
          analysisContext={dashboardAnalysisContext}
        />
      </div>
    </div>
  );
}
