/**
 * Optional tokens in stored prompt templates, filled at analysis time from date + currency context.
 */
export type PromptRuntimeVars = {
  DATE_RANGE: string;
  CURRENCY: string;
  EXCHANGE_RATE: string;
};

export function fillPromptTemplate(template: string, vars: Partial<PromptRuntimeVars>): string {
  let s = template;
  if (vars.DATE_RANGE !== undefined) s = s.replace(/\{\{DATE_RANGE\}\}/g, vars.DATE_RANGE);
  if (vars.CURRENCY !== undefined) s = s.replace(/\{\{CURRENCY\}\}/g, vars.CURRENCY);
  if (vars.EXCHANGE_RATE !== undefined) s = s.replace(/\{\{EXCHANGE_RATE\}\}/g, vars.EXCHANGE_RATE);
  return s;
}

export function buildRuntimeContextBlock(vars: PromptRuntimeVars): string {
  return [
    '--- Runtime context (apply to all numeric interpretations) ---',
    `Report / focus period: ${vars.DATE_RANGE}`,
    `App display currency (user toggle): ${vars.CURRENCY}`,
    `Reference USD→PHP rate (1 USD = ${vars.EXCHANGE_RATE} PHP) when converting display amounts.`,
    '--- End runtime context ---',
  ].join('\n');
}
