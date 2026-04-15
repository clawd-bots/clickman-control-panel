'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { LiveBadge } from '@/components/ui/LiveBadge';
import DataSource from '@/components/ui/DataSource';
import { SkeletonMetricCard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { useDateRange } from '@/components/DateProvider';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { fetchTripleWhaleData, getMetric, TWData, fetchTWAds, TWAd } from '@/lib/triple-whale-client';
import { fetchTikTokOverview, classifyAdZone, TikTokOverview } from '@/lib/tiktok-client';
import { fetchMetaOverview, classifyMetaAdZone, MetaOverview } from '@/lib/meta-client';
import {
  creativePerformance, creativeAISuggestions,
  accountControlData, adChurnDataByPlatform, adChurnCampaigns, creativeChurnCohorts,
  productionSlugging, demographicsAge, demographicsGender, demographicsGenderAge, creativeChurnCohortsByPlatform,
} from '@/lib/sample-data';
import { useTargets } from '@/lib/useTargets';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/components/CurrencyProvider';
import { filterByDateRange, formatDateLabel, toLocalDateString, getAccountControlReportRange } from '@/lib/dateUtils';
import { ChevronDown } from 'lucide-react';
import AdThumbnail from '@/components/ui/AdThumbnail';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ReferenceLine, ZAxis, Legend,
  AreaChart, Area, LineChart, Line, ComposedChart,
} from 'recharts';

const tabs = [/* 'Performance', */ 'Ad Churn', 'Account Control', 'Slugging Rate', 'Pareto', 'Demographics'];
const platforms = ['Meta', 'TikTok', 'Reddit'];
const platformsWithGoogle = ['Meta', 'TikTok', 'Reddit', 'Google'];
/** Slugging Rate tab only — no Google (creative-focused platforms). */
const sluggingTabPlatforms = ['All', 'Meta', 'TikTok'];

const tabDescriptions: Record<string, string> = {
  'Performance': 'Overview of all active ad creatives with spend, engagement, and conversion metrics. Use this to monitor your live ads and spot issues quickly.',
  'Ad Churn': 'Shows how ad spend is distributed across creative age brackets and launch cohorts. Dark = newest ads/cohorts, lighter = older. A healthy account has a steady flow of new creative taking over spend from older creative.',
  'Account Control': 'Scatter plot of CPA vs Spend per ad. Bottom-right = winners scaling efficiently. Top-right = "zombies" burning budget. The horizontal line is your CPA target. The vertical line separates testing from scaled ads.',
  'Slugging Rate': 'Production & Slugging Rate, tracks your "at bats" vs "hits." Bars show ads launched per month. Dark sections show how many actually scaled. If you launch many ads and none scale, you have a creative strategy problem, not a media buying problem.',

  'Pareto': 'The 80/20 principle applied to ad creatives. Usually 20% of creatives drive 80% of results. Use this to identify your winners and stop spreading budget too thin.',
  'Demographics': 'Are you producing for the audience that is actually buying? If women 25-34 drive your profit but you keep producing TikTok-style ads for Gen Z, you\'re burning cash. Align your production queue with your paying demographic.',
};

const attributionModels = ['First Click', 'Last Click', 'Linear Paid', 'Triple Attribution'];
const attributionWindows = ['1 day', '7 days', '14 days', '28 days', 'Lifetime'];

// Zone colors for account control scatter
const zoneColors: Record<string, string> = { scaling: '#10B981', zombie: '#EF4444', testing: '#4A6BD6', untapped: '#EDBF63' };
const zoneLabels: Record<string, string> = { scaling: 'Scale (Winners)', zombie: 'Zombies (Kill)', testing: 'Testing', untapped: 'Untapped/Learning' };

// Churn age colors (dark → light for new → old)
const churnAgeColors = ['#1e3a5f', '#2563EB', '#4A6BD6', '#6B8DE8', '#93B4F5', '#C5D8FB'];
const churnAgeKeys = ['Last 7 Days', '8-14 Days', '15-30 Days', '31-90 Days', '91-180 Days', '180+ Days'];

// Cohort colors (light = old → dark = new)
const cohortColors = { oct: '#C5D8FB', nov: '#93B4F5', dec: '#6B8DE8', jan: '#4A6BD6', feb: '#2563EB', mar: '#1e3a5f' };
const cohortKeys = ['oct', 'nov', 'dec', 'jan', 'feb', 'mar'] as const;
const cohortLabels: Record<string, string> = { oct: 'Oct Creatives', nov: 'Nov Creatives', dec: 'Dec Creatives', jan: 'Jan Creatives', feb: 'Feb Creatives', mar: 'Mar Creatives' };

// Function to get tab-specific AI analysis title
function getAITitle(tab: string): string {
  const aiTitles: Record<string, string> = {
    'Performance': 'Creative Performance Intelligence',
    'Ad Churn': 'Ad Churn & Lifecycle Analysis',
    'Account Control': 'Account Control & Zone Analysis',
    'Slugging Rate': 'Creative Production & Hit Rate Analysis',
    'Pareto': 'Pareto Analysis Intelligence',
    'Demographics': 'Demographics vs Creative Alignment',
  };
  return aiTitles[tab] || 'Creative Intelligence';
}

function getAIPromptId(tab: string): string {
  const promptIds: Record<string, string> = {
    'Performance': 'creative-performance',
    'Ad Churn': 'creative-ad-churn',
    'Account Control': 'creative-account-control',
    'Slugging Rate': 'creative-slugging-rate',
    'Pareto': 'creative-pareto',
    'Demographics': 'creative-demographics',
  };
  return promptIds[tab] || 'creative-performance';
}

export default function CreativePage() {
  const { currency, convertValue } = useCurrency();
  const { dateRange } = useDateRange();
  const { getTarget, targets } = useTargets();
  const [activeTab, setActiveTab] = useState('Ad Churn');
  const [twData, setTwData] = useState<TWData | null>(null);
  const [twLoading, setTwLoading] = useState(true);
  const [ttData, setTtData] = useState<TikTokOverview | null>(null);
  const [ttLoading, setTtLoading] = useState(true);
  const [metaData, setMetaData] = useState<MetaOverview | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [twAds, setTwAds] = useState<TWAd[]>([]);
  const [twAdsLoading, setTwAdsLoading] = useState(true);

  useEffect(() => {
    setTwLoading(true);
    setTtLoading(true);
    setMetaLoading(true);
    const startDate = toLocalDateString(dateRange.startDate);
    const endDate = toLocalDateString(dateRange.endDate);
    fetchTripleWhaleData(startDate, endDate, 'summary')
      .then(setTwData)
      .catch(console.error)
      .finally(() => setTwLoading(false));
    fetchTikTokOverview(startDate, endDate)
      .then(setTtData)
      .catch(console.error)
      .finally(() => setTtLoading(false));
    fetchMetaOverview(startDate, endDate)
      .then(setMetaData)
      .catch(console.error)
      .finally(() => setMetaLoading(false));
  }, [dateRange]);

  // Platform-level metrics from TW
  const twPlatformMetrics = useMemo(() => {
    if (!twData) return null;
    return {
      Meta: {
        spend: getMetric(twData, 'metaAdSpend'),
        roas: getMetric(twData, 'metaRoas'),
        cpa: getMetric(twData, 'metaCpa'),
        impressions: getMetric(twData, 'metaImpressions'),
        clicks: getMetric(twData, 'metaClicks'),
        ctr: getMetric(twData, 'metaCtr'),
        cpm: getMetric(twData, 'metaCpm'),
        cpc: getMetric(twData, 'metaCpc'),
        purchases: getMetric(twData, 'metaPurchases'),
        conversionValue: getMetric(twData, 'metaConversionValue'),
      },
      Google: {
        spend: getMetric(twData, 'googleAdSpend'),
        roas: getMetric(twData, 'googleRoas'),
        cpa: getMetric(twData, 'googleCpa'),
        impressions: getMetric(twData, 'googleImpressions'),
        clicks: getMetric(twData, 'googleClicks'),
        ctr: getMetric(twData, 'googleCtr'),
        cpm: getMetric(twData, 'googleCpm'),
        cpc: getMetric(twData, 'googleCpc'),
        purchases: 0,
        conversionValue: getMetric(twData, 'googleConversionValue'),
      },
      TikTok: {
        spend: getMetric(twData, 'tiktokAdSpend'),
        roas: getMetric(twData, 'tiktokRoas'),
        cpa: getMetric(twData, 'tiktokCpa'),
        impressions: getMetric(twData, 'tiktokImpressions'),
        clicks: 0,
        ctr: getMetric(twData, 'tiktokCtr'),
        cpm: getMetric(twData, 'tiktokCpm'),
        cpc: getMetric(twData, 'tiktokCpc'),
        purchases: getMetric(twData, 'tiktokPurchases'),
        conversionValue: getMetric(twData, 'tiktokConversionValue'),
      },
      Reddit: {
        spend: getMetric(twData, 'redditAdSpend'),
        roas: getMetric(twData, 'redditRoas'),
        cpa: getMetric(twData, 'redditCpa'),
        impressions: getMetric(twData, 'redditImpressions'),
        clicks: getMetric(twData, 'redditClicks'),
        ctr: getMetric(twData, 'redditCtr'),
        cpm: getMetric(twData, 'redditCpm'),
        cpc: getMetric(twData, 'redditCpc'),
        purchases: getMetric(twData, 'redditConversions'),
        conversionValue: getMetric(twData, 'redditConversionValue'),
      },
    };
  }, [twData]);
  const [platform, setPlatform] = useState('Meta');
  const [attrModel, setAttrModel] = useState('Triple Attribution');
  /** Lookback + SQL attribution_window (same label as Triple Whale). */
  const [attrWindow, setAttrWindow] = useState('7 days');

  /** Account Control only: report range from Window (not the global top-bar date picker). */
  const accountControlReportRange = useMemo(
    () => getAccountControlReportRange(attrWindow),
    [attrWindow]
  );
  const twAdsStart = toLocalDateString(accountControlReportRange.startDate);
  const twAdsEnd = toLocalDateString(accountControlReportRange.endDate);

  useEffect(() => {
    if (activeTab !== 'Account Control') {
      setTwAdsLoading(false);
      setTwAds([]);
      return;
    }
    let cancelled = false;
    setTwAds([]);
    setTwAdsLoading(true);
    fetchTWAds(twAdsStart, twAdsEnd, attrModel, attrWindow)
      .then((data) => {
        if (!cancelled) setTwAds(data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setTwAdsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, attrModel, attrWindow, twAdsStart, twAdsEnd]);
  const [accountControlFilter, setAccountControlFilter] = useState('all');
  const [accountControlCampaign, setAccountControlCampaign] = useState('all');
  const [acPageSize, setAcPageSize] = useState(10);
  const [acCurrentPage, setAcCurrentPage] = useState(1);
  const [acSortKey, setAcSortKey] = useState<string>('spend');
  const [acSortDir, setAcSortDir] = useState<'asc' | 'desc'>('desc');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [genderFilter, setGenderFilter] = useState('all');
  /** Spend-by-age chart: single gender at a time (default male). */
  const [demoSpendGender, setDemoSpendGender] = useState<'male' | 'female'>('male');
  const [churnCpaMode, setChurnCpaMode] = useState<'cpa' | 'nccpa'>('cpa');
  const [churnPlatform, setChurnPlatform] = useState('Meta');
  const [sluggingPlatform, setSluggingPlatform] = useState('All');
  const [sluggingMonths, setSluggingMonths] = useState<number>(6);
  const [sluggingCpaMode, setSluggingCpaMode] = useState<'cpa' | 'nccpa'>('cpa');
  const [churnCampaignFilter, setChurnCampaignFilter] = useState('all');

  useEffect(() => {
    if (activeTab === 'Slugging Rate' && sluggingPlatform === 'Google') {
      setSluggingPlatform('All');
    }
  }, [activeTab, sluggingPlatform]);

  // ─── Ad Churn derived data ───
  const churnPlatformData = useMemo(() => {
    const raw = adChurnDataByPlatform[churnPlatform] || adChurnDataByPlatform.Meta;
    // For monthly data, expand the filter range to include any month that overlaps with the selected range
    const filterStart = new Date(dateRange.startDate);
    filterStart.setDate(1); // Start of the month containing startDate
    const filterEnd = new Date(dateRange.endDate);
    filterEnd.setMonth(filterEnd.getMonth() + 1, 0); // End of the month containing endDate
    const filtered = filterByDateRange(raw, 'month', filterStart, filterEnd);
    const data = filtered.length > 0 ? filtered : raw;
    return data.map(d => ({ ...d, displayMonth: formatDateLabel(d.month, 'month') }));
  }, [churnPlatform, dateRange]);
  // Cohort data filtered by global date range and platform
  const filteredCohortData = useMemo(() => {
    const raw = creativeChurnCohortsByPlatform[churnPlatform] || creativeChurnCohorts;
    // For weekly data, expand to include the full months that overlap with selected range
    const filterStart = new Date(dateRange.startDate);
    filterStart.setDate(1); // Start of month
    const filterEnd = new Date(dateRange.endDate);
    filterEnd.setMonth(filterEnd.getMonth() + 1, 0); // End of month
    const filtered = filterByDateRange(raw, 'date' as keyof typeof raw[0], filterStart, filterEnd);
    return filtered.length > 0 ? filtered : raw;
  }, [churnPlatform, dateRange]);

  const churnCampaignsForPlatform = useMemo(() => {
    const campaigns = adChurnCampaigns[churnPlatform] || [];
    return campaigns.filter(c => c.status === 'Active');
  }, [churnPlatform]);
  const churnFilteredCampaigns = useMemo(() => {
    if (churnCampaignFilter === 'all') return churnCampaignsForPlatform;
    return churnCampaignsForPlatform.filter(c => c.campaign === churnCampaignFilter);
  }, [churnCampaignsForPlatform, churnCampaignFilter]);

  // CPA from Targets page; NC CPA is always 2× CPA (same for Account Control + Slugging)
  const { targetCPA, targetNCCPA } = useMemo(() => {
    const cpa = getTarget('CPA') ?? 500;
    return { targetCPA: cpa, targetNCCPA: cpa * 2 };
  }, [getTarget, targets, dateRange.startDate, dateRange.endDate]);
  const churnCpaTarget = churnCpaMode === 'cpa' ? targetCPA : targetNCCPA;

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number | null | undefined) => {
    const v = value == null || !Number.isFinite(Number(value)) ? 0 : Number(value);
    return formatCurrency(convertValue(v), currency);
  };

  // Memoized AI suggestions with currency conversion - tab specific
  const getDynamicAISuggestions = useCallback(() => {
    const suggestions: Record<string, string[]> = {
      'Performance': [
        `Hair Before/After Carousel has the best ROAS at 3.47x with a low CPA of ${formatCurrencyValue(577)}. Scale spend by 30% this week.`,
        `"Doc Consultation UGC" CTR dropped from 1.8% to 1.3% over 2 weeks. Creative fatigue likely, queue replacement creative.`,
        `${platform} platform currently selected shows ${filtered.length} active creatives. Top performer has 3.47x ROAS.`,
        `Average CPA across ${platform} is ${formatCurrencyValue(650)}. Consider pausing ads above ${formatCurrencyValue(800)} CPA.`,
        'Performance tab shows real-time creative health. Monitor daily for fatigue signals and scaling opportunities.',
      ],
      'Ad Churn': [
        'March shows healthy creative rotation with newer ads (dark bars) gaining spend share from older creatives.',
        'Legacy creatives (180+ days) should represent <20% of total spend. If higher, creative fatigue risk is building.',
        'Dark cohorts (newer launches) taking over spend is positive. Light cohorts dominating spend signals staleness.',
        'Aim for 60% of spend in last 30 days of creative launches. This indicates fresh creative pipeline.',
        'Creative churn analysis helps predict performance drops before they happen in your metrics.',
      ],
      'Account Control': [
        `Bottom-right quadrant (high spend, low CPA) contains your scaling winners. Top performers under ${formatCurrencyValue(700)} CPA.`,
        `Top-right "zombie" quadrant burns budget at high CPA. Pause any ads consistently above ${formatCurrencyValue(850)}.`,
        'Bottom-left testing quadrant shows new ads with potential. Scale winners that maintain CPA under target.',
        'Account Control Chart requires ad identification. Bubble colors should map to specific creative names below.',
        `Horizontal CPA/NCCPA targets follow Targets (NC = 2× CPA). Vertical spend threshold is 2× the active target (All CPA or NC CPA from the toggle).`,
      ],
      'Slugging Rate': [
        'Production rate tracking shows creative "at bats" vs "hits" - launches vs successful scaling.',
        'Overall slugging rate should target 30% according to Curtis Howland methodology.',
        'Dark sections show scaled creatives (>$10K spend at profitable CPA). Light sections show failed tests.',
        'If launching 20+ ads monthly but <10% scale, you have creative strategy issues, not media buying problems.',
        'February launched 25 ads with 6 hits (24% rate). March tracking shows improved hit rate trending upward.',
      ],
      'Pareto': [
        'Current data shows top 20% of creatives drive 68% of conversions - healthy Pareto distribution.',
        'Avoid spreading budget too thin. Focus 80% of new spend on top performing creative concepts.',
        'Identify the 3-5 winning creative themes and produce more variants within those proven concepts.',
        'Pareto analysis reveals creative concentration risk. Top 3 ads drive 48% of total volume.',
        'Diversify creative pipeline within winning themes to reduce concentration dependency.',
      ],
      'Demographics': [
        `Women 25-44 drive 62% of conversions at lowest CPA (${formatCurrencyValue(613)}-${formatCurrencyValue(656)}). Align creative production to this buying audience.`,
        'Demographics mismatch is expensive. Producing Gen Z TikTok content for millennial women wastes budget.',
        'Spend allocation should follow conversion demographics, not general platform demographics.',
        `Female segments show consistently better ROAS across age groups. Male 25-34 is ${formatCurrencyValue(715)} CPA vs Female 25-34 at ${formatCurrencyValue(613)}.`,
        'Creative production queue should be 70% women-focused based on actual conversion performance.',
      ],
    };
    
    return suggestions[activeTab] || suggestions['Performance'];
  }, [activeTab, platform, campaignFilter, formatCurrencyValue, targetCPA, targetNCCPA]);

  // Get active campaign names for the selected platform
  const activeCampaigns = useMemo(() => {
    const campaigns = creativePerformance
      .filter(c => c.platform === platform && c.status === 'Active')
      .map(c => (c as any).campaignName as string)
      .filter(Boolean);
    return [...new Set(campaigns)];
  }, [platform]);

  // Get campaign names for the current platform from TW ads data
  const accountControlCampaigns = useMemo(() => {
    if (twAds.length > 0) {
      const names = twAds
        .filter(a => a.platform === platform)
        .map(a => a.campaignName)
        .filter(Boolean);
      return [...new Set(names)].sort();
    }
    // Fallback to platform-specific or sample data
    if (platform === 'TikTok' && ttData) {
      return ttData.campaigns.filter(c => c.status === 'ENABLE').map(c => c.name);
    }
    if (platform === 'Meta' && metaData) {
      return metaData.campaigns.filter(c => c.status === 'ACTIVE').map(c => c.name);
    }
    const names = creativePerformance
      .filter(c => c.platform === platform)
      .map(c => (c as any).campaignName as string)
      .filter(Boolean);
    return [...new Set(names)];
  }, [platform, twAds, ttData, metaData]);

  // Filter account control data — use Triple Whale ad-level data (all platforms)
  const filteredAccountControlData = useMemo(() => {
    // Use TW ad-level data if available
    if (twAds.length > 0) {
      let ads = twAds.filter(a => a.platform === platform);
      if (accountControlCampaign !== 'all') {
        ads = ads.filter(a => a.campaignName === accountControlCampaign);
      }
      // Compute averages — exclude $0 CPA ads from CPA average
      const adsWithSpend = ads.filter(a => a.spend > 0);
      const avgSpend = adsWithSpend.length > 0 ? adsWithSpend.reduce((s, a) => s + a.spend, 0) / adsWithSpend.length : 500;
      const adsWithCpa = ads.filter(a => (churnCpaMode === 'nccpa' ? a.ncCpa : a.cpa) > 0);
      const avgCpa = adsWithCpa.length > 0 ? adsWithCpa.reduce((s, a) => s + (churnCpaMode === 'nccpa' ? a.ncCpa : a.cpa), 0) / adsWithCpa.length : churnCpaTarget;

      return ads
        .filter((a) => a.spend > 0)
        .filter(
          (a) =>
            a.orders > 0 ||
            a.ncOrders > 0 ||
            a.revenue > 0 ||
            a.ncRevenue > 0
        )
        .map((a) => {
        const rawCpa = churnCpaMode === 'nccpa' ? a.ncCpa : a.cpa;
        /** Spend axis: 2× the active CPA target (All CPA or NC CPA from the toggle). */
        const spendThreshold = churnCpaTarget * 2;
        const highSpend = a.spend >= spendThreshold;
        const highCpa = rawCpa > 0 && rawCpa > churnCpaTarget;

        let zone: string;
        if (rawCpa <= 0) {
          /** Spend without attributable CPA (should be rare after conversion filter) — never "Scale". */
          zone = highSpend ? 'zombie' : 'testing';
        } else if (highSpend && !highCpa) {
          zone = 'scaling';       // bottom-right
        } else if (highSpend && highCpa) {
          zone = 'zombie';        // top-right
        } else if (!highSpend && !highCpa) {
          zone = 'testing';       // bottom-left
        } else {
          zone = 'untapped';      // top-left (!highSpend && highCpa)
        }

        return {
          name: a.adName,
          adId: a.adId,
          spend: a.spend,
          /** Y-axis / zone math — follows CPA vs NCCPA toggle */
          cpa: rawCpa,
          rawCpa,
          /** Table always shows both attribution metrics (independent of toggle) */
          cpaAll: a.cpa,
          nccpa: a.ncCpa,
          roasAll: a.roas,
          ncroas: a.ncRoas,
          roas: churnCpaMode === 'nccpa' ? a.ncRoas : a.roas,
          orders: a.orders,
          ncOrders: a.ncOrders,
          platform: a.platform as any,
          zone,
          previewUrl: '',
        };
      });
    }

    // Fallback to sample data if TW ads not available
    let data = accountControlData.filter(d => d.platform === platform);
    if (accountControlCampaign !== 'all') {
      const adsInCampaign = creativePerformance
        .filter(c => (c as any).campaignName === accountControlCampaign)
        .map(c => c.name);
      data = data.filter(d => adsInCampaign.includes(d.name));
    }
    return data;
  }, [platform, accountControlCampaign, twAds, churnCpaMode, targetCPA, targetNCCPA, churnCpaTarget]);

  /** Total spend in Account Control scope (platform + campaign filter) — denominator for wasted %. */
  const totalChurnSpend = useMemo(() => {
    if (filteredAccountControlData.length === 0) return 0;
    return filteredAccountControlData.reduce((t, d) => t + d.spend, 0);
  }, [filteredAccountControlData]);

  /** Combined spend of all ads classified as zombies (high spend + CPA above target). */
  const wastedSpend = useMemo(() => {
    if (filteredAccountControlData.length === 0) return 0;
    return filteredAccountControlData
      .filter((d) => d.zone === 'zombie')
      .reduce((t, d) => t + d.spend, 0);
  }, [filteredAccountControlData]);

  // Reset selected campaigns when platform changes
  const handlePlatformChange = (p: string) => {
    setPlatform(p);
    setSelectedCampaigns([]);
    setAccountControlCampaign('all');
  };

  // Memoized filtering for better performance
  const filtered = useMemo(() => {
    return creativePerformance.filter(c => {
      const platformMatch = c.platform === platform;
      const campaignMatch = campaignFilter === 'all' || c.campaign === campaignFilter;
      const campaignNameMatch = selectedCampaigns.length === 0 || selectedCampaigns.includes((c as any).campaignName);
      return platformMatch && campaignMatch && campaignNameMatch;
    });
  }, [platform, campaignFilter, selectedCampaigns]);

  // Pareto: group by angle, exclude Google (search ≠ creative angles)
  const paretoData = useMemo(() => {
    const nonGoogle = creativePerformance.filter(c => c.platform !== 'Google' && (c as any).angle);
    const platformFiltered = platform === 'Google'
      ? nonGoogle // If Google selected, show all non-Google combined
      : nonGoogle.filter(c => c.platform === platform);
    // Group by angle
    const angleMap: Record<string, { conversions: number; spend: number; roas: number; ads: number }> = {};
    platformFiltered.forEach(c => {
      const angle = (c as any).angle as string;
      if (!angleMap[angle]) angleMap[angle] = { conversions: 0, spend: 0, roas: 0, ads: 0 };
      angleMap[angle].conversions += c.conversions;
      angleMap[angle].spend += c.spend;
      angleMap[angle].ads += 1;
    });
    const sorted = Object.entries(angleMap)
      .map(([angle, d]) => ({ angle, ...d, roas: d.spend > 0 ? (d.conversions * 2000) / d.spend : 0 }))
      .sort((a, b) => b.conversions - a.conversions);
    const total = sorted.reduce((s, c) => s + c.conversions, 0);
    let cum = 0;
    return sorted.map(d => { cum += d.conversions; return { ...d, cumPct: total > 0 ? Math.round((cum / total) * 100) : 0 }; });
  }, [platform]);
  const paretoTotal = paretoData.reduce((s, c) => s + c.conversions, 0);

  const creativeAnalysisContext = useMemo(
    () => ({
      dateRangeIso: { start: twAdsStart, end: twAdsEnd },
      activeTab,
      platform,
      attrModel,
      attrWindow,
      attributionModel: attrModel,
      attributionWindow: attrWindow,
      strategyFilter: 'All',
      zoneFilter: accountControlFilter,
      cpaTarget: `${formatCurrencyValue(targetCPA)} all CPA / ${formatCurrencyValue(targetNCCPA)} NC CPA`,
      campaignFilter,
      selectedCampaignsCount: selectedCampaigns.length,
      churnCpaMode,
      churnPlatform,
      sluggingPlatform,
      sluggingMonths,
      twPlatformMetrics,
      performanceRowCount: filtered.length,
      paretoPreview: paretoData.slice(0, 10),
      paretoTotalConversions: paretoTotal,
      twAdsForPlatform: twAds
        .filter((a) => a.platform === platform)
        .slice(0, 45)
        .map((a) => ({
          campaignName: a.campaignName,
          adName: a.adName,
          spend: a.spend,
          cpa: a.cpa,
          ncCpa: a.ncCpa,
          roas: a.roas,
          orders: a.orders,
        })),
      totalChurnSpend,
      wastedSpend,
    }),
    [
      twAdsStart,
      twAdsEnd,
      activeTab,
      platform,
      attrModel,
      attrWindow,
      accountControlFilter,
      targetCPA,
      targetNCCPA,
      formatCurrencyValue,
      campaignFilter,
      selectedCampaigns.length,
      churnCpaMode,
      churnPlatform,
      sluggingPlatform,
      sluggingMonths,
      twPlatformMetrics,
      filtered.length,
      paretoData,
      paretoTotal,
      twAds,
      totalChurnSpend,
      wastedSpend,
    ]
  );

  // Slugging data filtered by platform, CPA mode, and selected month range
  const filteredSlugging = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - sluggingMonths);
    cutoff.setDate(1); // Start from the 1st of the cutoff month to include that month's data
    cutoff.setHours(0, 0, 0, 0);
    
    // Filter by platform first, then by date
    const platformFiltered = sluggingPlatform === 'All'
      ? productionSlugging
      : productionSlugging.filter(d => d.platform === sluggingPlatform);
    
    // Filter by date range
    const dateFiltered = platformFiltered.filter(d => new Date(d.month) >= cutoff);
    
    // Use ncHits or hits based on CPA mode
    const hitsKey = sluggingCpaMode === 'nccpa' ? 'ncHits' : 'hits';
    
    // If platform is 'All', aggregate by month
    if (sluggingPlatform === 'All') {
      const byMonth: Record<string, { month: string; platform: string; launched: number; hits: number; hitRate: number }> = {};
      for (const d of dateFiltered) {
        if (!byMonth[d.month]) {
          byMonth[d.month] = { month: d.month, platform: 'All', launched: 0, hits: 0, hitRate: 0 };
        }
        byMonth[d.month].launched += d.launched;
        byMonth[d.month].hits += (d as any)[hitsKey] ?? d.hits;
      }
      return Object.values(byMonth)
        .map(d => ({ ...d, hitRate: d.launched > 0 ? (d.hits / d.launched) * 100 : 0 }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }
    
    return dateFiltered
      .map(d => ({
        ...d,
        hits: (d as any)[hitsKey] ?? d.hits,
        hitRate: d.launched > 0 ? (((d as any)[hitsKey] ?? d.hits) / d.launched) * 100 : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [sluggingMonths, sluggingPlatform, sluggingCpaMode]);

  const totalSlugging = filteredSlugging.reduce((a, b) => ({ launched: a.launched + b.launched, hits: a.hits + b.hits }), { launched: 0, hits: 0 });

  // Demographics gender+age data — generated to match the universal date range
  const filteredDemographicsGenderAge = useMemo(() => {
    const demoKeys = ['F 18-24', 'F 25-34', 'F 35-44', 'F 45-54', 'F 55+', 'M 18-24', 'M 25-34', 'M 35-44', 'M 45-54', 'M 55+'] as const;
    // Use the last entry from sample data as a baseline for generating values
    const baseline = demographicsGenderAge[demographicsGenderAge.length - 1];
    
    const start = new Date(dateRange.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.endDate);
    end.setHours(23, 59, 59, 999);
    const rangeDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Determine bucket size based on range
    let bucketDays: number;
    let labelFn: (d: Date) => string;
    if (rangeDays <= 7) {
      bucketDays = 1;
      labelFn = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (rangeDays <= 31) {
      bucketDays = 7;
      labelFn = (d) => `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
    } else {
      bucketDays = 30;
      labelFn = (d) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    
    // Platform-specific gender+age biases
    const platGenderAgeBias: Record<string, Record<string, number>> = {
      Meta:   { 'F 18-24': 0.9, 'F 25-34': 1.3, 'F 35-44': 1.2, 'F 45-54': 0.9, 'F 55+': 0.6, 'M 18-24': 0.7, 'M 25-34': 1.1, 'M 35-44': 1.0, 'M 45-54': 0.8, 'M 55+': 0.5 },
      TikTok: { 'F 18-24': 2.0, 'F 25-34': 1.5, 'F 35-44': 0.5, 'F 45-54': 0.2, 'F 55+': 0.1, 'M 18-24': 1.8, 'M 25-34': 1.3, 'M 35-44': 0.4, 'M 45-54': 0.15, 'M 55+': 0.05 },
      Reddit: { 'F 18-24': 0.8, 'F 25-34': 1.0, 'F 35-44': 0.6, 'F 45-54': 0.3, 'F 55+': 0.1, 'M 18-24': 1.5, 'M 25-34': 1.8, 'M 35-44': 1.0, 'M 45-54': 0.5, 'M 55+': 0.2 },
      Google: { 'F 18-24': 0.7, 'F 25-34': 1.0, 'F 35-44': 1.2, 'F 45-54': 1.1, 'F 55+': 0.8, 'M 18-24': 0.6, 'M 25-34': 0.9, 'M 35-44': 1.3, 'M 45-54': 1.2, 'M 55+': 0.9 },
    };
    const biases = platGenderAgeBias[platform] || platGenderAgeBias.Meta;

    const buckets: Array<Record<string, any>> = [];
    const cursor = new Date(start);
    let idx = 0;
    while (cursor <= end) {
      const label = labelFn(cursor);
      const entry: Record<string, any> = { displayLabel: label };
      for (const key of demoKeys) {
        const base = (baseline as any)[key] || 5000;
        const variance = 1 + (((idx * 7 + key.charCodeAt(0)) % 30) - 15) / 100;
        const platformBias = biases[key] ?? 1.0;
        entry[key] = Math.round(base * variance * platformBias * (bucketDays / 7));
      }
      buckets.push(entry);
      cursor.setDate(cursor.getDate() + bucketDays);
      idx++;
    }
    
    return buckets;
  }, [dateRange, demographicsGenderAge, platform]);

  const demoSpendChartSeries = useMemo(() => {
    if (demoSpendGender === 'male') {
      return {
        keys: ['M 18-24', 'M 25-34', 'M 35-44', 'M 45-54', 'M 55+'] as const,
        colors: ['#93c5fd', '#3b82f6', '#2563eb', '#1d4ed8', '#1e3a8a'] as const,
      };
    }
    return {
      keys: ['F 18-24', 'F 25-34', 'F 35-44', 'F 45-54', 'F 55+'] as const,
      colors: ['#fca5a5', '#ef4444', '#dc2626', '#b91c1c', '#7f1d1d'] as const,
    };
  }, [demoSpendGender]);

  const sluggingCpaTarget = sluggingCpaMode === 'cpa' ? targetCPA : targetNCCPA;

  // Filter demographics data based on gender selection
  // Platform multipliers to simulate different demographic distributions per platform
  const platformDemoMultipliers: Record<string, { spendMult: number; convMult: number; cpaMult: number; roasMult: number; ageBias: Record<string, number> }> = {
    Meta:   { spendMult: 1.0, convMult: 1.0, cpaMult: 1.0, roasMult: 1.0, ageBias: { '18-24': 0.8, '25-34': 1.2, '35-44': 1.1, '45-54': 0.9, '55-64': 0.7, '65+': 0.5 } },
    TikTok: { spendMult: 0.35, convMult: 0.3, cpaMult: 1.15, roasMult: 0.75, ageBias: { '18-24': 1.8, '25-34': 1.4, '35-44': 0.6, '45-54': 0.3, '55-64': 0.1, '65+': 0.05 } },
    Reddit: { spendMult: 0.15, convMult: 0.12, cpaMult: 1.25, roasMult: 0.65, ageBias: { '18-24': 1.3, '25-34': 1.5, '35-44': 1.0, '45-54': 0.5, '55-64': 0.3, '65+': 0.1 } },
    Google: { spendMult: 0.6, convMult: 0.55, cpaMult: 1.08, roasMult: 0.9, ageBias: { '18-24': 0.7, '25-34': 1.0, '35-44': 1.3, '45-54': 1.2, '55-64': 1.0, '65+': 0.8 } },
  };

  const getFilteredDemographicsAge = () => {
    const platMult = platformDemoMultipliers[platform] || platformDemoMultipliers.Meta;
    
    let data = demographicsAge.map(row => {
      const ageBias = platMult.ageBias[row.group] ?? 1.0;
      const spend = Math.round(row.spend * platMult.spendMult * ageBias);
      const conversions = Math.round(row.conversions * platMult.convMult * ageBias);
      const cpa = conversions > 0 ? Math.round(spend / conversions) : 0;
      const roas = spend > 0 ? parseFloat((row.roas * platMult.roasMult * (ageBias > 0.5 ? 1 + (ageBias - 1) * 0.3 : 0.5)).toFixed(2)) : 0;
      return { ...row, spend, conversions, cpa, roas, pctSpend: row.pctSpend };
    });

    // Recalculate pctSpend
    const totalSpend = data.reduce((s, r) => s + r.spend, 0);
    data = data.map(r => ({ ...r, pctSpend: totalSpend > 0 ? parseFloat(((r.spend / totalSpend) * 100).toFixed(1)) : 0 }));

    if (genderFilter !== 'all') {
      const multiplier = genderFilter === 'male' ? 0.4 : 0.6;
      data = data.map(row => ({
        ...row,
        conversions: Math.round(row.conversions * multiplier),
        spend: Math.round(row.spend * multiplier),
      }));
    }
    
    return data;
  };

  // Platform-filtered gender data
  const getFilteredDemographicsGender = () => {
    const platMult = platformDemoMultipliers[platform] || platformDemoMultipliers.Meta;
    const totalMult = platMult.spendMult;
    return demographicsGender.map(row => {
      const spend = Math.round(row.spend * totalMult);
      const conversions = Math.round(row.conversions * platMult.convMult);
      const cpa = conversions > 0 ? Math.round(spend / conversions) : 0;
      const roas = parseFloat((row.roas * platMult.roasMult).toFixed(2));
      return { ...row, spend, conversions, cpa, roas };
    });
  };

  if (twLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h2 className="text-lg sm:text-xl font-semibold">Creative & MTA Control Panel</h2>
        <p className="text-sm text-text-secondary">Fetching live data...</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard />
        </div>
        <SkeletonTable rows={6} cols={8} />
        <SkeletonChart />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h2 className="text-lg sm:text-xl font-semibold">Creative & MTA Control Panel</h2>
        <span className="text-xs text-text-tertiary">
          {activeTab === 'Account Control' ? (
            <>
              Account Control: <span className="text-text-secondary">{attrWindow}</span> lookback ·{' '}
              {formatDateLabel(twAdsStart, 'day')} – {formatDateLabel(twAdsEnd, 'day')}
              {attrWindow === 'Lifetime' ? ' · Lifetime uses a 365-day report range in Clickman' : ''}
            </>
          ) : (
            <>
              {dateRange.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
              {dateRange.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </>
          )}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-1.5 flex-wrap px-1">
        {tabs.map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (platform === 'Google' && tab !== 'Account Control') setPlatform('Meta'); }} className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-w-0 ${activeTab === tab ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
            <span className="truncate">{tab}</span>
          </button>
        ))}
      </div>

      {/* Tab Description */}
      <div className="bg-bg-surface border border-border rounded-lg px-4 py-3 mx-1">
        <p className="text-sm text-text-secondary leading-relaxed">{tabDescriptions[activeTab]}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mx-1">
        {/* Row 1: Platform + Attribution */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {!['Slugging Rate', 'Ad Churn'].includes(activeTab) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-secondary font-medium shrink-0">Platform:</span>
              <div className="flex gap-1 flex-wrap">
                {(activeTab === 'Account Control' ? platformsWithGoogle : platforms).map(p => (
                  <button key={p} onClick={() => handlePlatformChange(p)} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${platform === p ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
                    {p}
                  </button>
                ))}
              </div>
              {activeTab === 'Account Control' && accountControlCampaigns.length > 0 && (
                <>
                  <span className="text-xs text-text-tertiary mx-1">|</span>
                  <span className="text-xs text-text-secondary font-medium shrink-0">Campaign:</span>
                  <div className="relative">
                    <select
                      value={accountControlCampaign}
                      onChange={(e) => { setAccountControlCampaign(e.target.value); setAcCurrentPage(1); }}
                      className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors max-w-[280px]"
                    >
                      <option value="all">All Campaigns</option>
                      {accountControlCampaigns.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === 'Account Control' && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:ml-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary font-medium shrink-0">Model:</span>
                <div className="relative">
                  <select value={attrModel} onChange={(e) => setAttrModel(e.target.value)} className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors">
                    {attributionModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary font-medium shrink-0">Window:</span>
                <div className="relative">
                  <select value={attrWindow} onChange={(e) => setAttrWindow(e.target.value)} className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors">
                    {attributionWindows.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Row 2: Campaign filters (Performance tab only) */}
        {activeTab === 'Performance' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {activeCampaigns.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary font-medium shrink-0">Campaign:</span>
                <div className="relative">
                  <select
                    value={selectedCampaigns.length === 0 ? 'all' : selectedCampaigns.length === 1 ? selectedCampaigns[0] : 'multiple'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'all') {
                        setSelectedCampaigns([]);
                      } else {
                        setSelectedCampaigns([val]);
                      }
                    }}
                    className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors"
                  >
                    <option value="all">All Campaigns</option>
                    {activeCampaigns.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium shrink-0">Strategy:</span>
              <div className="flex gap-1 flex-wrap">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'scale', label: 'Scale' },
                  { key: 'kill', label: 'Kill' },
                  { key: 'test', label: 'Test' },
                  { key: 'learn', label: 'Learn' }
                ].map(f => (
                  <button key={f.key} onClick={() => setCampaignFilter(f.key)} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${campaignFilter === f.key ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════ PERFORMANCE TAB (commented out per Indro — recoverable) ═══════════════════════ */}
      {activeTab === 'Performance' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary">Creative Performance</h3>
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <DataSource source="TripleWhale" />
              <LiveBadge />
              <span>+</span>
              <DataSource source="N/A" />
              <LiveBadge variant="sample" />
            </div>
          </div>
          {/* TW Platform Summary */}
          {twPlatformMetrics && twPlatformMetrics[platform as keyof NonNullable<typeof twPlatformMetrics>] && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4 p-3 bg-bg-elevated rounded-lg border border-border/50">
              <div>
                <div className="text-[10px] text-text-tertiary uppercase">Spend</div>
                <div className="text-sm font-semibold text-text-primary">{formatCurrencyValue(twPlatformMetrics![platform as keyof NonNullable<typeof twPlatformMetrics>].spend)}</div>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary uppercase">ROAS</div>
                <div className={`text-sm font-semibold ${twPlatformMetrics![platform as keyof NonNullable<typeof twPlatformMetrics>].roas >= 3.0 ? 'text-success' : twPlatformMetrics![platform as keyof NonNullable<typeof twPlatformMetrics>].roas >= 2.0 ? 'text-warm-gold' : 'text-danger'}`}>{twPlatformMetrics![platform as keyof NonNullable<typeof twPlatformMetrics>].roas.toFixed(2)}x</div>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary uppercase">CPA</div>
                <div className="text-sm font-semibold text-text-primary">{formatCurrencyValue(twPlatformMetrics![platform as keyof NonNullable<typeof twPlatformMetrics>].cpa)}</div>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary uppercase">Impressions</div>
                <div className="text-sm font-semibold text-text-primary">{(twPlatformMetrics![platform as keyof NonNullable<typeof twPlatformMetrics>].impressions / 1000).toFixed(0)}K</div>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary uppercase">CTR</div>
                <div className="text-sm font-semibold text-text-primary">{twPlatformMetrics![platform as keyof NonNullable<typeof twPlatformMetrics>].ctr.toFixed(2)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary uppercase">Conv. Value</div>
                <div className="text-sm font-semibold text-text-primary">{formatCurrencyValue(twPlatformMetrics![platform as keyof NonNullable<typeof twPlatformMetrics>].conversionValue)}</div>
              </div>
            </div>
          )}
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto -mx-1 sm:mx-0">
            <div className="min-w-[900px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-secondary uppercase">
                    <th className="text-left py-2 px-2 font-medium min-w-[150px]">Ad Name</th>
                    <th className="text-center py-2 px-2 font-medium min-w-[90px]">Creative</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[70px]">Spend</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[60px]">Impr.</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[50px]">CTR</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[60px]">CPC</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[50px]">Conv.</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[70px]">
                      <div className="flex items-center justify-end gap-1">
                        <span>CPA</span>
                        <InfoTooltip metric="nCAC" />
                      </div>
                    </th>
                    <th className="text-right py-2 px-2 font-medium min-w-[70px]">
                      <div className="flex items-center justify-end gap-1">
                        <span>ROAS</span>
                        <InfoTooltip metric="ROAS" />
                      </div>
                    </th>
                    <th className="text-right py-2 px-2 font-medium min-w-[60px]">Frequency</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[70px]">NCROAS</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[60px]">AOV</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[70px]">NCCPA</th>
                    <th className="text-center py-2 px-2 font-medium min-w-[60px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row: any) => (
                    <tr key={row.name} className="border-b border-border/30 hover:bg-bg-elevated/50 transition-colors">
                      <td className="py-2.5 px-2 font-medium text-text-primary max-w-[200px]">
                        <a 
                          href={`/api/ad-preview/${row.name.replace(/\s+/g, '-').toLowerCase()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-blue-light hover:text-brand-blue underline truncate block"
                          title={`View details for ${row.name}`}
                        >
                          {row.name}
                        </a>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div 
                          onClick={() => window.open(`/api/ad-preview/${row.name.replace(/\s+/g, '-').toLowerCase()}`, '_blank')}
                          className="cursor-pointer hover:opacity-75 transition-opacity group relative"
                          title={`Preview ${row.name}`}
                        >
                          <img 
                            src={`/api/ad-thumbnail/${row.name.replace(/\s+/g, '-').toLowerCase()}.jpg`}
                            alt={`Thumbnail for ${row.name}`}
                            className="w-12 h-12 object-cover rounded-md border border-border shadow-sm mx-auto"
                            onError={(e) => {
                              // Fallback to video thumbnail if image fails
                              (e.target as HTMLImageElement).src = `/api/ad-thumbnail/${row.name.replace(/\s+/g, '-').toLowerCase()}.png`;
                              (e.target as HTMLImageElement).onerror = () => {
                                // Final fallback to generic placeholder
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjMxNEY0IiByeD0iNCIvPgo8cGF0aCBkPSJNMTYgMjBIMzJWMjhIMTZWMjBaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMjAuNSAyMy41TDIzLjI1IDI2LjI1TDI3LjUgMjFMMzIgMjhIMTZMMjAuNSAyMy41WiIgZmlsbD0iIzM3NEE2QiIvPgo8L3N2Zz4K';
                              };
                            }}
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                            <div className="text-white text-xs font-medium">View</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{formatCurrencyValue(row.spend)}</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{(row.impressions / 1000).toFixed(0)}K</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{row.ctr.toFixed(2)}%</td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{formatCurrencyValue(row.cpc)}</td>
                      <td className="py-2.5 px-2 text-right text-text-primary font-medium">{row.conversions}</td>
                      <td className="py-2.5 px-2 text-right"><span className={row.cpa <= 700 ? 'text-success' : row.cpa <= 850 ? 'text-warm-gold' : 'text-danger'}>{formatCurrencyValue(row.cpa)}</span></td>
                      <td className="py-2.5 px-2 text-right"><span className={row.roas >= 3.0 ? 'text-success' : row.roas >= 2.5 ? 'text-warm-gold' : 'text-danger'}>{row.roas.toFixed(2)}x</span></td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{((row as any).frequency || 1.2).toFixed(1)}</td>
                      <td className="py-2.5 px-2 text-right"><span className={((row as any).ncroas || row.roas * 0.8) >= 2.4 ? 'text-success' : ((row as any).ncroas || row.roas * 0.8) >= 2.0 ? 'text-warm-gold' : 'text-danger'}>{((row as any).ncroas || row.roas * 0.8).toFixed(2)}x</span></td>
                      <td className="py-2.5 px-2 text-right text-text-secondary">{formatCurrencyValue((row as any).aov || 2150)}</td>
                      <td className="py-2.5 px-2 text-right"><span className={((row as any).nccpa || row.cpa * 0.75) <= 525 ? 'text-success' : ((row as any).nccpa || row.cpa * 0.75) <= 638 ? 'text-warm-gold' : 'text-danger'}>{formatCurrencyValue((row as any).nccpa || row.cpa * 0.75)}</span></td>
                      <td className="py-2.5 px-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${row.status === 'Active' ? 'bg-success/15 text-success' : 'bg-warm-gold/15 text-warm-gold'}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Layout */}
          <div className="lg:hidden space-y-3">
            {filtered.map((row: any) => (
              <div key={row.name} className="bg-bg-elevated border border-border rounded-lg p-4">
                {/* Ad Name & Creative */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <a 
                      href={`/api/ad-preview/${row.name.replace(/\s+/g, '-').toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-blue-light hover:text-brand-blue underline text-sm font-medium block truncate"
                      title={`View details for ${row.name}`}
                    >
                      {row.name}
                    </a>
                    <div className="text-xs text-text-secondary mt-1">
                      {row.platform} • <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        row.status === 'Active' ? 'bg-success/15 text-success' : 'bg-warm-gold/15 text-warm-gold'
                      }`}>{row.status}</span>
                    </div>
                  </div>
                  <div 
                    onClick={() => window.open(`/api/ad-preview/${row.name.replace(/\s+/g, '-').toLowerCase()}`, '_blank')}
                    className="ml-3 cursor-pointer hover:opacity-75 transition-opacity"
                    title={`Preview ${row.name}`}
                  >
                    <img src={`/api/ad-thumbnail/creative/${row.platform.toLowerCase()}/${row.name.replace(/\s+/g, '-').toLowerCase()}.jpg`} alt="" className="w-12 h-12 rounded object-cover" />
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-text-secondary block">Spend</span>
                    <span className="text-text-primary font-medium">{formatCurrencyValue(row.spend)}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary block">CPA</span>
                    <span className="text-text-primary font-medium">{formatCurrencyValue(row.cpa)}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary block">ROAS</span>
                    <span className="text-text-primary font-medium">{row.roas.toFixed(2)}x</span>
                  </div>
                  <div>
                    <span className="text-text-secondary block">CTR</span>
                    <span className="text-text-primary font-medium">{row.ctr.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Strategy Badge */}
                <div className="mt-3 flex justify-end">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    row.campaign === 'scale' ? 'bg-success/15 text-success' :
                    row.campaign === 'kill' ? 'bg-danger/15 text-danger' :
                    row.campaign === 'test' ? 'bg-brand-blue/15 text-brand-blue-light' :
                    'bg-warm-gold/15 text-warm-gold'
                  }`}>{row.campaign}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ═══════════════════════ ACCOUNT CONTROL (Scatter Plot) ═══════════════════════ */}
      {activeTab === 'Account Control' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1 relative">
          {twAdsLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-surface/70 backdrop-blur-[1px] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-text-secondary">Loading attribution data…</span>
              </div>
            </div>
          )}
          {!twAdsLoading && twAds.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-surface/80 backdrop-blur-[1px] rounded-lg">
              <div className="text-center">
                <div className="text-sm font-medium text-text-primary mb-1">No ad-level data for this model</div>
                <div className="text-xs text-text-secondary">Triple Whale may not have ad-level data for "{attrModel}". Try "Triple Attribution".</div>
              </div>
            </div>
          )}
          {!twAdsLoading && twAds.length > 0 && filteredAccountControlData.length === 0 && (
            <div className="mb-4 rounded-lg border border-warm-gold/30 bg-warm-gold/5 px-3 py-2 text-xs text-text-secondary">
              No rows left after filters: every ad in this window had spend but no attributed orders or revenue, or spend was $0. Try a longer Window or align Model with Triple Whale.
            </div>
          )}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <span className="truncate">Account Control, CPA vs Spend</span>
                <InfoTooltip metric="Account Control Chart" />
              </h3>
              <div className="flex items-center gap-3">
              </div>
            </div>
            <p className="text-[10px] text-text-tertiary leading-snug">
              <strong className="text-text-secondary">Account Control ignores the global date range above.</strong> The Window control sets both the{' '}
              <strong className="text-text-secondary">report date range</strong> (how many calendar days of spend to load, ending today) and the{' '}
              <strong className="text-text-secondary">Triple Whale attribution_window</strong> in the SQL (same labels as Moby). Match Window + Model to Triple Whale when comparing rows.{' '}
              <strong className="text-text-secondary">Lifetime</strong> uses a 365-day lookback here. Ads with spend but no attributed orders or revenue are excluded so quadrants stay meaningful.
            </p>
            {/* CPA Target Toggle + Wasted Spend */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-end">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium">Target CPA</span>
                <div className="flex bg-bg-elevated border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setChurnCpaMode('cpa')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${churnCpaMode === 'cpa' ? 'bg-brand-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}
                  >All Customers ({formatCurrencyValue(targetCPA)})</button>
                  <button
                    onClick={() => setChurnCpaMode('nccpa')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${churnCpaMode === 'nccpa' ? 'bg-brand-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}
                  >New Customers ({formatCurrencyValue(targetNCCPA)})</button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium">Wasted Spend</span>
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${wastedSpend > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  <div className={`w-2 h-2 rounded-full ${wastedSpend > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className={`text-sm font-semibold ${wastedSpend > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatCurrencyValue(wastedSpend)}
                  </span>
                  {totalChurnSpend > 0 && (
                    <span className="text-[10px] text-text-tertiary">
                      ({((wastedSpend / totalChurnSpend) * 100).toFixed(1)}% of spend)
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-text-tertiary">
                  Sum of spend for ads in the zombie quadrant (spend ≥ {formatCurrencyValue(churnCpaTarget * 2)}, {churnCpaMode === 'cpa' ? 'CPA' : 'NCCPA'} above target)
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-4 mb-4 flex-wrap">
            {Object.entries(zoneLabels).map(([zone, label]) => (
              <div key={zone} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: zoneColors[zone] }} />
                <span className="text-xs text-text-secondary truncate">{label}</span>
              </div>
            ))}
          </div>
          {(() => {
            // Don't render chart if no data
            if (filteredAccountControlData.length === 0) return null;
            // Use target-based reference lines
            const cpaTarget = churnCpaMode === 'nccpa' ? targetNCCPA : targetCPA;
            const spendTarget = churnCpaTarget * 2;
            const adsWithData = filteredAccountControlData.filter(a => a.spend > 0);
            const maxSpend = adsWithData.length > 0 ? Math.max(...adsWithData.map(a => a.spend)) : 1000;
            const maxCpa = adsWithData.length > 0 ? Math.max(...adsWithData.map(a => a.cpa)) : 1000;
            // Add 20% padding, ensure targets are visible
            const xMax = Math.ceil(Math.max(maxSpend, spendTarget) * 1.2);
            const yMax = Math.ceil(Math.max(maxCpa, cpaTarget) * 1.2);
            return (
          <div className="min-h-[320px] sm:min-h-[450px]" style={{ width: '100%', height: '450px' }}>
            <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 50, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="number" dataKey="spend" name="Spend"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                tickFormatter={(v) => formatCurrencyValue(v).replace('$', '$').replace(',', '')}
                domain={[0, xMax]}
                tickCount={6}
                label={{ value: 'Total Spend', position: 'insideBottom', offset: -15, style: { fill: 'var(--color-text-tertiary)', fontSize: 11, textAnchor: 'middle' } }}
              />
              <YAxis
                type="number" dataKey="cpa" name="CPA"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                tickFormatter={(v) => formatCurrencyValue(v).replace('$', '$').replace(',', '')}
                domain={[0, yMax]}
                tickCount={7}
                label={{ value: churnCpaMode === 'nccpa' ? 'NCCPA' : 'CPA', angle: -90, position: 'insideLeft', offset: 10, style: { fill: 'var(--color-text-tertiary)', fontSize: 11, textAnchor: 'middle' } }}
              />
              <ZAxis type="number" range={[80, 200]} />
              <ReferenceLine y={cpaTarget} stroke="#EF4444" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Target ${churnCpaMode === 'nccpa' ? 'NCCPA' : 'CPA'} ${formatCurrencyValue(cpaTarget)}`, position: 'right', style: { fill: '#EF4444', fontSize: 10, fontWeight: 600 } }} />
              <ReferenceLine x={spendTarget} stroke="var(--color-text-tertiary)" strokeDasharray="4 4" strokeWidth={1} label={{ value: `Spend Threshold ${formatCurrencyValue(spendTarget)}`, position: 'top', style: { fill: 'var(--color-text-tertiary)', fontSize: 10 } }} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ 
                  background: 'var(--color-bg-surface)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 8, 
                  fontSize: 12,
                  padding: '8px 12px',
                  color: 'var(--color-text-primary)'
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload[0] && payload[0].payload) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-bg-surface border border-border rounded-lg p-3 shadow-lg">
                        <div className="font-medium text-text-primary text-sm mb-2">{data.name}</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between gap-4">
                            <span className="text-text-secondary">Spend (X-axis):</span>
                            <span className="text-text-primary font-medium">{formatCurrencyValue(data.spend)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-text-secondary">{churnCpaMode === 'nccpa' ? 'NCCPA' : 'CPA'}:</span>
                            <span className="text-text-primary font-medium">{data.rawCpa === 0 ? 'No conversions' : formatCurrencyValue(data.rawCpa ?? data.cpa)}</span>
                          </div>
                          {data.orders !== undefined && (
                          <div className="flex justify-between gap-4">
                            <span className="text-text-secondary">Orders:</span>
                            <span className="text-text-primary font-medium">{data.orders}</span>
                          </div>
                          )}
                          {(data.roas ?? 0) > 0 && (
                          <div className="flex justify-between gap-4">
                            <span className="text-text-secondary">{churnCpaMode === 'nccpa' ? 'NCROAS' : 'ROAS'}:</span>
                            <span className="text-text-primary font-medium">{(data.roas ?? 0).toFixed(2)}x</span>
                          </div>
                          )}
                          <div className="flex justify-between gap-4">
                            <span className="text-text-secondary">Platform:</span>
                            <span className="text-text-primary font-medium">{data.platform}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-text-secondary">Zone:</span>
                            <span className={`font-medium ${
                              data.zone === 'scaling' ? 'text-success' :
                              data.zone === 'zombie' ? 'text-danger' :
                              data.zone === 'testing' ? 'text-brand-blue-light' :
                              'text-warm-gold'
                            }`}>
                              {data.zone === 'scaling' ? 'Scale' :
                               data.zone === 'zombie' ? 'Zombie' :
                               data.zone === 'testing' ? 'Testing' : 'Untapped'}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                data={filteredAccountControlData} 
                name="Ads"
                onClick={(data) => {
                  if (data && data.payload && data.payload.previewUrl) {
                    window.open(data.payload.previewUrl, '_blank');
                  }
                }}
              >
                {filteredAccountControlData.map((entry, i) => (
                  <Cell 
                    key={i} 
                    fill={zoneColors[entry.zone]} 
                    fillOpacity={0.85} 
                    stroke={zoneColors[entry.zone]} 
                    strokeWidth={1}
                    className="cursor-pointer hover:opacity-75 transition-opacity"
                  />
                ))}
              </Scatter>
            </ScatterChart>
            </ResponsiveContainer>
          </div>
            );
          })()}
          {/* Quadrant labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="bg-success/5 border border-success/20 rounded-lg p-3">
              <div className="text-xs font-medium text-success mb-1">↘ Bottom-Right: Scale</div>
              <div className="text-xs text-text-secondary">Spend ≥ {formatCurrencyValue(churnCpaTarget * 2)} (2× active {churnCpaMode === 'nccpa' ? 'NCCPA' : 'CPA'}), {churnCpaMode === 'nccpa' ? 'NCCPA' : 'CPA'} below target. Proven winners — scale harder.</div>
            </div>
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-3">
              <div className="text-xs font-medium text-danger mb-1">↗ Top-Right: Zombies</div>
              <div className="text-xs text-text-secondary">Spend ≥ {formatCurrencyValue(churnCpaTarget * 2)} (2× active {churnCpaMode === 'nccpa' ? 'NCCPA' : 'CPA'}), {churnCpaMode === 'nccpa' ? 'NCCPA' : 'CPA'} above target. Burning budget. Kill or restructure.</div>
            </div>
            <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-lg p-3">
              <div className="text-xs font-medium text-brand-blue-light mb-1">↙ Bottom-Left: Testing</div>
              <div className="text-xs text-text-secondary">Spend below {formatCurrencyValue(churnCpaTarget * 2)} (2× active {churnCpaMode === 'nccpa' ? 'NCCPA' : 'CPA'}), {churnCpaMode === 'nccpa' ? 'NCCPA' : 'CPA'} below target. Promising — scale up to confirm.</div>
            </div>
            <div className="bg-warm-gold/5 border border-warm-gold/20 rounded-lg p-3">
              <div className="text-xs font-medium text-warm-gold mb-1">↖ Top-Left: Untapped / Learning</div>
              <div className="text-xs text-text-secondary">Spend below {formatCurrencyValue(churnCpaTarget * 2)} (2× active {churnCpaMode === 'nccpa' ? 'NCCPA' : 'CPA'}), {churnCpaMode === 'nccpa' ? 'NCCPA' : 'CPA'} above target. Still learning or needs new approach.</div>
            </div>

          </div>
          
          {/* Creative Listings Table */}
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
              <h4 className="text-sm font-medium text-text-primary">
                Account Control Creative Legend
                <span className="text-xs text-text-secondary ml-2 font-normal">
                  (Colors match chart bubbles above)
                </span>
              </h4>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setAccountControlFilter('all'); setAcCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    accountControlFilter === 'all'
                      ? 'bg-brand-blue text-white'
                      : 'bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => { setAccountControlFilter('scaling'); setAcCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    accountControlFilter === 'scaling'
                      ? 'bg-success text-white'
                      : 'bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                  }`}
                >
                  Scale
                </button>
                <button
                  onClick={() => { setAccountControlFilter('testing'); setAcCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    accountControlFilter === 'testing'
                      ? 'bg-brand-blue text-white'
                      : 'bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                  }`}
                >
                  Testing
                </button>
                <button
                  onClick={() => { setAccountControlFilter('zombie'); setAcCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    accountControlFilter === 'zombie'
                      ? 'bg-danger text-white'
                      : 'bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                  }`}
                >
                  Zombies
                </button>
                <button
                  onClick={() => { setAccountControlFilter('untapped'); setAcCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    accountControlFilter === 'untapped'
                      ? 'bg-warm-gold text-white'
                      : 'bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                  }`}
                >
                  Untapped/Learning
                </button>

              </div>
            </div>
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <div className="min-w-[848px]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-secondary uppercase">
                      <th className="text-left py-2 px-2 font-medium w-[70px]">Zone</th>
                      <th className="text-center py-2 px-1 font-medium w-[44px]">Preview</th>
                      <th className="text-left py-2 px-2 font-medium w-[300px] min-w-[300px] max-w-[300px]">Ad Name</th>
                      {[
                        { key: 'spend', label: 'Spend', width: 'min-w-[80px]' },
                        { key: 'cpa', label: 'CPA', width: 'min-w-[80px]' },
                        { key: 'nccpa', label: 'NCCPA', width: 'min-w-[80px]' },
                        { key: 'roas', label: 'ROAS', width: 'min-w-[70px]' },
                        { key: 'ncroas', label: 'NCROAS', width: 'min-w-[70px]' },
                      ].map(col => (
                        <th
                          key={col.key}
                          className={`text-right py-2 px-2 font-medium ${col.width} cursor-pointer select-none hover:text-text-primary transition-colors`}
                          onClick={() => {
                            if (acSortKey === col.key) {
                              setAcSortDir(d => d === 'desc' ? 'asc' : 'desc');
                            } else {
                              setAcSortKey(col.key);
                              setAcSortDir('desc');
                            }
                            setAcCurrentPage(1);
                          }}
                        >
                          {col.label} {acSortKey === col.key ? (acSortDir === 'desc' ? '↓' : '↑') : ''}
                        </th>
                      ))}
                      <th className="text-center py-2 px-2 font-medium min-w-[50px]">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccountControlData
                      .filter(ad => accountControlFilter === 'all' || ad.zone === accountControlFilter)
                      .sort((a, b) => {
                        const sortVal = (row: Record<string, unknown>) => {
                          if (acSortKey === 'cpa') return Number((row as any).cpaAll ?? row.cpa) || 0;
                          if (acSortKey === 'roas') return Number((row as any).roasAll ?? row.roas) || 0;
                          return Number((row as any)[acSortKey]) || 0;
                        };
                        const valA = sortVal(a as Record<string, unknown>);
                        const valB = sortVal(b as Record<string, unknown>);
                        return acSortDir === 'desc' ? valB - valA : valA - valB;
                      })
                      .slice((acCurrentPage - 1) * acPageSize, acCurrentPage * acPageSize)
                      .map((ad) => {
                        // Build platform ad URL
                        const adId = (ad as any).adId || '';
                        let platformUrl = '';
                        if (ad.platform === 'Meta' && adId) {
                          platformUrl = `https://www.facebook.com/ads/manager/account/campaigns?act=${process.env.NEXT_PUBLIC_META_AD_ACCOUNT_ID || ''}&selected_adset_ids&selected_campaign_ids&search_value=${encodeURIComponent(adId)}`;
                        } else if (ad.platform === 'TikTok' && adId) {
                          platformUrl = `https://ads.tiktok.com/i18n/perf?keyword=${encodeURIComponent(adId)}`;
                        } else if (ad.platform === 'Google' && adId) {
                          platformUrl = `https://ads.google.com/aw/ads?adId=${encodeURIComponent(adId)}`;
                        } else if (ad.platform === 'Reddit' && adId) {
                          platformUrl = `https://ads.reddit.com/`;
                        }
                        return (
                      <tr key={`${ad.name}-${adId}`} className="border-b border-border/30 hover:bg-bg-elevated/50 transition-colors">
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full border border-black/10 shrink-0" 
                              style={{ backgroundColor: zoneColors[ad.zone] }}
                            />
                            <span className="text-xs text-text-tertiary whitespace-nowrap">
                              {ad.zone === 'scaling' ? 'Scale' :
                               ad.zone === 'zombie' ? 'Kill' :
                               ad.zone === 'testing' ? 'Test' :
                               'Learn'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-1 align-middle">
                          <div className="flex justify-center">
                            <AdThumbnail adId={adId ? String(adId) : undefined} platform={ad.platform} size={36} />
                          </div>
                        </td>
                        <td className="py-2.5 px-2 font-medium text-text-primary w-[300px] min-w-[300px] max-w-[300px]">
                          <div className="overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" title={ad.name}>
                            {ad.name}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right text-text-secondary whitespace-nowrap">
                          {ad.spend == null || !Number.isFinite(Number(ad.spend)) ? '—' : formatCurrencyValue(ad.spend)}
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          {(() => {
                            const v = (ad as any).cpaAll ?? (ad as any).cpa;
                            const num = v == null || !Number.isFinite(Number(v)) ? NaN : Number(v);
                            return (
                          <span className={!Number.isFinite(num) || num === 0 ? 'text-text-tertiary' : num <= 700 ? 'text-success' : num <= 850 ? 'text-warm-gold' : 'text-danger'}>
                            {!Number.isFinite(num) || num === 0 ? '—' : formatCurrencyValue(num)}
                          </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          <span className={
                            (ad as any).nccpa == null || !Number.isFinite(Number((ad as any).nccpa)) || (ad as any).nccpa === 0
                              ? 'text-text-tertiary'
                              : (ad as any).nccpa <= 525 ? 'text-success' : (ad as any).nccpa <= 638 ? 'text-warm-gold' : 'text-danger'
                          }>
                            {(ad as any).nccpa == null || !Number.isFinite(Number((ad as any).nccpa)) || (ad as any).nccpa === 0
                              ? '—'
                              : formatCurrencyValue((ad as any).nccpa)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          {(() => {
                            const v = (ad as any).roasAll ?? (ad as any).roas;
                            return (
                          <span className={!v ? 'text-text-tertiary' : v >= 3.0 ? 'text-success' : v >= 2.0 ? 'text-warm-gold' : 'text-danger'}>
                            {!v ? '—' : `${Number(v).toFixed(2)}x`}
                          </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          <span className={!(ad as any).ncroas ? 'text-text-tertiary' : (ad as any).ncroas >= 2.4 ? 'text-success' : (ad as any).ncroas >= 1.5 ? 'text-warm-gold' : 'text-danger'}>
                            {!(ad as any).ncroas ? '—' : `${((ad as any).ncroas).toFixed(2)}x`}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {platformUrl ? (
                            <a
                              href={platformUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-blue-light hover:text-brand-blue text-xs font-medium px-2 py-1 rounded-md border border-brand-blue/30 hover:border-brand-blue/50 transition-colors inline-block"
                              title={`Open in ${ad.platform} Ads Manager`}
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-text-tertiary text-xs">—</span>
                          )}
                        </td>
                      </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {(() => {
              const totalFiltered = filteredAccountControlData
                .filter(ad => accountControlFilter === 'all' || ad.zone === accountControlFilter).length;
              const totalPages = Math.ceil(totalFiltered / acPageSize);
              if (totalFiltered <= 10) return null;
              return (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span>Show</span>
                    {[10, 20, 50].map(size => (
                      <button
                        key={size}
                        onClick={() => { setAcPageSize(size); setAcCurrentPage(1); }}
                        className={`px-2 py-1 rounded text-xs transition-colors ${acPageSize === size ? 'bg-brand-blue/15 text-brand-blue-light font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                      >
                        {size}
                      </button>
                    ))}
                    <span>entries</span>
                    <span className="ml-2 text-text-tertiary">({totalFiltered} total)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAcCurrentPage(p => Math.max(1, p - 1))}
                      disabled={acCurrentPage <= 1}
                      className="px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - acCurrentPage) <= 1)
                      .map((page, idx, arr) => (
                        <span key={page}>
                          {idx > 0 && arr[idx - 1] !== page - 1 && <span className="text-text-tertiary px-1">…</span>}
                          <button
                            onClick={() => setAcCurrentPage(page)}
                            className={`px-2.5 py-1 rounded text-xs transition-colors ${acCurrentPage === page ? 'bg-brand-blue/15 text-brand-blue-light font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                          >
                            {page}
                          </button>
                        </span>
                      ))
                    }
                    <button
                      onClick={() => setAcCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={acCurrentPage >= totalPages}
                      className="px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══════════════════════ AD CHURN (Stacked Bar by Age + Cohort Analysis) ═══════════════════════ */}
      {activeTab === 'Ad Churn' && (
        <div className="space-y-4 sm:space-y-6 mx-1">
          {/* Shared Platform Toggle for both Ad Churn charts */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary font-medium shrink-0">Platform:</span>
            <div className="flex gap-1">
              {platforms.map(p => (
                <button key={p} onClick={() => setChurnPlatform(p)} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${churnPlatform === p ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Creative Age Analysis */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <span className="truncate">Churn & Retesting Control, Spend by Creative Age</span>
                <InfoTooltip metric="Ad Churn" />
              </h3>
            </div>
          <div className="flex gap-2 sm:gap-3 mb-4 flex-wrap">
            {churnAgeKeys.map((key, i) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: churnAgeColors[i] }} />
                <span className="text-xs text-text-secondary truncate">{key}</span>
              </div>
            ))}
          </div>
          <div className="min-h-[320px] sm:min-h-[380px]" style={{ width: '100%', height: '380px' }}>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={churnPlatformData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="displayMonth" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="spend" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatCurrencyValue(v)} />
                <YAxis yAxisId="cpa" orientation="right" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatCurrencyValue(v)} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }}
                  formatter={(value: any, name: any) => [formatCurrencyValue(value), name]}
                />
                <Bar yAxisId="spend" dataKey="Last 7 Days" stackId="churn" fill="#1e3a5f" />
                <Bar yAxisId="spend" dataKey="8-14 Days" stackId="churn" fill="#2563EB" />
                <Bar yAxisId="spend" dataKey="15-30 Days" stackId="churn" fill="#4A6BD6" />
                <Bar yAxisId="spend" dataKey="31-90 Days" stackId="churn" fill="#6B8DE8" />
                <Bar yAxisId="spend" dataKey="91-180 Days" stackId="churn" fill="#93B4F5" />
                <Bar yAxisId="spend" dataKey="180+ Days" stackId="churn" fill="#C5D8FB" radius={[3, 3, 0, 0]} />
                <Line yAxisId="cpa" type="monotone" dataKey="cpa" stroke="#EDBF63" strokeWidth={2} dot={{ fill: '#EDBF63', r: 4 }} name={churnCpaMode === 'cpa' ? 'CPA' : 'NCCPA'} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
            <div className="mt-4 bg-bg-elevated border border-border rounded-lg p-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="font-medium text-text-primary">Reading this chart:</span> Dark bars = newest ads (last 7 days). Lighter bars = older ads.
                Gold line = actual {churnCpaMode === 'cpa' ? 'CPA' : 'NCCPA'}.
                A healthy account shows new creative steadily taking over spend from older creative.
              </p>
            </div>
          </div>

          {/* Creative Launch Cohorts */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <span className="truncate">Creative Churn, Spend by Launch Cohort</span>
                <InfoTooltip metric="Creative Churn Cohorts" />
              </h3>
            </div>
            <div className="flex gap-2 sm:gap-3 mb-4 flex-wrap">
              {cohortKeys.map((key) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: cohortColors[key] }} />
                  <span className="text-xs text-text-secondary truncate">{cohortLabels[key]}</span>
                </div>
              ))}
            </div>
            <div className="min-h-[320px] sm:min-h-[380px]" style={{ width: '100%', height: '380px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredCohortData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="week" tick={{ fill: 'var(--color-text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatCurrencyValue(v)} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }}
                    formatter={(value: any, name: any) => [value > 0 ? formatCurrencyValue(value) : ',', cohortLabels[name] || name]}
                  />
                  <Area type="monotone" dataKey="oct" stackId="cohort" fill="#C5D8FB" stroke="#C5D8FB" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="nov" stackId="cohort" fill="#93B4F5" stroke="#93B4F5" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="dec" stackId="cohort" fill="#6B8DE8" stroke="#6B8DE8" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="jan" stackId="cohort" fill="#4A6BD6" stroke="#4A6BD6" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="feb" stackId="cohort" fill="#2563EB" stroke="#2563EB" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="mar" stackId="cohort" fill="#1e3a5f" stroke="#1e3a5f" fillOpacity={0.85} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 bg-bg-elevated border border-border rounded-lg p-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="font-medium text-text-primary">Key insight:</span> Watch how darker (newer) cohorts take over spend from lighter (older) ones.
                This is healthy creative rotation. If old cohorts still dominate spend, creative fatigue is building and performance will decline.
                This chart is the most critical for forecasting future performance.
              </p>
            </div>
          </div>
        </div>
      )}



      {/* ═══════════════════════ SLUGGING RATE (Production & Slugging Rate) ═══════════════════════ */}
      {activeTab === 'Slugging Rate' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex flex-col gap-3 mb-4">
            {/* Title row with CPA targets */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <span className="truncate">Production & Slugging Rate</span>
                  <InfoTooltip metric="Production Rate" />
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSluggingCpaMode('nccpa')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${sluggingCpaMode === 'nccpa' ? 'bg-brand-blue/15 text-brand-blue-light ring-1 ring-brand-blue/30' : 'bg-bg-elevated text-text-secondary border border-border hover:bg-bg-primary'}`}
                  >
                    <span className="text-text-tertiary">NC CPA Target:</span> <span className="font-semibold">{formatCurrencyValue(targetNCCPA)}</span>
                  </button>
                  <button 
                    onClick={() => setSluggingCpaMode('cpa')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${sluggingCpaMode === 'cpa' ? 'bg-brand-blue/15 text-brand-blue-light ring-1 ring-brand-blue/30' : 'bg-bg-elevated text-text-secondary border border-border hover:bg-bg-primary'}`}
                  >
                    <span className="text-text-tertiary">All CPA Target:</span> <span className="font-semibold">{formatCurrencyValue(targetCPA)}</span>
                  </button>
                </div>
              </div>
            </div>
            {/* Controls row: Platform + CPA toggle + Date range */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              {/* Platform buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary font-medium shrink-0">Platform:</span>
                <div className="flex gap-1">
                  {sluggingTabPlatforms.map(p => (
                    <button key={p} onClick={() => setSluggingPlatform(p)} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${sluggingPlatform === p ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {/* CPA Mode toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary font-medium shrink-0">Target:</span>
                <div className="flex bg-bg-elevated border border-border rounded-lg overflow-hidden">
                  <button onClick={() => setSluggingCpaMode('cpa')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${sluggingCpaMode === 'cpa' ? 'bg-brand-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}>
                    All Customers
                  </button>
                  <button onClick={() => setSluggingCpaMode('nccpa')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${sluggingCpaMode === 'nccpa' ? 'bg-brand-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}>
                    New Customers
                  </button>
                </div>
              </div>
              {/* Own date range (not global) */}
              <div className="flex items-center gap-2 sm:ml-auto">
                <span className="text-xs text-text-secondary font-medium shrink-0">Period:</span>
                <div className="flex gap-1">
                  {[1, 3, 6, 12, 24].map(m => (
                    <button key={m} onClick={() => setSluggingMonths(m)} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${sluggingMonths === m ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
                      {m}mo
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-brand-blue/30 shrink-0" />
              <span className="text-xs text-text-secondary">Launched (didn't scale)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#1e3a5f' }} />
              <span className="text-xs text-text-secondary">Hits (scaled profitably)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-warm-gold shrink-0" />
              <span className="text-xs text-text-secondary">Hit Rate %</span>
            </div>
          </div>
          <div className="min-h-[320px] sm:min-h-[380px]" style={{ width: '100%', height: '380px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredSlugging.map(d => ({ ...d, displayMonth: formatDateLabel(d.month, 'month') }))} margin={{ top: 20, right: 40, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="displayMonth" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} label={{ value: 'Ads', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 50]} label={{ value: 'Hit Rate', angle: 90, position: 'insideRight', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }}
                  formatter={(value: any, name: any) => {
                    if (name === 'hitRate') return [`${value.toFixed(1)}%`, 'Hit Rate'];
                    if (name === 'hits') return [value, 'Hits (Scaled)'];
                    return [value, 'Total Launched'];
                  }}
                />
                <Bar yAxisId="left" dataKey="launched" name="launched" fill="#4A6BD6" fillOpacity={0.25} radius={[3, 3, 0, 0]} />
                <Bar yAxisId="left" dataKey="hits" name="hits" fill="#1e3a5f" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="hitRate" name="hitRate" stroke="#EDBF63" strokeWidth={2.5} dot={{ fill: '#EDBF63', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="bg-bg-elevated border border-border rounded-lg p-3 text-center">
              <div className="text-xs text-text-secondary mb-1">Total Launched</div>
              <div className="text-xl font-bold text-text-primary">{totalSlugging.launched}</div>
            </div>
            <div className="bg-bg-elevated border border-border rounded-lg p-3 text-center">
              <div className="text-xs text-text-secondary mb-1">Total Hits</div>
              <div className="text-xl font-bold text-success">{totalSlugging.hits}</div>
            </div>
            <div className="bg-bg-elevated border border-border rounded-lg p-3 text-center">
              <div className="text-xs text-text-secondary mb-1">Overall Slugging Rate</div>
              <div className="text-xl font-bold text-warm-gold">{((totalSlugging.hits / totalSlugging.launched) * 100).toFixed(1)}%</div>
              <div className="text-xs text-text-tertiary mt-1">
                Target: 30% ({sluggingCpaMode === 'nccpa' ? 'NC' : 'All'} CPA: {formatCurrencyValue(sluggingCpaTarget)})
                <span className={`ml-2 ${
                  ((totalSlugging.hits / totalSlugging.launched) * 100) >= 30 
                    ? 'text-success' 
                    : ((totalSlugging.hits / totalSlugging.launched) * 100) >= 25 
                      ? 'text-warm-gold' 
                      : 'text-danger'
                }`}>
                  {((totalSlugging.hits / totalSlugging.launched) * 100) >= 30 
                    ? '✓ Above target' 
                    : ((totalSlugging.hits / totalSlugging.launched) * 100) >= 25 
                      ? '⚠ Close to target'
                      : '⚠ Below target'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ PARETO ═══════════════════════ */}
      {activeTab === 'Pareto' && (
        <div className="relative mx-1">
          {/* Coming Soon overlay */}
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-surface/60 backdrop-blur-sm rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary mb-2">Coming Soon</div>
              <div className="text-sm text-text-secondary">Pareto analysis will be available once creative data is connected.</div>
            </div>
          </div>
          <div className="space-y-4 sm:space-y-6 blur-[2px] pointer-events-none select-none">
          {/* Note: Google excluded */}
          {platform === 'Google' && (
            <div className="bg-warm-gold/10 border border-warm-gold/30 rounded-lg px-4 py-2 text-xs text-warm-gold">
              Google Search ads don't have creative angles. Showing all non-Google platforms combined.
            </div>
          )}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <span>Pareto by Creative Angle</span>
                <InfoTooltip metric="Pareto" />
              </h3>
              <span className="text-xs text-text-tertiary shrink-0">TripleWhale</span>
            </div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/30">
              <div className="text-xs text-text-tertiary">
                Sample data (Pareto not wired to live TW attribution)
              </div>
              <div className="text-xs text-text-tertiary">
                Platform: <strong className="text-text-secondary">{platform === 'Google' ? 'All (excl. Google)' : platform}</strong>
              </div>
            </div>
            <div className="min-h-[320px]">
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={paretoData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="angle" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                    label={{ value: 'Conversions', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                    label={{ value: 'Cumulative %', angle: 90, position: 'insideRight', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-primary)' }}
                    formatter={(value: any, name: any) => {
                      if (name === 'Spend') return [formatCurrencyValue(value), name];
                      if (name === 'Cumulative %') return [`${value}%`, name];
                      return [value, name];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="conversions" name="Conversions" fill="#4A6BD6" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cumPct" name="Cumulative %" stroke="#EDBF63" strokeWidth={2} dot={{ fill: '#EDBF63', r: 4 }} />
                  <ReferenceLine yAxisId="right" y={80} stroke="#EF4444" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: '80%', fill: '#EF4444', fontSize: 10, position: 'right' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Angle breakdown table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-text-tertiary font-medium">Angle</th>
                    <th className="text-right py-2 px-2 text-text-tertiary font-medium">Ads</th>
                    <th className="text-right py-2 px-2 text-text-tertiary font-medium">Conversions</th>
                    <th className="text-right py-2 px-2 text-text-tertiary font-medium">% of Total</th>
                    <th className="text-right py-2 px-2 text-text-tertiary font-medium">Spend</th>
                    <th className="text-right py-2 px-2 text-text-tertiary font-medium">Cum. %</th>
                  </tr>
                </thead>
                <tbody>
                  {paretoData.map((d) => (
                    <tr key={d.angle} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                      <td className="py-2 px-2 text-text-primary font-medium">{d.angle}</td>
                      <td className="py-2 px-2 text-right text-text-secondary">{d.ads}</td>
                      <td className="py-2 px-2 text-right text-text-secondary">{d.conversions}</td>
                      <td className="py-2 px-2 text-right text-text-secondary">{paretoTotal > 0 ? ((d.conversions / paretoTotal) * 100).toFixed(1) : 0}%</td>
                      <td className="py-2 px-2 text-right text-text-secondary">{formatCurrencyValue(d.spend)}</td>
                      <td className="py-2 px-2 text-right font-semibold text-warm-gold">{d.cumPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-warm-gold/5 border border-warm-gold/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-warm-gold">80/20 Rule — Angle Analysis</div>
              <InfoTooltip metric="Pareto 80/20 Analysis" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-text-secondary mb-1">Total Angles</div>
                <div className="text-lg font-bold text-text-primary">{paretoData.length}</div>
              </div>
              <div>
                <div className="text-text-secondary mb-1">Angles driving 80%+ conversions</div>
                <div className="text-lg font-bold text-warm-gold">{paretoData.filter(d => d.cumPct <= 80 || (paretoData.indexOf(d) === 0)).length}</div>
              </div>
              <div>
                <div className="text-text-secondary mb-1">Top angle share</div>
                <div className="text-lg font-bold text-brand-blue">{paretoData[0] ? `${paretoData[0].angle} (${paretoTotal > 0 ? ((paretoData[0].conversions / paretoTotal) * 100).toFixed(0) : 0}%)` : '—'}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-text-secondary">
              <strong>Action:</strong> Identify winning angles and produce more variations within those themes. Kill angles that contribute &lt;5% of conversions and reallocate budget to top performers.
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ═══════════════════════ DEMOGRAPHICS ═══════════════════════ */}
      {activeTab === 'Demographics' && (
        <div className="space-y-4 sm:space-y-6 mx-1">
          {/* Age Group Performance */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <span>Performance by Age Group</span>
                <InfoTooltip metric="Demographics Analysis" />
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary font-medium">Gender:</span>
                  <div className="flex gap-1">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'male', label: 'Male' },
                      { key: 'female', label: 'Female' }
                    ].map(g => (
                      <button key={g.key} onClick={() => setGenderFilter(g.key)} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${genderFilter === g.key ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-text-tertiary shrink-0">{platform} Ads</span>
              </div>
            </div>
            {platform === 'Google' ? (
              <div className="text-center py-8 text-text-secondary">
                <div className="text-sm font-medium mb-2">Google Ads Demographics Data</div>
                <div className="text-xs">Demographic data not available for Google Ads platform.<br />This feature requires Google Ads demographic API integration.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {getFilteredDemographicsAge().map((row) => (
                <div key={row.group} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-12 text-xs text-text-secondary font-medium shrink-0">{row.group}</div>
                  <div className="flex-1 h-8 bg-bg-elevated rounded-md overflow-hidden relative min-w-0">
                    <div
                      className="h-full rounded-md transition-all"
                      style={{
                        width: `${(row.conversions / 248) * 100}%`,
                        backgroundColor: row.cpa <= 700 ? '#10B981' : row.cpa <= 800 ? '#EDBF63' : '#EF4444',
                        opacity: 0.8,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 sm:px-3 justify-between">
                      <span className="text-xs font-medium text-text-primary truncate">{row.conversions} conv.</span>
                      <span className={`text-xs font-medium shrink-0 ${row.cpa <= 700 ? 'text-success' : row.cpa <= 800 ? 'text-warm-gold' : 'text-danger'}`}>{formatCurrencyValue(row.cpa)} CPA</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Gender Breakdown */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-text-primary">Performance by Gender</h3>
              <span className="text-xs text-text-tertiary shrink-0">{platform} Ads</span>
            </div>
            {platform === 'Google' ? (
              <div className="text-center py-8 text-text-secondary">
                <div className="text-sm font-medium mb-2">Google Ads Demographics Data</div>
                <div className="text-xs">Gender breakdown not available for Google Ads platform.<br />This feature requires Google Ads demographic API integration.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {getFilteredDemographicsGender().map((row) => (
                  <div key={row.gender} className="bg-bg-elevated border border-border rounded-lg p-4">
                    <div className="text-sm font-medium text-text-primary mb-3">{row.gender}</div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-text-secondary">Spend</span><span className="text-text-primary font-medium">{formatCurrencyValue(row.spend)}</span></div>
                      <div className="flex justify-between"><span className="text-text-secondary">Conversions</span><span className="text-text-primary font-medium">{row.conversions} ({row.pctConversions}%)</span></div>
                      <div className="flex justify-between"><span className="text-text-secondary">CPA</span><span className={row.cpa <= 700 ? 'text-success font-medium' : row.cpa <= 800 ? 'text-warm-gold font-medium' : 'text-danger font-medium'}>{formatCurrencyValue(row.cpa)}</span></div>
                      <div className="flex justify-between"><span className="text-text-secondary">ROAS</span><span className={row.roas >= 3.0 ? 'text-success font-medium' : 'text-warm-gold font-medium'}>{row.roas.toFixed(2)}x</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gender+Age stacked bars over time — one gender at a time */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
              <h3 className="text-sm font-medium text-text-primary">Spend by Age Over Time</h3>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1 rounded-lg border border-border overflow-hidden bg-bg-elevated">
                  <button
                    type="button"
                    onClick={() => setDemoSpendGender('male')}
                    className={`px-2.5 py-1 text-[10px] sm:text-xs font-medium transition-colors ${
                      demoSpendGender === 'male'
                        ? 'bg-brand-blue text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoSpendGender('female')}
                    className={`px-2.5 py-1 text-[10px] sm:text-xs font-medium transition-colors ${
                      demoSpendGender === 'female'
                        ? 'bg-brand-blue text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Female
                  </button>
                </div>
                <span className="text-xs text-text-tertiary shrink-0">{platform} Ads</span>
              </div>
            </div>
            <div className="flex gap-1 sm:gap-2 mb-4 flex-wrap">
              {demoSpendChartSeries.keys.map((key, i) => (
                <div key={key} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: demoSpendChartSeries.colors[i] }} />
                  <span className="text-[10px] text-text-secondary">{key}</span>
                </div>
              ))}
            </div>
            {platform === 'Google' ? (
              <div className="text-center py-16 text-text-secondary min-h-[320px] flex flex-col justify-center">
                <div className="text-sm font-medium mb-2">Google Ads Demographics Data</div>
                <div className="text-xs">Demographic timeline data not available for Google Ads platform.<br />This feature requires Google Ads demographic API integration.</div>
              </div>
            ) : (
              <div className="min-h-[320px]" style={{ width: '100%', height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredDemographicsGenderAge} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="displayLabel" tick={{ fill: 'var(--color-text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" height={60} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatCurrencyValue(v)} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11, color: 'var(--color-text-primary)' }}
                      formatter={(value: any, name: any) => [formatCurrencyValue(value), name]}
                    />
                    {demoSpendChartSeries.keys.map((key, i, arr) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="demo"
                        fill={demoSpendChartSeries.colors[i]}
                        radius={i === arr.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ OTHER TABS (Placeholder) — COMMENTED OUT per Indro ═══════════════════════ */}
      {/* {!['Performance', 'Pareto', 'Account Control', 'Ad Churn', 'Top Creatives', 'Demographics', 'Slugging Rate'].includes(activeTab) && (
        <div className="bg-bg-surface border border-border rounded-lg p-8 sm:p-12 text-center mx-1">
          <div className="text-text-secondary text-sm">{activeTab} view</div>
          <div className="text-text-secondary text-xs mt-1">Data will populate when connected to live sources</div>
        </div>
      )} */}



      {/* AI Suggestions */}
      <div className="px-1">
        <AISuggestionsPanel 
          suggestions={getDynamicAISuggestions()} 
          title={getAITitle(activeTab)}
          promptId={getAIPromptId(activeTab)}
          pageLabel="Creative & MTA"
          analysisContext={creativeAnalysisContext}
        />
      </div>
    </div>
  );
}
