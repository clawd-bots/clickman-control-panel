/**
 * Unified Prompt Registry — server-backed (Vercel Blob) with localStorage cache.
 * 
 * Every Intelligence panel and the Prompt Templates page use these functions.
 * Server is the source of truth; localStorage provides fast reads.
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  lastModified: string;
}

export interface PromptHistoryEntry {
  prompt: string;
  timestamp: string;
  response: string;
}

interface PromptStore {
  prompts: Record<string, PromptTemplate>;
  history: Record<string, PromptHistoryEntry[]>;
}

// Default prompts — used when no saved data exists
const DEFAULTS: Record<string, PromptTemplate> = {
  // Dashboard
  'dashboard-intelligence': {
    id: 'dashboard-intelligence',
    name: 'Dashboard Intelligence Analysis',
    description: 'Comprehensive dashboard performance analysis',
    prompt: 'Analyze current dashboard KPIs focusing on: 1) Revenue trends and growth patterns, 2) Marketing efficiency metrics (MER, aMER), 3) Customer acquisition costs and trends, 4) Order volume and new customer patterns, 5) Key performance indicators requiring immediate attention.\n\n(Context for this run: report period {{DATE_RANGE}}, app display currency {{CURRENCY}}, FX ref {{EXCHANGE_RATE}}.)',
    category: 'Dashboard',
    lastModified: '2026-03-01',
  },
  // Targets
  'target-intelligence': {
    id: 'target-intelligence',
    name: 'Target Intelligence Analysis',
    description: 'Analyzes target performance and provides strategic recommendations',
    prompt: 'Based on targets table and trends: evaluate whether monthly goals are realistic, where gaps are widest, and how seasonality might apply. Tie recommendations to the supplied target grid.\n\n(Context: report period {{DATE_RANGE}}, display currency {{CURRENCY}}, FX ref {{EXCHANGE_RATE}}.)',
    category: 'Targets & Goals',
    lastModified: '2026-03-01',
  },
  // Creative & MTA — one per tab
  'creative-ad-churn': {
    id: 'creative-ad-churn',
    name: 'Ad Churn Intelligence',
    description: 'Creative churn and lifecycle analysis',
    prompt: 'Examine ad creative churn patterns by analyzing: 1) Creative age distribution and spend allocation across age brackets, 2) Launch cohort performance over time, 3) Creative lifecycle optimization (when to refresh vs scale), 4) New creative adoption rate and effectiveness, 5) Recommendations for creative pipeline management and testing cadence.\n\n(Context: {{DATE_RANGE}}, {{CURRENCY}}, FX {{EXCHANGE_RATE}}.)',
    category: 'Creative & MTA',
    lastModified: '2026-03-01',
  },
  'creative-account-control': {
    id: 'creative-account-control',
    name: 'Account Control Intelligence',
    description: 'CPA vs Spend zone analysis and budget optimization',
    prompt: 'Using the CPA vs Spend scatter plot data, analyze: 1) Ads in each performance zone (scaling, testing, zombies, untapped), 2) Budget allocation efficiency and reallocation opportunities, 3) Scale-up candidates currently in testing phase, 4) Zombie ads wasting budget that should be paused immediately, 5) Untapped potential ads that need creative optimization or increased spend.\n\n(Context: {{DATE_RANGE}}, {{CURRENCY}}, FX {{EXCHANGE_RATE}}.)',
    category: 'Creative & MTA',
    lastModified: '2026-03-01',
  },
  'creative-slugging-rate': {
    id: 'creative-slugging-rate',
    name: 'Slugging Rate Intelligence',
    description: 'Production rate and creative hit rate analysis',
    prompt: 'Assess creative production effectiveness by examining: 1) Monthly creative launch volume vs scaling success rate, 2) Creative hit rate analysis (what percentage of launched ads actually scale), 3) Production queue optimization based on winning creative patterns, 4) Platform-specific creative preferences and performance differences, 5) Overall slugging rate should target 30% according to Curtis Howland methodology.\n\n(Context: {{DATE_RANGE}}, {{CURRENCY}}, FX {{EXCHANGE_RATE}}.)',
    category: 'Creative & MTA',
    lastModified: '2026-03-01',
  },
  'creative-demographics': {
    id: 'creative-demographics',
    name: 'Demographics Intelligence',
    description: 'Demographic alignment and creative targeting analysis',
    prompt: 'Compare creative output vs profitable demographics: 1) Which age/gender segments drive highest LTV and conversion rates, 2) Whether current creative style matches top-performing demographic preferences, 3) Creative misalignment risks (producing Gen Z content when profitable customers are older), 4) Demographic-specific creative recommendations, 5) Production pivot opportunities to better serve high-value segments.\n\n(Context: {{DATE_RANGE}}, {{CURRENCY}}, FX {{EXCHANGE_RATE}}.)',
    category: 'Creative & MTA',
    lastModified: '2026-03-01',
  },
  // Cohorts
  'cohorts-intelligence': {
    id: 'cohorts-intelligence',
    name: 'Cohorts Intelligence Analysis',
    description: 'Customer cohort behavior and LTV analysis',
    prompt: 'Examine cohort performance patterns by analyzing: 1) Customer lifetime value trends by acquisition cohort, 2) Retention rates and churn patterns over time, 3) Revenue per cohort and monetization effectiveness, 4) Acquisition channel quality by cohort performance, 5) Seasonal cohort behavior and optimization opportunities.\n\n(Context: top-bar period {{DATE_RANGE}}, display currency {{CURRENCY}}, FX ref {{EXCHANGE_RATE}}.)',
    category: 'Cohort Analysis',
    lastModified: '2026-03-01',
  },
  // Attribution Tree — one per layer
  'mer-ncac-intelligence': {
    id: 'mer-ncac-intelligence',
    name: 'MER/nCAC Intelligence',
    description: 'Marketing efficiency ratio and new customer acquisition cost analysis',
    prompt: 'Analyze MER and nCAC performance: 1) Current MER trend vs target, 2) nCAC efficiency by channel, 3) Maximum sustainable marketing spend, 4) Budget reallocation recommendations, 5) Blended vs new customer ROAS comparison.\n\n(Context: {{DATE_RANGE}}, {{CURRENCY}}, FX {{EXCHANGE_RATE}}.)',
    category: 'Attribution Tree',
    lastModified: '2026-03-01',
  },
  'surveys-mmm-intelligence': {
    id: 'surveys-mmm-intelligence',
    name: 'Surveys & MMM Intelligence',
    description: 'Post-purchase survey and media mix modeling analysis',
    prompt: 'Evaluate survey and MMM data: 1) Post-purchase survey channel attribution accuracy, 2) Survey vs platform attribution discrepancies, 3) Organic and word-of-mouth contribution, 4) Media mix model recommendations for budget allocation, 5) Survey sample size and confidence levels.\n\n(Context: {{DATE_RANGE}}, {{CURRENCY}}, FX {{EXCHANGE_RATE}}.)',
    category: 'Attribution Tree',
    lastModified: '2026-03-01',
  },
  'mta-platform-intelligence': {
    id: 'mta-platform-intelligence',
    name: 'MTA & Platform Intelligence',
    description: 'Multi-touch attribution and platform-reported data analysis',
    prompt: 'Analyze multi-touch attribution: 1) Platform-reported vs actual conversion data, 2) Cross-platform attribution overlap and deduplication, 3) Multi-touch path analysis and assist rates, 4) Attribution window impact on channel credit, 5) Incrementality testing recommendations.\n\n(Context: {{DATE_RANGE}}, {{CURRENCY}}, FX {{EXCHANGE_RATE}}.)',
    category: 'Attribution Tree',
    lastModified: '2026-03-01',
  },
  'tracking-infra-intelligence': {
    id: 'tracking-infra-intelligence',
    name: 'Tracking Infrastructure Intelligence',
    description: 'Pixel, CAPI, and tracking health analysis',
    prompt: 'Assess tracking infrastructure: 1) Pixel and CAPI event match quality, 2) Server-side vs browser-side tracking gaps, 3) Data loss estimation and impact on attribution, 4) Platform integration health status, 5) Tracking improvement priorities and implementation recommendations.\n\n(Context: {{DATE_RANGE}}, {{CURRENCY}}, FX {{EXCHANGE_RATE}}.)',
    category: 'Attribution Tree',
    lastModified: '2026-03-01',
  },
  'cohort-ltv-intelligence': {
    id: 'cohort-ltv-intelligence',
    name: 'Cohort LTV Intelligence',
    description: 'Customer lifetime value by acquisition cohort and channel',
    prompt: 'Examine cohort LTV patterns: 1) LTV:CAC ratio by acquisition channel, 2) Payback period trends and optimization, 3) Channel quality ranking by long-term customer value, 4) Cohort retention curves and inflection points, 5) Budget allocation based on LTV-weighted attribution.\n\n(Context: {{DATE_RANGE}}, {{CURRENCY}}, FX {{EXCHANGE_RATE}}.)',
    category: 'Attribution Tree',
    lastModified: '2026-03-01',
  },
  // P&L
  'pnl-intelligence': {
    id: 'pnl-intelligence',
    name: 'P&L Intelligence Analysis',
    description: 'Profit and loss statement analysis and insights',
    prompt: 'Analyze P&L performance focusing on: 1) Revenue streams and profitability trends, 2) Cost structure optimization opportunities, 3) Margin analysis and improvement potential, 4) Operating expense efficiency, 5) Bottom-line performance and financial health indicators.\n\n(Context: {{DATE_RANGE}}, {{CURRENCY}}, FX {{EXCHANGE_RATE}}.)',
    category: 'Financial Analysis',
    lastModified: '2026-03-01',
  },
};

const CACHE_KEY = 'clickman-prompt-store';

// ─── Local cache read/write ───

function readCache(): PromptStore {
  if (typeof window === 'undefined') return { prompts: {}, history: {} };
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : { prompts: {}, history: {} };
  } catch { return { prompts: {}, history: {} }; }
}

function writeCache(store: PromptStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(store));
}

// ─── Server sync (fire-and-forget) ───

function saveToServer(store: PromptStore): void {
  fetch('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(store),
  }).catch(err => console.error('Failed to save prompts to server:', err));
}

/** Load from server and merge into cache. Call once on page load. */
export async function loadPromptsFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/prompts', { cache: 'no-store' });
    if (!res.ok) return;
    const data: PromptStore = await res.json();
    if (data.prompts && Object.keys(data.prompts).length > 0) {
      writeCache(data);
      // Notify all listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('promptStoreLoaded'));
      }
    }
  } catch { /* ignore — cache is the fallback */ }
}

// ─── Core CRUD ───

export function getPromptById(id: string): PromptTemplate {
  const store = readCache();
  return store.prompts[id] || DEFAULTS[id] || _fallback(id);
}

export function savePrompt(template: PromptTemplate): void {
  template.lastModified = new Date().toISOString().split('T')[0];
  const store = readCache();
  store.prompts[template.id] = template;
  writeCache(store);
  saveToServer(store);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('promptUpdated', { detail: { id: template.id } }));
  }
}

export function updatePromptText(id: string, newPrompt: string): void {
  const template = getPromptById(id);
  addToHistory(id, template.prompt, 'Before edit');
  template.prompt = newPrompt;
  savePrompt(template);
}

// ─── History ───

export function getHistory(id: string): PromptHistoryEntry[] {
  const store = readCache();
  return store.history[id] || [];
}

export function addToHistory(id: string, prompt: string, response: string = ''): void {
  const store = readCache();
  if (!store.history[id]) store.history[id] = [];
  store.history[id].unshift({
    prompt,
    timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }),
    response,
  });
  store.history[id] = store.history[id].slice(0, 20);
  writeCache(store);
  saveToServer(store);
}

export function restoreFromHistory(id: string, historyEntry: PromptHistoryEntry): void {
  const template = getPromptById(id);
  addToHistory(id, template.prompt, 'Before restore');
  template.prompt = historyEntry.prompt;
  savePrompt(template);
}

// ─── List ───

export function getAllPrompts(): PromptTemplate[] {
  const store = readCache();
  return Object.keys(DEFAULTS).map(id => store.prompts[id] || DEFAULTS[id]);
}

export function getPromptsByCategory(category: string): PromptTemplate[] {
  return getAllPrompts().filter(p => p.category === category);
}

// ─── Compat ───

function _fallback(id: string): PromptTemplate {
  return { id, name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), description: '', prompt: 'Analyze the data and provide actionable insights.', category: 'General', lastModified: '2026-03-01' };
}

/** @deprecated — use updatePromptText */
export function syncPromptChanges(id: string, newPrompt: string): void {
  updatePromptText(id, newPrompt);
}
