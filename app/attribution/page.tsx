'use client';
import { useState, useEffect, useCallback } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import DataSource from '@/components/ui/DataSource';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { SkeletonMetricCard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import AIIntelligenceControls from '@/components/ui/AIIntelligenceControls';
import { useCurrency } from '@/components/CurrencyProvider';
import { useDateRange } from '@/components/DateProvider';
import { formatCurrency } from '@/lib/utils';
import { toLocalDateString } from '@/lib/dateUtils';
import { fetchTripleWhaleData, getMetric, getPrevMetric, TWData } from '@/lib/triple-whale-client';
import { fetchGA4Data, getGA4Metric, GA4Data } from '@/lib/ga4-client';
import { attributionSurvey, trackingHealth as sampleTrackingHealth, adScatterData, attributionAISuggestions } from '@/lib/sample-data';
import { Star, GitBranch, Activity, Database, Layers, Sparkles, ChevronDown } from 'lucide-react';
import {
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis,
} from 'recharts';

const COLORS = ['#334FB4', '#4A6BD6', '#EDBF63', '#34D399', '#EF4444', '#94A3B8'];

const cohortAttributionModels = ['First Click', 'Last Click', 'Linear All', 'Linear Paid'];
const cohortAttributionWindows = ['1-day click', '7-day click / 1-day view', '28-day click / 1-day view', '28-day click / 28-day view'];

const treeLayers = [
  { id: 'star', label: 'MER / nCAC', icon: Star, description: 'Top-level efficiency metrics, your north star for marketing health', color: '#EDBF63' },
  { id: 'upper', label: 'Surveys & MMM', icon: GitBranch, description: 'Directional measurement, budget allocation layer using survey data and modeling', color: '#4A6BD6' },
  { id: 'lower', label: 'MTA & Platform', icon: Activity, description: 'Ad-level optimization, tactical decisions based on multi-touch and platform data', color: '#334FB4' },
  { id: 'trunk', label: 'Tracking Infra', icon: Database, description: 'The foundation, GA4, CAPI, and server-side tracking health', color: '#34D399' },
  { id: 'roots', label: 'Cohort LTV', icon: Layers, description: 'Long-term value, measuring customer quality by acquisition source', color: '#A855F7' },
];

interface LayerInsights {
  working: string[];
  notWorking: string[];
  doNext: string[];
  stopDoing: string[];
}

// This will be created dynamically inside the component

// This will be created dynamically inside the component

export default function AttributionPage() {
  const { currency, convertValue } = useCurrency();
  const { dateRange } = useDateRange();
  const [activeLayer, setActiveLayer] = useState<string>('star');
  const [twData, setTwData] = useState<TWData | null>(null);
  const [twLoading, setTwLoading] = useState(true);
  const [ga4Data, setGA4Data] = useState<GA4Data | null>(null);
  const [ga4Loading, setGA4Loading] = useState(true);

  useEffect(() => {
    setTwLoading(true);
    setGA4Loading(true);
    const startDate = toLocalDateString(dateRange.startDate);
    const endDate = toLocalDateString(dateRange.endDate);
    fetchTripleWhaleData(startDate, endDate, 'summary')
      .then(setTwData)
      .catch(console.error)
      .finally(() => setTwLoading(false));
    fetchGA4Data(startDate, endDate, 'summary')
      .then(setGA4Data)
      .catch(console.error)
      .finally(() => setGA4Loading(false));
  }, [dateRange]);
  const [cohortAttrModel, setCohortAttrModel] = useState('First Click');
  const [cohortAttrWindow, setCohortAttrWindow] = useState('7-day click / 1-day view');
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
  const [hiddenIntel, setHiddenIntel] = useState<Set<string>>(new Set());
  const [eventPages, setEventPages] = useState<Record<string, number>>({});
  const [liveTrackingData, setLiveTrackingData] = useState<{
    totalEventsPerDay: number;
    status: 'healthy' | 'warning' | 'error';
    events: { event: string; count: string; type: string }[];
  } | null>(null);
  const [trackingIsLive, setTrackingIsLive] = useState(false);

  // Fetch live Google Ads tracking data
  const fetchTrackingData = useCallback(async () => {
    try {
      const startDateStr = toLocalDateString(dateRange.startDate);
      const endDateStr = toLocalDateString(dateRange.endDate);
      const res = await fetch(`/api/google-ads/tracking?startDate=${startDateStr}&endDate=${endDateStr}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLiveTrackingData(json.data);
        setTrackingIsLive(true);
      } else {
        setLiveTrackingData(null);
        setTrackingIsLive(false);
      }
    } catch {
      setLiveTrackingData(null);
      setTrackingIsLive(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  // Merge live Google Ads + GA4 data into tracking health array
  const trackingHealth = sampleTrackingHealth.map((item) => {
    if (item.system === 'Google Ads Tag' && liveTrackingData) {
      return {
        ...item,
        status: liveTrackingData.status,
        events: `${liveTrackingData.totalEventsPerDay.toLocaleString()}/day`,
        matchRate: 'N/A' as const,
        source: undefined as unknown as typeof item.source,
        eventBreakdown: liveTrackingData.events.map((ev) => ({
          event: ev.event,
          count: ev.count,
          matchRate: 'N/A' as const,
          type: undefined as unknown as 'Multiple',
        })),
      };
    }
    if (item.system === 'GA4' && ga4Data?.summary) {
      const dayCount = Math.max(1, Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const pageViews = getGA4Metric(ga4Data, 'screenPageViews');
      const addToCarts = getGA4Metric(ga4Data, 'addToCarts');
      const checkouts = getGA4Metric(ga4Data, 'checkouts');
      const purchases = getGA4Metric(ga4Data, 'ecommercePurchases');
      const eventCount = getGA4Metric(ga4Data, 'eventCount');
      const conversions = getGA4Metric(ga4Data, 'conversions');
      const totalEvents = eventCount || (pageViews + addToCarts + checkouts + purchases);
      const eventsPerDay = Math.round(totalEvents / dayCount);
      // Build event breakdown with known events + "Other Events" for the remainder
      const knownTotal = pageViews + addToCarts + checkouts + purchases;
      const otherEvents = Math.max(0, eventCount - knownTotal);
      const breakdown = [
        { event: 'page_view', count: Math.round(pageViews / dayCount).toLocaleString(), matchRate: 'N/A' as const, type: 'Browser' as const },
        { event: 'add_to_cart', count: Math.round(addToCarts / dayCount).toLocaleString(), matchRate: 'N/A' as const, type: 'Browser' as const },
        { event: 'begin_checkout', count: Math.round(checkouts / dayCount).toLocaleString(), matchRate: 'N/A' as const, type: 'Browser' as const },
        { event: 'purchase', count: Math.round(purchases / dayCount).toLocaleString(), matchRate: 'N/A' as const, type: 'Browser' as const },
        ...(conversions > 0 ? [{ event: 'conversions (all)', count: Math.round(conversions / dayCount).toLocaleString(), matchRate: 'N/A' as const, type: 'Browser' as const }] : []),
        ...(otherEvents > 0 ? [{ event: 'Other Events', count: Math.round(otherEvents / dayCount).toLocaleString(), matchRate: 'N/A' as const, type: 'Browser' as const }] : []),
      ];
      return {
        ...item,
        status: 'healthy' as const,
        events: `${eventsPerDay.toLocaleString()}/day`,
        matchRate: 'N/A' as const,
        source: undefined as unknown as typeof item.source,
        eventBreakdown: breakdown,
      };
    }
    return item;
  });

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

  // Helper function to toggle system expansion
  const toggleSystemExpansion = (system: string) => {
    const newExpanded = new Set(expandedSystems);
    if (newExpanded.has(system)) {
      newExpanded.delete(system);
    } else {
      newExpanded.add(system);
    }
    setExpandedSystems(newExpanded);
  };

  // Dynamic layer insights with currency conversion
  const getLayerInsights = (): Record<string, LayerInsights> => ({
    star: {
      working: ['MER at 3.67x is above the 3.5x healthy threshold, marketing is generating strong returns', `nCAC trending down 2.6% MoM from ${formatCurrencyValue(808)} to ${formatCurrencyValue(787)}, acquisition getting more efficient`],
      notWorking: ['nMER at 1.92x means new customer revenue alone doesn\'t cover spend, reliant on repeats', 'MER variance across channels is high (Meta 3.91x vs Referral 0.40x)'],
      doNext: ['Set a max CPA ceiling by channel based on LTV:CAC ratios', 'Build an automated alert when MER drops below 3.0x'],
      stopDoing: ['Don\'t optimize purely on blended MER, it hides channel-level inefficiencies'],
    },
    upper: {
      working: ['Post-purchase survey captures 1,240 responses/month, statistically significant sample', 'TikTok shows 22% survey attribution, validating its top-of-funnel role beyond click tracking'],
      notWorking: ['No MMM model built yet, relying solely on survey data for channel allocation', 'No geo-lift tests run to validate incrementality of any channel'],
      doNext: ['Commission an MMM study, even a simple one using 6 months of data', 'Run a geo-lift test on TikTok to prove incremental value vs. organic discovery'],
      stopDoing: ['Stop treating survey data as ground truth for budget decisions without cross-validation'],
    },
    lower: {
      working: [`Brand Search at ${formatCurrencyValue(420)} CPA and 4.76x ROAS, the most efficient channel by far`, `Hair Before/After creative achieves ${formatCurrencyValue(577)} CPA, well below target`],
      notWorking: [`Competitor Keywords at ${formatCurrencyValue(880)} CPA is 12% above target and losing money`, 'Platform reporting overlap inflates total attributed conversions by ~30%'],
      doNext: ['Deduplicate conversions across platforms before making budget decisions', 'Test moving top Meta creatives to TikTok format for potentially lower CPCs'],
      stopDoing: ['Stop trusting individual platform ROAS numbers at face value, always cross-reference with MER'],
    },
    trunk: {
      working: ['Meta Pixel + CAPI dual setup achieving 89-92% match rates', ga4Data ? `GA4 processing ${Math.round(getGA4Metric(ga4Data, 'eventCount') / Math.max(1, Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)))).toLocaleString()} events/day with stable tracking` : 'GA4 processing 22,400 events/day with stable tracking'],
      notWorking: ['Server-side GTM is completely down (0 events/day), losing ~15% of conversion data', 'TikTok Pixel match rate at 71%, significant data loss'],
      doNext: ['Fix Server-side GTM immediately, this is the #1 priority before any budget decisions', 'Improve TikTok tracking with enhanced match keys (email, phone hashing)'],
      stopDoing: ['Stop making budget allocation decisions while server-side GTM is broken'],
    },
    roots: {
      working: ['Google Brand customers have 3.8x LTV:CAC, excellent unit economics', `GLP-1 product has highest LTV (${formatCurrencyValue(9200)} at 365d) driving overall retention`],
      notWorking: ['TikTok LTV:CAC at 1.4x is below the 2.0x minimum threshold', 'TikTok payback period of 6.8 months creates cash flow pressure'],
      doNext: [`Cap TikTok CPA at ${formatCurrencyValue(600)} until LTV:CAC improves above 2.0x`, 'Segment TikTok cohorts by product to see if specific products have better TikTok LTV'],
      stopDoing: ['Stop scaling TikTok spend without addressing the LTV:CAC gap first'],
    },
  });

  // Dynamic global insights with currency conversion
  const getGlobalInsights = () => [
    '🔑 Overall, your attribution stack is functioning but incomplete. MER is healthy (3.67x), but you\'re flying partially blind with server-side GTM down and no MMM model.',
    '📊 Meta drives the lion\'s share of tracked conversions but survey data suggests TikTok is under-credited by platform reporting. Run a geo-lift test to validate.',
    '⚠️ Your nMER of 1.92x means you\'re relying heavily on repeat purchases to make the economics work. This is fine if retention holds, but risky if cohort quality drops.',
    `💰 Brand Search is your most efficient channel at ${formatCurrencyValue(420)} CPA. Ensure you\'re maxing out impression share before increasing spend elsewhere.`,
    '🛠️ Fix server-side GTM before making any major budget reallocation. You\'re missing ~15% of conversion data, which skews all analysis.',
    '📈 Consider building a simple MMM model using the past 6 months of spend + revenue data. This will give you a second opinion on channel allocation beyond surveys.',
    `🎯 Set channel-specific CPA ceilings: Meta ${formatCurrencyValue(850)}, Google ${formatCurrencyValue(500)}, TikTok ${formatCurrencyValue(600)}. Review weekly and pause anything consistently above ceiling.`,
  ];

  const activeInfo = treeLayers.find(l => l.id === activeLayer)!;
  const insights = getLayerInsights()[activeLayer];



  if (twLoading || ga4Loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h2 className="text-lg sm:text-xl font-semibold">Attribution Framework</h2>
        <p className="text-sm text-text-secondary">Fetching live data...</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard />
        </div>
        <SkeletonChart />
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-lg sm:text-xl font-semibold">Attribution Framework</h2>

      {/* Horizontal Tab Buttons */}
      <div className="flex gap-1.5 sm:gap-2 flex-wrap px-1">
        {treeLayers.map((layer) => {
          const isActive = activeLayer === layer.id;
          const Icon = layer.icon;
          return (
            <button
              key={layer.id}
              onClick={() => {
                if (layer.id === 'lower') {
                  // Redirect to Creative & MTA Control Panel
                  window.location.href = '/creative';
                } else {
                  setActiveLayer(layer.id);
                }
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-medium transition-all border min-w-0 ${
                isActive
                  ? 'border-transparent shadow-md'
                  : 'border-border bg-bg-surface text-text-secondary hover:text-text-primary hover:border-text-tertiary'
              }`}
              style={isActive ? { backgroundColor: `${layer.color}20`, color: layer.color, borderBottom: `2px solid ${layer.color}` } : undefined}
            >
              <Icon size={14} className="shrink-0" style={{ color: isActive ? layer.color : undefined }} />
              <span className="truncate">{layer.label}</span>
            </button>
          );
        })}
      </div>

      {/* Layer Description */}
      <div className="text-sm text-text-secondary px-1">{activeInfo.description}</div>

      {/* Layer Detail Section - Moved ABOVE AI Intelligence */}
      {activeLayer === 'star' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1" data-testid="mer-overview">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Star size={16} className="text-warm-gold shrink-0" />
              <span>MER / nCAC Overview</span>
            </h3>
            <div className="flex items-center gap-2 shrink-0"><DataSource source="TripleWhale" /><LiveBadge /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-bg-elevated rounded-md p-4 min-h-[100px] flex flex-col justify-between">
              <div className="text-xs text-text-secondary flex items-center gap-1">
                <span>MER</span>
                <InfoTooltip metric="MER" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary mt-2">{twData ? (() => { const rev = getMetric(twData, 'orderRevenue'); const spend = getMetric(twData, 'metaAdSpend') + getMetric(twData, 'googleAdSpend') + getMetric(twData, 'tiktokAdSpend') + getMetric(twData, 'redditAdSpend'); return spend > 0 ? `${(rev / spend).toFixed(2)}x` : '—'; })() : '3.67x'}</div>
              <div className="text-xs text-success mt-2">{twData ? (() => { const rev = getMetric(twData, 'orderRevenue'); const spend = getMetric(twData, 'metaAdSpend') + getMetric(twData, 'googleAdSpend') + getMetric(twData, 'tiktokAdSpend') + getMetric(twData, 'redditAdSpend'); const prevRev = getPrevMetric(twData, 'orderRevenue'); const prevSpend = getPrevMetric(twData, 'metaAdSpend') + getPrevMetric(twData, 'googleAdSpend') + getPrevMetric(twData, 'tiktokAdSpend') + getPrevMetric(twData, 'redditAdSpend'); if (spend > 0 && prevSpend > 0) { const curr = rev / spend; const prev = prevRev / prevSpend; const chg = ((curr - prev) / prev) * 100; return `${chg >= 0 ? '↑' : '↓'} ${Math.abs(chg).toFixed(1)}% vs prev`; } return ''; })() : '↑ 3.1% MoM'}</div>
            </div>
            <div className="bg-bg-elevated rounded-md p-4 min-h-[100px] flex flex-col justify-between">
              <div className="text-xs text-text-secondary flex items-center gap-1">
                <span>nCAC</span>
                <InfoTooltip metric="nCAC" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary mt-2">{formatCurrencyValue(twData ? getMetric(twData, 'ncpa') : 787)}</div>
              <div className="text-xs text-success mt-2">↓ 2.6% MoM</div>
            </div>
            <div className="bg-bg-elevated rounded-md p-4 min-h-[100px] flex flex-col justify-between">
              <div className="text-xs text-text-secondary">Marketing Costs</div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary mt-2">{formatCurrencyValue(twData ? (getMetric(twData, 'metaAdSpend') + getMetric(twData, 'googleAdSpend') + getMetric(twData, 'tiktokAdSpend') + getMetric(twData, 'redditAdSpend')) : 680000)}</div>
              <div className="text-xs text-text-secondary mt-2">At 25% CM3 target</div>
            </div>
            <div className="bg-bg-elevated rounded-md p-4 min-h-[100px] flex flex-col justify-between">
              <div className="text-xs text-text-secondary">Blended CPA</div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary mt-2">{formatCurrencyValue(twData ? getMetric(twData, 'blendedCpa') : 750)}</div>
            </div>
            <div className="bg-bg-elevated rounded-md p-4 min-h-[100px] flex flex-col justify-between">
              <div className="text-xs text-text-secondary flex items-center gap-1">
                <span>Blended ROAS</span>
                <InfoTooltip metric="ROAS" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary mt-2">{twData ? `${(getMetric(twData, 'twRoas') || getMetric(twData, 'topRoas')).toFixed(2)}x` : '3.58x'}</div>
            </div>
            <div className="bg-bg-elevated rounded-md p-4 min-h-[100px] flex flex-col justify-between">
              <div className="text-xs text-text-secondary flex items-center gap-1">
                <span>aMER</span>
                <InfoTooltip metric="aMER" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary mt-2">{twData ? `${getMetric(twData, 'blendedAttributedRoas').toFixed(2)}x` : '4.12x'}</div>
              <div className="text-xs text-success mt-2">↑ 1.8% MoM</div>
            </div>
          </div>
        </div>
      )}

      {/* AI Intelligence Section for MER/nCAC */}
      {activeLayer === 'star' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-warm-gold shrink-0" />
              <span className="truncate">{activeInfo.label} AI Intelligence</span>
            </h3>
            <AIIntelligenceControls 
              intelligenceId="mer-ncac-intelligence"
              title={`${activeInfo.label} AI Intelligence`}
              onToggleVisibility={(v) => { const s = new Set(hiddenIntel); v ? s.delete('mer-ncac') : s.add('mer-ncac'); setHiddenIntel(s); }}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-success flex items-center gap-1.5">✅ What's Working</div>
              {insights.working.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-danger flex items-center gap-1.5">⚠️ What's Not</div>
              {insights.notWorking.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-brand-blue-light flex items-center gap-1.5">🎯 Do Next</div>
              {insights.doNext.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-warm-gold flex items-center gap-1.5">🛑 Stop Doing</div>
              {insights.stopDoing.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeLayer === 'upper' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1" data-testid="attribution-chart">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <GitBranch size={16} className="text-brand-blue-light shrink-0" />
              <span className="truncate">Channel Allocation, Survey Results</span>
            </h3>
            <div className="flex items-center gap-2 shrink-0"><DataSource source="N/A" /><LiveBadge variant="sample" /></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="min-h-[280px]" onClickCapture={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto' }}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart onMouseDown={(e: any) => e?.stopPropagation?.()}>
                  <Pie data={attributionSurvey} cx="50%" cy="50%" outerRadius={100} dataKey="pct" label={({ name, value }) => `${name}: ${value}%`}>
                    {attributionSurvey.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">"How did you first hear about AndYou?", Post-purchase survey results (last 30 days, n=1,240)</p>
              {attributionSurvey.map((s, i) => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORS[i] }} />
                  <span className="text-sm text-text-primary flex-1 min-w-0 truncate">{s.source}</span>
                  <div className="w-20 sm:w-32 bg-bg-elevated rounded-full h-2 shrink-0">
                    <div className="h-2 rounded-full" style={{ width: `${s.pct}%`, background: COLORS[i] }} />
                  </div>
                  <span className="text-sm text-text-secondary w-8 sm:w-10 text-right shrink-0">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Intelligence Section for Surveys & MMM */}
      {activeLayer === 'upper' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-warm-gold shrink-0" />
              <span className="truncate">{activeInfo.label} AI Intelligence</span>
            </h3>
            <AIIntelligenceControls 
              intelligenceId="surveys-mmm-intelligence"
              title={`${activeInfo.label} AI Intelligence`}
              onToggleVisibility={(v) => { const s = new Set(hiddenIntel); v ? s.delete('surveys-mmm') : s.add('surveys-mmm'); setHiddenIntel(s); }}
            />
          </div>
          {!hiddenIntel.has('surveys-mmm') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-success flex items-center gap-1.5">✅ What's Working</div>
              {insights.working.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-danger flex items-center gap-1.5">⚠️ What's Not</div>
              {insights.notWorking.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-brand-blue-light flex items-center gap-1.5">🎯 Do Next</div>
              {insights.doNext.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-warm-gold flex items-center gap-1.5">🛑 Stop Doing</div>
              {insights.stopDoing.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
          </div>
          )}
        </div>
      )}

      {activeLayer === 'lower' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Activity size={16} className="text-brand-blue shrink-0" />
              <span className="truncate">Account Control Chart, CPA vs Spend</span>
            </h3>
            <div className="flex items-center gap-2 shrink-0"><DataSource source="N/A" /><LiveBadge variant="sample" /></div>
          </div>
          <div className="min-h-[320px]">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="spend" name="Spend" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${currency}${(convertValue(v)/1000).toFixed(0)}K`} />
                <YAxis dataKey="cpa" name="CPA" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${currency}${convertValue(v)}`} />
                <ZAxis dataKey="spend" range={[60, 400]} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [name === 'Spend' ? `${currency}${(convertValue(Number(value))/1000).toFixed(1)}K` : `${currency}${convertValue(value)}`, name || '']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                />
                <Scatter data={adScatterData.filter(d => d.platform === 'Meta')} fill="#4A6BD6" name="Meta" />
                <Scatter data={adScatterData.filter(d => d.platform === 'Google')} fill="#EDBF63" name="Google" />
                <Scatter data={adScatterData.filter(d => d.platform === 'TikTok')} fill="#34D399" name="TikTok" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* AI Intelligence Section for MTA & Platform */}
      {activeLayer === 'lower' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-warm-gold shrink-0" />
              <span className="truncate">{activeInfo.label} AI Intelligence</span>
            </h3>
            <AIIntelligenceControls 
              intelligenceId="mta-platform-intelligence"
              title={`${activeInfo.label} AI Intelligence`}
              onToggleVisibility={(v) => { const s = new Set(hiddenIntel); v ? s.delete('mta-platform') : s.add('mta-platform'); setHiddenIntel(s); }}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-success flex items-center gap-1.5">✅ What's Working</div>
              {insights.working.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-danger flex items-center gap-1.5">⚠️ What's Not</div>
              {insights.notWorking.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-brand-blue-light flex items-center gap-1.5">🎯 Do Next</div>
              {insights.doNext.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-warm-gold flex items-center gap-1.5">🛑 Stop Doing</div>
              {insights.stopDoing.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeLayer === 'trunk' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1" data-testid="tracking-health">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Database size={16} className="text-success shrink-0" />
              <span className="truncate">Tracking Infrastructure Health</span>
            </h3>
            <span className="text-xs text-text-tertiary shrink-0">System Status</span>
          </div>
          <div className="space-y-3">
            {trackingHealth.map((item) => (
              <div key={item.system}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-bg-elevated rounded-md p-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.status === 'healthy' ? 'bg-success' : item.status === 'warning' ? 'bg-warm-gold' : 'bg-danger'}`} />
                    <span className="text-sm font-medium text-text-primary truncate">{item.system}</span>
                    {item.system === 'Google Ads Tag' && trackingIsLive && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-success/20 text-success animate-pulse">
                        LIVE
                      </span>
                    )}
                    {item.system === 'GA4' && ga4Data?.summary && (
                      <LiveBadge />
                    )}
                    <InfoTooltip metric={item.system} />
                    <button
                      onClick={() => toggleSystemExpansion(item.system)}
                      className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      {expandedSystems.has(item.system) ? '▼' : '▶'} Events
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-text-secondary">
                    <span>Events: {item.events}</span>
                    {!(item.system === 'Google Ads Tag' && trackingIsLive) && !(item.system === 'GA4' && ga4Data?.summary) && <span>Match Quality: {item.matchRate}</span>}
                    {/* Source badge removed — redundant with event-level detail */}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium self-start sm:self-auto ${
                      item.status === 'healthy' ? 'bg-success/15 text-success' :
                      item.status === 'warning' ? 'bg-warm-gold/15 text-warm-gold' :
                      'bg-danger/15 text-danger'
                    }`}>
                      {item.status === 'healthy' ? 'Healthy' : item.status === 'warning' ? 'Warning' : 'Error'}
                    </span>
                  </div>
                </div>
                
                {/* Event Breakdown */}
                {expandedSystems.has(item.system) && item.eventBreakdown && (() => {
                  const EVENTS_PER_PAGE = 10;
                  const allEvents = item.eventBreakdown;
                  const totalEvents = allEvents.length;
                  const currentPage = eventPages[item.system] || 1;
                  const totalPages = Math.ceil(totalEvents / EVENTS_PER_PAGE);
                  const startIdx = (currentPage - 1) * EVENTS_PER_PAGE;
                  const visibleEvents = allEvents.slice(startIdx, startIdx + EVENTS_PER_PAGE);
                  return (
                  <div className="mt-2 ml-6 bg-bg-surface border border-border rounded-md p-3 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-text-primary">Event Breakdown ({totalEvents} events):</div>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            onClick={() => setEventPages(p => ({ ...p, [item.system]: Math.max(1, currentPage - 1) }))}
                            disabled={currentPage === 1}
                            className="px-2 py-0.5 rounded bg-bg-elevated border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            ←
                          </button>
                          <span className="text-text-secondary">{currentPage}/{totalPages}</span>
                          <button
                            onClick={() => setEventPages(p => ({ ...p, [item.system]: Math.min(totalPages, currentPage + 1) }))}
                            disabled={currentPage === totalPages}
                            className="px-2 py-0.5 rounded bg-bg-elevated border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            →
                          </button>
                        </div>
                      )}
                    </div>
                    {visibleEvents.map((event) => (
                      <div key={event.event} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            event.matchRate === 'N/A' ? 'bg-text-tertiary' :
                            event.matchRate.includes('/10') && parseFloat(event.matchRate.split('/')[0]) >= 9.0 ? 'bg-success' :
                            event.matchRate.includes('/10') && parseFloat(event.matchRate.split('/')[0]) >= 8.0 ? 'bg-warm-gold' :
                            event.matchRate.includes('/10') ? 'bg-danger' : 'bg-text-tertiary'
                          }`} />
                          <span className="text-sm font-medium text-text-primary">{event.event}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-text-secondary">
                          <span>Count: {event.count}/day</span>
                          {!(item.system === 'Google Ads Tag' && trackingIsLive) && !(item.system === 'GA4' && ga4Data?.summary) && event.matchRate && event.matchRate !== 'N/A' && <span>Match Quality: {event.matchRate}</span>}
                        </div>
                      </div>
                    ))}
                    {/* Special TikTok cAPI section */}
                    {item.system === 'TikTok Pixel' && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="text-xs font-medium text-text-primary mb-2">Additional Options:</div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
                            <span className="text-sm font-medium text-text-primary">TikTok cAPI</span>
                            <InfoTooltip metric="TikTok cAPI" />
                          </div>
                          <div className="flex items-center gap-4 text-xs text-text-secondary">
                            <span>Events: 0/day</span>
                            <span>Match Quality: N/A</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-danger/15 text-danger">
                              Not Connected
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Intelligence Section for Tracking Infrastructure */}
      {activeLayer === 'trunk' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-warm-gold shrink-0" />
              <span className="truncate">{activeInfo.label} AI Intelligence</span>
            </h3>
            <AIIntelligenceControls 
              intelligenceId="tracking-infra-intelligence"
              title={`${activeInfo.label} AI Intelligence`}
              onToggleVisibility={(v) => { const s = new Set(hiddenIntel); v ? s.delete('tracking-infra') : s.add('tracking-infra'); setHiddenIntel(s); }}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-success flex items-center gap-1.5">✅ What's Working</div>
              {insights.working.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-danger flex items-center gap-1.5">⚠️ What's Not</div>
              {insights.notWorking.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-brand-blue-light flex items-center gap-1.5">🎯 Do Next</div>
              {insights.doNext.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-warm-gold flex items-center gap-1.5">🛑 Stop Doing</div>
              {insights.stopDoing.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeLayer === 'roots' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <Layers size={16} className="text-purple-400 shrink-0" />
                <span className="truncate">Cohort-based LTV by Channel</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary font-medium">Model:</span>
                <div className="relative">
                  <select 
                    value={cohortAttrModel} 
                    onChange={(e) => setCohortAttrModel(e.target.value)} 
                    className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors"
                  >
                    {cohortAttributionModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary font-medium">Window:</span>
                <div className="relative">
                  <select 
                    value={cohortAttrWindow} 
                    onChange={(e) => setCohortAttrWindow(e.target.value)} 
                    className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors"
                  >
                    {cohortAttributionWindows.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              // Model adjustments: different attribution models shift credit between channels
              const modelMult: Record<string, Record<string, { ltvMult: number; cacMult: number }>> = {
                'First Click': { Meta: { ltvMult: 1.0, cacMult: 1.0 }, Google: { ltvMult: 1.0, cacMult: 1.0 }, TikTok: { ltvMult: 1.0, cacMult: 1.0 }, Reddit: { ltvMult: 1.0, cacMult: 1.0 } },
                'Last Click': { Meta: { ltvMult: 1.05, cacMult: 0.92 }, Google: { ltvMult: 1.12, cacMult: 0.85 }, TikTok: { ltvMult: 0.88, cacMult: 1.15 }, Reddit: { ltvMult: 0.85, cacMult: 1.2 } },
                'Linear All': { Meta: { ltvMult: 1.02, cacMult: 0.96 }, Google: { ltvMult: 1.06, cacMult: 0.93 }, TikTok: { ltvMult: 0.95, cacMult: 1.05 }, Reddit: { ltvMult: 0.92, cacMult: 1.1 } },
                'Linear Paid': { Meta: { ltvMult: 1.08, cacMult: 0.94 }, Google: { ltvMult: 0.95, cacMult: 1.08 }, TikTok: { ltvMult: 1.1, cacMult: 0.98 }, Reddit: { ltvMult: 0.9, cacMult: 1.12 } },
              };
              // Window adjustments: longer windows generally give more credit to upper-funnel channels
              const windowMult: Record<string, number> = {
                '1-day click': 0.85,
                '7-day click / 1-day view': 1.0,
                '28-day click / 1-day view': 1.08,
                '28-day click / 28-day view': 1.15,
              };
              const base = [
                { channel: 'Meta', ltv: 6580, cac: 3133, payback: 4.2 },
                { channel: 'Google', ltv: 7220, cac: 1900, payback: 2.1 },
                { channel: 'TikTok', ltv: 4200, cac: 3000, payback: 6.8 },
                { channel: 'Reddit', ltv: 3500, cac: 3182, payback: 8.2 },
              ];
              const mm = modelMult[cohortAttrModel] || modelMult['First Click'];
              const wm = windowMult[cohortAttrWindow] || 1.0;
              return base.map(ch => {
                const m = mm[ch.channel] || { ltvMult: 1, cacMult: 1 };
                const ltv = Math.round(ch.ltv * m.ltvMult * wm);
                const cac = Math.round(ch.cac * m.cacMult / wm);
                const ltvCac = parseFloat((ltv / cac).toFixed(1));
                const payback = parseFloat((ch.payback * m.cacMult / (m.ltvMult * wm)).toFixed(1));
                return { channel: ch.channel, ltvCac, ltv, cac, payback: `${payback} months` };
              });
            })().map((ch) => (
              <div key={ch.channel} className="bg-bg-elevated rounded-md p-4 space-y-3">
                <div className="text-sm font-medium text-text-primary">{ch.channel}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">LTV:CAC</span>
                  <span className={`text-xl font-bold ${ch.ltvCac >= 3 ? 'text-success' : ch.ltvCac >= 2 ? 'text-warm-gold' : 'text-danger'}`}>
                    {ch.ltvCac}x
                  </span>
                </div>
                <div className="text-xs text-text-secondary">LTV: {formatCurrencyValue(ch.ltv)} • CAC: {formatCurrencyValue(ch.cac)}</div>
                <div className="text-xs text-text-secondary">Payback: {ch.payback}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Intelligence Section for Cohort LTV */}
      {activeLayer === 'roots' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-warm-gold shrink-0" />
              <span className="truncate">{activeInfo.label} AI Intelligence</span>
            </h3>
            <AIIntelligenceControls 
              intelligenceId="cohort-ltv-intelligence"
              title={`${activeInfo.label} AI Intelligence`}
              onToggleVisibility={(v) => { const s = new Set(hiddenIntel); v ? s.delete('cohort-ltv') : s.add('cohort-ltv'); setHiddenIntel(s); }}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-success flex items-center gap-1.5">✅ What's Working</div>
              {insights.working.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-danger flex items-center gap-1.5">⚠️ What's Not</div>
              {insights.notWorking.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-brand-blue-light flex items-center gap-1.5">🎯 Do Next</div>
              {insights.doNext.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-warm-gold flex items-center gap-1.5">🛑 Stop Doing</div>
              {insights.stopDoing.map((item, i) => (
                <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
