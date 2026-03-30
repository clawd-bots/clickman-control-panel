'use client';
import { useState, useMemo, useCallback } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { useDateRange } from '@/components/DateProvider';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import {
  creativePerformance, creativeAISuggestions,
  accountControlData, adChurnDataByPlatform, adChurnCampaigns, creativeChurnCohorts,
  productionSlugging, demographicsAge, demographicsGender, demographicsGenderAge,
  targets,
} from '@/lib/sample-data';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/components/CurrencyProvider';
import { filterByDateRange, formatDateLabel } from '@/lib/dateUtils';
import { ChevronDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ReferenceLine, ZAxis, Legend,
  AreaChart, Area, LineChart, Line, ComposedChart,
} from 'recharts';

const tabs = ['Performance', 'Ad Churn', 'Account Control', 'Slugging Rate', 'Pareto', 'Demographics'];
const platforms = ['Meta', 'TikTok', 'Reddit', 'Google'];

const tabDescriptions: Record<string, string> = {
  'Performance': 'Overview of all active ad creatives with spend, engagement, and conversion metrics. Use this to monitor your live ads and spot issues quickly.',
  'Ad Churn': 'Shows how ad spend is distributed across creative age brackets and launch cohorts. Dark = newest ads/cohorts, lighter = older. A healthy account has a steady flow of new creative taking over spend from older creative.',
  'Account Control': 'Scatter plot of CPA vs Spend per ad. Bottom-right = winners scaling efficiently. Top-right = "zombies" burning budget. The horizontal line is your CPA target. The vertical line separates testing from scaled ads.',
  'Slugging Rate': 'Production & Slugging Rate, tracks your "at bats" vs "hits." Bars show ads launched per month. Dark sections show how many actually scaled. If you launch many ads and none scale, you have a creative strategy problem, not a media buying problem.',

  'Pareto': 'The 80/20 principle applied to ad creatives. Usually 20% of creatives drive 80% of results. Use this to identify your winners and stop spreading budget too thin.',
  'Demographics': 'Are you producing for the audience that is actually buying? If women 25-34 drive your profit but you keep producing TikTok-style ads for Gen Z, you\'re burning cash. Align your production queue with your paying demographic.',
};

const attributionModels = ['Linear All', 'Linear Paid'];
const attributionWindows = ['1-day click', '7-day click', '14-day click', '28-day click', '7-day click / 1-day view', '28-day click / 1-day view', '28-day click / 28-day view'];

// Zone colors for account control scatter
const zoneColors: Record<string, string> = { scaling: '#10B981', zombie: '#EF4444', testing: '#4A6BD6', untapped: '#EDBF63' };
const zoneLabels: Record<string, string> = { scaling: 'Scaling (Winners)', zombie: 'Zombies (Kill)', testing: 'Testing', untapped: 'Untapped Winners' };

// Churn age colors (dark → light for new → old)
const churnAgeColors = ['#1e3a5f', '#2563EB', '#4A6BD6', '#6B8DE8', '#93B4F5', '#C5D8FB'];
const churnAgeKeys = ['Last 7 Days', '8-14 Days', '15-30 Days', '31-90 Days', '91-180 Days', '180+ Days'];

// Cohort colors (light = old → dark = new)
const cohortColors = { oct: '#C5D8FB', nov: '#93B4F5', dec: '#6B8DE8', jan: '#4A6BD6', feb: '#2563EB', mar: '#1e3a5f' };
const cohortKeys = ['oct', 'nov', 'dec', 'jan', 'feb', 'mar'] as const;
const cohortLabels: Record<string, string> = { oct: 'Oct Creatives', nov: 'Nov Creatives', dec: 'Dec Creatives', jan: 'Jan Creatives', feb: 'Feb Creatives', mar: 'Mar Creatives' };

// Demographics stacked area colors
const demoKeys = ['F 18-24', 'F 25-34', 'F 35-44', 'F 45-54', 'F 55+', 'M 18-24', 'M 25-34', 'M 35-44', 'M 45-54', 'M 55+'];
const demoColors = ['#fca5a5', '#ef4444', '#dc2626', '#b91c1c', '#7f1d1d', '#93c5fd', '#3b82f6', '#2563eb', '#1d4ed8', '#1e3a8a'];

// Function to get tab-specific AI analysis title
function getAITitle(tab: string): string {
  const aiTitles: Record<string, string> = {
    'Performance': 'Performance Intelligence',
    'Ad Churn': 'Ad Churn Intelligence',
    'Account Control': 'Account Control Intelligence', 
    'Slugging Rate': 'Slugging Rate Intelligence',
    'Creative Launches': 'Creative Launch Analysis',
    'Pareto': 'Pareto Analysis Intelligence',
    'Demographics': 'Demographics Intelligence',
  };
  return aiTitles[tab] || 'Creative Intelligence';
}

export default function CreativePage() {
  const { currency, convertValue } = useCurrency();
  const { dateRange } = useDateRange();
  const [activeTab, setActiveTab] = useState('Performance');
  const [platform, setPlatform] = useState('Meta');
  const [attrModel, setAttrModel] = useState('Linear All');
  const [attrWindow, setAttrWindow] = useState('7-day click / 1-day view');
  const [accountControlFilter, setAccountControlFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [genderFilter, setGenderFilter] = useState('all');
  const [churnCpaMode, setChurnCpaMode] = useState<'cpa' | 'nccpa'>('cpa');
  const [churnCampaignFilter, setChurnCampaignFilter] = useState('all');

  // ─── Ad Churn derived data ───
  const churnPlatformData = useMemo(() => {
    const raw = adChurnDataByPlatform[platform] || adChurnDataByPlatform.Meta;
    const filtered = filterByDateRange(raw, 'month', dateRange.startDate, dateRange.endDate);
    const data = filtered.length > 0 ? filtered : raw;
    return data.map(d => ({ ...d, displayMonth: formatDateLabel(d.month, 'month') }));
  }, [platform, dateRange]);
  const churnCampaignsForPlatform = useMemo(() => {
    const campaigns = adChurnCampaigns[platform] || [];
    return campaigns.filter(c => c.status === 'Active');
  }, [platform]);
  const churnFilteredCampaigns = useMemo(() => {
    if (churnCampaignFilter === 'all') return churnCampaignsForPlatform;
    return churnCampaignsForPlatform.filter(c => c.campaign === churnCampaignFilter);
  }, [churnCampaignsForPlatform, churnCampaignFilter]);

  // Target CPA values from targets
  const targetCPA = useMemo(() => targets.find(t => t.metric === 'CAC')?.target || 500, []);
  const targetNCCPA = useMemo(() => targets.find(t => t.metric === 'nCAC')?.target || 750, []);
  const churnCpaTarget = churnCpaMode === 'cpa' ? targetCPA : targetNCCPA;

  // Wasted spend: spend on ads above CPA target
  const wastedSpend = useMemo(() => {
    const target = churnCpaMode === 'cpa' ? targetCPA : targetNCCPA;
    return churnFilteredCampaigns.reduce((total, c) => {
      const cpa = churnCpaMode === 'cpa' ? c.cpa : c.ncCpa;
      if (cpa > target) return total + c.spend;
      return total;
    }, 0);
  }, [churnFilteredCampaigns, churnCpaMode, targetCPA, targetNCCPA]);

  const totalChurnSpend = useMemo(() => churnFilteredCampaigns.reduce((t, c) => t + c.spend, 0), [churnFilteredCampaigns]);

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
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
        `Horizontal line at ${formatCurrencyValue(787)} is your CPA target. Vertical line at ${formatCurrencyValue(20000)} separates testing from scale.`,
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
  }, [activeTab, platform, campaignFilter, formatCurrencyValue]);

  // Get active campaign names for the selected platform
  const activeCampaigns = useMemo(() => {
    const campaigns = creativePerformance
      .filter(c => c.platform === platform && c.status === 'Active')
      .map(c => (c as any).campaignName as string)
      .filter(Boolean);
    return [...new Set(campaigns)];
  }, [platform]);

  // Reset selected campaigns when platform changes
  const handlePlatformChange = (p: string) => {
    setPlatform(p);
    setSelectedCampaigns([]);
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

  const totalSlugging = productionSlugging.reduce((a, b) => ({ launched: a.launched + b.launched, hits: a.hits + b.hits }), { launched: 0, hits: 0 });

  // Filter demographics data based on gender selection
  const getFilteredDemographicsAge = () => {
    if (genderFilter === 'all') {
      return demographicsAge;
    }
    // For demo purposes, create filtered data based on gender selection
    // In a real app, this would be from separate male/female datasets
    const multiplier = genderFilter === 'male' ? 0.4 : 0.6; // Simulate gender distribution
    return demographicsAge.map(row => ({
      ...row,
      conversions: Math.round(row.conversions * multiplier),
      spend: Math.round(row.spend * multiplier)
    }));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h2 className="text-lg sm:text-xl font-semibold">Creative & MTA Control Panel</h2>
        <span className="text-xs text-text-tertiary">
          {dateRange.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {dateRange.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-1.5 flex-wrap px-1">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-w-0 ${activeTab === tab ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
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
          {!['Slugging Rate'].includes(activeTab) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium shrink-0">Platform:</span>
              <div className="flex gap-1 flex-wrap">
                {platforms.map(p => (
                  <button key={p} onClick={() => handlePlatformChange(p)} className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${platform === p ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!['Slugging Rate'].includes(activeTab) && (
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

      {/* ═══════════════════════ PERFORMANCE TAB ═══════════════════════ */}
      {activeTab === 'Performance' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary">Creative Performance</h3>
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <span>[TripleWhale]</span>
              <span>+</span>
              <span>[{platform}]</span>
            </div>
          </div>
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
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <span className="truncate">Account Control, CPA vs Spend</span>
                <InfoTooltip metric="Account Control Chart" />
              </h3>
              <span className="text-xs text-text-tertiary shrink-0">TripleWhale</span>
            </div>
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
                  Campaigns above {churnCpaMode === 'cpa' ? 'CPA' : 'NCCPA'} target of {formatCurrencyValue(churnCpaTarget)}
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
          <div className="min-h-[320px] sm:min-h-[450px]" style={{ width: '100%', height: '450px' }}>
            <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 50, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="number" dataKey="spend" name="Spend"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                tickFormatter={(v) => formatCurrencyValue(v).replace('$', '$').replace(',', '')}
                domain={[0, 60000]}
                interval={0}
                tickCount={6}
                label={{ value: 'Total Spend', position: 'insideBottom', offset: -15, style: { fill: 'var(--color-text-tertiary)', fontSize: 11, textAnchor: 'middle' } }}
              />
              <YAxis
                type="number" dataKey="cpa" name="CPA"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                tickFormatter={(v) => formatCurrencyValue(v).replace('$', '$').replace(',', '')}
                domain={[200, 1500]}
                tickCount={7}
                label={{ value: 'CPA', angle: -90, position: 'insideLeft', offset: 10, style: { fill: 'var(--color-text-tertiary)', fontSize: 11, textAnchor: 'middle' } }}
              />
              <ZAxis type="number" range={[80, 200]} />
              <ReferenceLine y={787} stroke="#EF4444" strokeDasharray="6 4" strokeWidth={2} label={{ value: `CPA Target ${formatCurrencyValue(787)}`, position: 'right', style: { fill: '#EF4444', fontSize: 10, fontWeight: 600 } }} />
              <ReferenceLine x={20000} stroke="var(--color-text-tertiary)" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Scale threshold', position: 'top', style: { fill: 'var(--color-text-tertiary)', fontSize: 10 } }} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ 
                  background: 'var(--color-bg-surface)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 8, 
                  fontSize: 12,
                  padding: '8px 12px'
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
                            <span className="text-text-secondary">CPA (Y-axis):</span>
                            <span className="text-text-primary font-medium">{formatCurrencyValue(data.cpa)}</span>
                          </div>
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
                              {data.zone === 'scaling' ? 'Scaling' :
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
                data={accountControlData} 
                name="Ads"
                onClick={(data) => {
                  if (data && data.payload && data.payload.previewUrl) {
                    window.open(data.payload.previewUrl, '_blank');
                  }
                }}
              >
                {accountControlData.map((entry, i) => (
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
          {/* Quadrant labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="bg-success/5 border border-success/20 rounded-lg p-3">
              <div className="text-xs font-medium text-success mb-1">↘ Bottom-Right: Scaling</div>
              <div className="text-xs text-text-secondary">High spend, low CPA. Your proven winners. Scale these harder.</div>
            </div>
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-3">
              <div className="text-xs font-medium text-danger mb-1">↗ Top-Right: Zombies</div>
              <div className="text-xs text-text-secondary">High spend, high CPA. Wasting budget. Kill or restructure immediately.</div>
            </div>
            <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-lg p-3">
              <div className="text-xs font-medium text-brand-blue-light mb-1">↙ Bottom-Left: Testing</div>
              <div className="text-xs text-text-secondary">Low spend, low CPA. Promising tests. Scale up to confirm they hold.</div>
            </div>
            <div className="bg-warm-gold/5 border border-warm-gold/20 rounded-lg p-3">
              <div className="text-xs font-medium text-warm-gold mb-1">↖ Top-Left: Untapped / Learning</div>
              <div className="text-xs text-text-secondary">Low spend, high CPA. Still in learning phase or needs new creative approach.</div>
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
                  onClick={() => setAccountControlFilter('all')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    accountControlFilter === 'all'
                      ? 'bg-brand-blue text-white'
                      : 'bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setAccountControlFilter('scaling')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    accountControlFilter === 'scaling'
                      ? 'bg-success text-white'
                      : 'bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                  }`}
                >
                  Scale
                </button>
                <button
                  onClick={() => setAccountControlFilter('testing')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    accountControlFilter === 'testing'
                      ? 'bg-brand-blue text-white'
                      : 'bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                  }`}
                >
                  Testing
                </button>
                <button
                  onClick={() => setAccountControlFilter('zombie')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    accountControlFilter === 'zombie'
                      ? 'bg-danger text-white'
                      : 'bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                  }`}
                >
                  Zombies
                </button>
                <button
                  onClick={() => setAccountControlFilter('untapped')}
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
              <div className="min-w-[700px]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-secondary uppercase">
                      <th className="text-left py-2 px-2 font-medium min-w-[80px]">Color</th>
                      <th className="text-left py-2 px-2 font-medium min-w-[160px]">Ad Name</th>
                      <th className="text-center py-2 px-2 font-medium min-w-[80px]">Platform</th>
                      <th className="text-right py-2 px-2 font-medium min-w-[80px]">Spend</th>
                      <th className="text-right py-2 px-2 font-medium min-w-[80px]">CPA</th>
                      <th className="text-right py-2 px-2 font-medium min-w-[70px]">NCCPA</th>
                      <th className="text-right py-2 px-2 font-medium min-w-[60px]">ROAS</th>
                      <th className="text-right py-2 px-2 font-medium min-w-[70px]">NCROAS</th>
                      <th className="text-center py-2 px-2 font-medium min-w-[70px]">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountControlData
                      .filter(ad => ad.platform === platform)
                      .filter(ad => accountControlFilter === 'all' || ad.zone === accountControlFilter)
                      .sort((a, b) => b.spend - a.spend)
                      .map((ad) => (
                      <tr key={ad.name} className="border-b border-border/30 hover:bg-bg-elevated/50 transition-colors">
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border border-black/10" 
                              style={{ backgroundColor: zoneColors[ad.zone] }}
                            />
                            <span className="text-xs text-text-tertiary">
                              {ad.zone === 'scaling' ? 'Scale' :
                               ad.zone === 'zombie' ? 'Kill' :
                               ad.zone === 'testing' ? 'Test' : 'Learn'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 font-medium text-text-primary">
                          <div className="max-w-[150px] truncate" title={ad.name}>
                            {ad.name}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-text-secondary">
                          {ad.platform}
                        </td>
                        <td className="py-2.5 px-2 text-right text-text-secondary">
                          {formatCurrencyValue(ad.spend)}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className={ad.cpa <= 700 ? 'text-success' : ad.cpa <= 850 ? 'text-warm-gold' : 'text-danger'}>
                            {formatCurrencyValue(ad.cpa)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right text-text-secondary">
                          {((ad as any).frequency || 1.3).toFixed(1)}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className={((ad as any).nccpa || ad.cpa * 0.75) <= 525 ? 'text-success' : ((ad as any).nccpa || ad.cpa * 0.75) <= 638 ? 'text-warm-gold' : 'text-danger'}>
                            {formatCurrencyValue((ad as any).nccpa || ad.cpa * 0.75)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className={((ad as any).roas || 2.8) >= 3.0 ? 'text-success' : ((ad as any).roas || 2.8) >= 2.5 ? 'text-warm-gold' : 'text-danger'}>
                            {((ad as any).roas || 2.8).toFixed(2)}x
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className={((ad as any).ncroas || ((ad as any).roas || 2.8) * 0.8) >= 2.4 ? 'text-success' : ((ad as any).ncroas || ((ad as any).roas || 2.8) * 0.8) >= 2.0 ? 'text-warm-gold' : 'text-danger'}>
                            {((ad as any).ncroas || ((ad as any).roas || 2.8) * 0.8).toFixed(2)}x
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button 
                            onClick={() => window.open(`/api/ad-preview/${ad.name.replace(/\s+/g, '-').toLowerCase()}`, '_blank')}
                            className="text-brand-blue-light hover:text-brand-blue text-xs font-medium px-2 py-1 rounded-md border border-brand-blue/30 hover:border-brand-blue/50 transition-colors"
                            title="Preview ad creative, headline, and performance metrics"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ AD CHURN (Stacked Bar by Age + Cohort Analysis) ═══════════════════════ */}
      {activeTab === 'Ad Churn' && (
        <div className="space-y-4 sm:space-y-6 mx-1">
          {/* Creative Age Analysis */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <span className="truncate">Churn & Retesting Control, Spend by Creative Age</span>
                <InfoTooltip metric="Ad Churn" />
              </h3>
              <span className="text-xs text-text-tertiary shrink-0">TripleWhale</span>
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
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: any, name: any) => [formatCurrencyValue(value), name]}
                />
                <Bar yAxisId="spend" dataKey="Last 7 Days" stackId="churn" fill="#1e3a5f" />
                <Bar yAxisId="spend" dataKey="8-14 Days" stackId="churn" fill="#2563EB" />
                <Bar yAxisId="spend" dataKey="15-30 Days" stackId="churn" fill="#4A6BD6" />
                <Bar yAxisId="spend" dataKey="31-90 Days" stackId="churn" fill="#6B8DE8" />
                <Bar yAxisId="spend" dataKey="91-180 Days" stackId="churn" fill="#93B4F5" />
                <Bar yAxisId="spend" dataKey="180+ Days" stackId="churn" fill="#C5D8FB" radius={[3, 3, 0, 0]} />
                <Line yAxisId="cpa" type="monotone" dataKey="cpa" stroke="#EDBF63" strokeWidth={2} dot={{ fill: '#EDBF63', r: 4 }} name={churnCpaMode === 'cpa' ? 'CPA' : 'NCCPA'} />
                <ReferenceLine yAxisId="cpa" y={churnCpaTarget} stroke="#EF4444" strokeDasharray="6 4" strokeWidth={2} label={{ value: `${churnCpaMode === 'cpa' ? 'CPA' : 'NCCPA'} Target`, fill: '#EF4444', fontSize: 10, position: 'right' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
            <div className="mt-4 bg-bg-elevated border border-border rounded-lg p-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="font-medium text-text-primary">Reading this chart:</span> Dark bars = newest ads (last 7 days). Lighter bars = older ads.
                Gold line = actual {churnCpaMode === 'cpa' ? 'CPA' : 'NCCPA'}. Red dotted line = target ({formatCurrencyValue(churnCpaTarget)} from Targets & Goals).
                A healthy account shows new creative steadily taking over spend from older creative while keeping CPA below target.
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
              <span className="text-xs text-text-tertiary shrink-0">TripleWhale</span>
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
                <AreaChart data={creativeChurnCohorts} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="week" tick={{ fill: 'var(--color-text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatCurrencyValue(v)} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <span className="truncate">Production & Slugging Rate</span>
              <InfoTooltip metric="Production Rate" />
            </h3>
            <span className="text-xs text-text-tertiary shrink-0">TripleWhale</span>
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
              <ComposedChart data={productionSlugging.map(d => ({ ...d, displayMonth: formatDateLabel(d.month, 'month') }))} margin={{ top: 20, right: 40, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="displayMonth" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} label={{ value: 'Ads', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 50]} label={{ value: 'Hit Rate', angle: 90, position: 'insideRight', style: { fill: 'var(--color-text-tertiary)', fontSize: 11 } }} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
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
                Target: 30% (Target CPA: {formatCurrencyValue(750)})
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
        <div className="space-y-4 sm:space-y-6 mx-1">
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
                Attribution: <strong className="text-text-secondary">{attrModel}</strong> • Window: <strong className="text-text-secondary">{attrWindow}</strong>
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
                    contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
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
                  <div className="w-12 sm:w-16 text-right text-xs text-text-secondary shrink-0">{row.roas.toFixed(2)}x</div>
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
                {demographicsGender.map((row) => (
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

          {/* Gender+Age Stacked Area over time */}
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-primary">Spend by Gender & Age Over Time</h3>
              <span className="text-xs text-text-tertiary shrink-0">{platform} Ads</span>
            </div>
            <div className="flex gap-1 sm:gap-2 mb-4 flex-wrap">
              {demoKeys.map((key, i) => (
                <div key={key} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: demoColors[i] }} />
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
                  <BarChart data={demographicsGenderAge} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="week" tick={{ fill: 'var(--color-text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" height={60} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatCurrencyValue(v)} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }}
                      formatter={(value: any, name: any) => [formatCurrencyValue(value), name]}
                    />
                    <Bar dataKey="F 18-24" stackId="demo" fill="#fca5a5" />
                    <Bar dataKey="F 25-34" stackId="demo" fill="#ef4444" />
                    <Bar dataKey="F 35-44" stackId="demo" fill="#dc2626" />
                    <Bar dataKey="F 45-54" stackId="demo" fill="#b91c1c" />
                    <Bar dataKey="F 55+" stackId="demo" fill="#7f1d1d" />
                    <Bar dataKey="M 18-24" stackId="demo" fill="#93c5fd" />
                    <Bar dataKey="M 25-34" stackId="demo" fill="#3b82f6" />
                    <Bar dataKey="M 35-44" stackId="demo" fill="#2563eb" />
                    <Bar dataKey="M 45-54" stackId="demo" fill="#1d4ed8" />
                    <Bar dataKey="M 55+" stackId="demo" fill="#1e3a8a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ OTHER TABS (Placeholder) ═══════════════════════ */}
      {!['Performance', 'Pareto', 'Account Control', 'Ad Churn', 'Top Creatives', 'Demographics'].includes(activeTab) && (
        <div className="bg-bg-surface border border-border rounded-lg p-8 sm:p-12 text-center mx-1">
          <div className="text-text-secondary text-sm">{activeTab} view</div>
          <div className="text-text-secondary text-xs mt-1">Data will populate when connected to live sources</div>
        </div>
      )}



      {/* AI Suggestions */}
      <div className="px-1">
        <AISuggestionsPanel 
          suggestions={getDynamicAISuggestions()} 
          title={getAITitle(activeTab)}
          attributionModel={['Top Creatives', 'Ad Churn'].includes(activeTab) ? undefined : attrModel}
          attributionWindow={['Top Creatives', 'Ad Churn'].includes(activeTab) ? undefined : attrWindow}
        />
      </div>
    </div>
  );
}
