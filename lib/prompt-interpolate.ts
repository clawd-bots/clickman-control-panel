import { toLocalDateString } from '@/lib/dateUtils';
import { getComparisonDateRange } from '@/lib/comparison-range';

/**
 * Optional tokens in stored prompt templates, filled at analysis time from date + currency context.
 */
export type PromptRuntimeVars = {
  DATE_RANGE: string;
  CURRENCY: string;
  EXCHANGE_RATE: string;
  /** IANA timezone from GA4 Data API (property reporting timezone). */
  GA4_REPORTING_TIMEZONE?: string;
  /** YYYY-MM-DD for "today" in GA4_REPORTING_TIMEZONE. */
  GA4_TODAY_IN_REPORTING_TZ?: string;
  /** Human label for the comparison period selected in the TopBar (or disabled). */
  COMPARISON_PERIOD?: string;
  ATTRIBUTION_MODEL?: string;
  ATTRIBUTION_WINDOW?: string;
  PLATFORM?: string;
  CAMPAIGN_FILTER?: string;
  STRATEGY_FILTER?: string;
  ZONE_FILTER?: string;
  CPA_TARGET?: string;
  METRIC_MODE?: string;
  DISPLAY_MODE?: string;
  FORMAT?: string;
  MER_TARGET?: string;
  AMER_TARGET?: string;
  NCAC_TARGET?: string;
  LTV_CAC_RATIO?: string;
};

export function buildComparisonPeriodLabel(params: {
  startDate: Date;
  endDate: Date;
  comparison: string;
  comparisonEnabled: boolean;
  comparisonCustomStart?: Date | null;
  comparisonCustomEnd?: Date | null;
}): string {
  const {
    startDate,
    endDate,
    comparison,
    comparisonEnabled,
    comparisonCustomStart,
    comparisonCustomEnd,
  } = params;
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (!comparisonEnabled) {
    return 'Comparison disabled in the TopBar.';
  }
  if (comparison === 'none') {
    return 'No comparison selected (comparison mode is none). KPI deltas use the selected baseline when comparison is enabled.';
  }

  const range = getComparisonDateRange({
    startDate,
    endDate,
    comparison,
    comparisonEnabled,
    comparisonCustomStart: comparisonCustomStart ?? null,
    comparisonCustomEnd: comparisonCustomEnd ?? null,
  });

  if (!range) {
    return 'Custom comparison: set start and end dates in the TopBar vs dropdown.';
  }

  if (comparison === 'prev-period') {
    return `Previous period (${fmt(range.start)} to ${fmt(range.end)}) — same length as the report range, ending the day before it starts.`;
  }

  if (comparison === 'prev-year') {
    return `Same period last year (${fmt(range.start)} to ${fmt(range.end)}).`;
  }

  return `Custom baseline (${fmt(range.start)} to ${fmt(range.end)})`;
}

export function fillPromptTemplate(template: string, vars: Partial<PromptRuntimeVars>): string {
  let s = template;
  for (const [key, val] of Object.entries(vars) as [keyof PromptRuntimeVars, string | undefined][]) {
    if (val === undefined || val === null) continue;
    const token = `{{${String(key)}}}`;
    s = s.split(token).join(val);
  }
  return s;
}

/** Merge TopBar + currency + page analysis context into template tokens for AI Intelligence. */
export function buildFullPromptRuntimeVars(params: {
  dateRange: {
    startDate: Date;
    endDate: Date;
    comparison: string;
    comparisonEnabled: boolean;
    comparisonCustomStart?: Date | null;
    comparisonCustomEnd?: Date | null;
  };
  currencyLabel: string;
  exchangeRate: number;
  analysisContext: Record<string, unknown>;
  dateRangeLabel: string;
}): PromptRuntimeVars {
  const { dateRange, currencyLabel, exchangeRate, analysisContext: ctx, dateRangeLabel } = params;

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = ctx[k];
      if (v !== undefined && v !== null && String(v) !== '') return String(v);
    }
    return '—';
  };

  const ga4TzRaw =
    typeof ctx['ga4ReportingTimeZone'] === 'string' ? ctx['ga4ReportingTimeZone'] : '';
  const ga4Today =
    typeof ctx['ga4TodayInReportingTimeZone'] === 'string'
      ? ctx['ga4TodayInReportingTimeZone']
      : toLocalDateString(new Date());

  const kpis = ctx['kpis'] as Record<string, unknown> | undefined;
  const ltvCac =
    kpis && typeof kpis['cacLtvRatio'] === 'number' && Number.isFinite(kpis['cacLtvRatio'])
      ? Number(kpis['cacLtvRatio']).toFixed(2)
      : pick('ltvCacRatio');

  const th = ctx['targetHints'] as Record<string, unknown> | undefined;
  const merT = th && th['mer'] != null && String(th['mer']) !== '' ? String(th['mer']) : '—';
  const amerT = th && th['aMER'] != null && String(th['aMER']) !== '' ? String(th['aMER']) : '—';
  const ncacT = th && th['ncCAC'] != null && String(th['ncCAC']) !== '' ? String(th['ncCAC']) : '—';

  const strat = pick('strategyFilter');
  const strategyFilter = strat === '—' ? 'All (not set in UI)' : strat;

  return {
    DATE_RANGE: dateRangeLabel,
    CURRENCY: currencyLabel,
    EXCHANGE_RATE: Number.isFinite(exchangeRate) ? exchangeRate.toFixed(4) : '—',
    GA4_REPORTING_TIMEZONE: ga4TzRaw || '(not loaded)',
    GA4_TODAY_IN_REPORTING_TZ: ga4Today || '(not loaded)',
    COMPARISON_PERIOD: buildComparisonPeriodLabel({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      comparison: dateRange.comparison,
      comparisonEnabled: dateRange.comparisonEnabled,
      comparisonCustomStart: dateRange.comparisonCustomStart,
      comparisonCustomEnd: dateRange.comparisonCustomEnd,
    }),
    ATTRIBUTION_MODEL: pick('attributionModel', 'attrModel', 'cohortAttrModel'),
    ATTRIBUTION_WINDOW: pick('attributionWindow', 'attrWindow', 'cohortAttrWindow'),
    PLATFORM: pick('platform'),
    CAMPAIGN_FILTER: pick('campaignFilter'),
    STRATEGY_FILTER: strategyFilter,
    ZONE_FILTER: pick('zoneFilter'),
    CPA_TARGET: pick('cpaTarget'),
    METRIC_MODE: pick('metricMode', 'metric'),
    DISPLAY_MODE: pick('displayMode'),
    FORMAT: pick('formatMode', 'format'),
    MER_TARGET: merT,
    AMER_TARGET: amerT,
    NCAC_TARGET: ncacT,
    LTV_CAC_RATIO: ltvCac,
  };
}

export function buildRuntimeContextBlock(vars: PromptRuntimeVars): string {
  const lines = [
    '--- Runtime context (apply to all numeric interpretations) ---',
    `Report / focus period: ${vars.DATE_RANGE}`,
    `App display currency (user toggle): ${vars.CURRENCY}`,
    `Reference USD→PHP rate (1 USD = ${vars.EXCHANGE_RATE} PHP) when converting display amounts.`,
  ];
  if (vars.COMPARISON_PERIOD) {
    lines.push(`Comparison period: ${vars.COMPARISON_PERIOD}`);
  }
  const ga4Tz = vars.GA4_REPORTING_TIMEZONE;
  if (ga4Tz && ga4Tz !== '(not loaded)') {
    lines.push(
      `GA4 property reporting timezone (Data API date strings use this calendar; same as GA4 UI): ${ga4Tz}`,
    );
  }
  if (vars.GA4_TODAY_IN_REPORTING_TZ) {
    lines.push(
      `Today's date in that GA4 reporting timezone: ${vars.GA4_TODAY_IN_REPORTING_TZ}. Use this (not UTC or server time) when comparing to dateRangeIso.`,
    );
  }
  lines.push('--- End runtime context ---');
  return lines.join('\n');
}
