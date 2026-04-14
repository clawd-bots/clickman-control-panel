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
};

export function fillPromptTemplate(template: string, vars: Partial<PromptRuntimeVars>): string {
  let s = template;
  if (vars.DATE_RANGE !== undefined) s = s.replace(/\{\{DATE_RANGE\}\}/g, vars.DATE_RANGE);
  if (vars.CURRENCY !== undefined) s = s.replace(/\{\{CURRENCY\}\}/g, vars.CURRENCY);
  if (vars.EXCHANGE_RATE !== undefined) s = s.replace(/\{\{EXCHANGE_RATE\}\}/g, vars.EXCHANGE_RATE);
  if (vars.GA4_REPORTING_TIMEZONE !== undefined) {
    s = s.replace(/\{\{GA4_REPORTING_TIMEZONE\}\}/g, vars.GA4_REPORTING_TIMEZONE);
  }
  if (vars.GA4_TODAY_IN_REPORTING_TZ !== undefined) {
    s = s.replace(/\{\{GA4_TODAY_IN_REPORTING_TZ\}\}/g, vars.GA4_TODAY_IN_REPORTING_TZ);
  }
  return s;
}

export function buildRuntimeContextBlock(vars: PromptRuntimeVars): string {
  const lines = [
    '--- Runtime context (apply to all numeric interpretations) ---',
    `Report / focus period: ${vars.DATE_RANGE}`,
    `App display currency (user toggle): ${vars.CURRENCY}`,
    `Reference USD→PHP rate (1 USD = ${vars.EXCHANGE_RATE} PHP) when converting display amounts.`,
  ];
  if (vars.GA4_REPORTING_TIMEZONE) {
    lines.push(
      `GA4 property reporting timezone (Data API date strings use this calendar; same as GA4 UI): ${vars.GA4_REPORTING_TIMEZONE}`,
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
