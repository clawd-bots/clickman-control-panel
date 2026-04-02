/**
 * Unified Prompt Registry — single source of truth backed by localStorage.
 * 
 * Every Intelligence panel and the Prompt Templates page use these functions.
 * Prompts are keyed by ID. History is stored per prompt.
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

// Default prompts — used when no localStorage data exists
const DEFAULTS: Record<string, PromptTemplate> = {
  'dashboard-intelligence': {
    id: 'dashboard-intelligence',
    name: 'Dashboard Intelligence Analysis',
    description: 'Comprehensive dashboard performance analysis',
    prompt: 'Analyze current dashboard KPIs focusing on: 1) Revenue trends and growth patterns, 2) Marketing efficiency metrics (MER, aMER), 3) Customer acquisition costs and trends, 4) Order volume and new customer patterns, 5) Key performance indicators requiring immediate attention.',
    category: 'Dashboard',
    lastModified: '2026-03-01',
  },
  'target-intelligence': {
    id: 'target-intelligence',
    name: 'Target Intelligence Analysis',
    description: 'Analyzes target performance and provides strategic recommendations',
    prompt: 'Based on 30-day trend: Current revenue run rate suggests targeting adjustments. Historical seasonality shows Q4 typically sees 15-20% lift. 90-day moving average shows nCAC improving 8% MoM. Set progressive reduction targets. 365-day cohort data indicates seasonal performance patterns.',
    category: 'Targets & Goals',
    lastModified: '2026-03-01',
  },
  'creative-intelligence': {
    id: 'creative-intelligence',
    name: 'Creative Intelligence Analysis',
    description: 'Ad creative performance and optimization analysis',
    prompt: 'Analyze creative performance data focusing on: 1) Scaling creative identification (high spend, low CPA), 2) Creative fatigue indicators and refresh recommendations, 3) Platform-specific creative insights (Meta vs TikTok vs Google), 4) Budget reallocation from underperformers to winners, 5) Creative testing velocity and hit rate analysis.',
    category: 'Creative Analysis',
    lastModified: '2026-03-01',
  },
  'cohorts-intelligence': {
    id: 'cohorts-intelligence',
    name: 'Cohorts Intelligence Analysis',
    description: 'Customer cohort behavior and LTV analysis',
    prompt: 'Examine cohort performance patterns by analyzing: 1) Customer lifetime value trends by acquisition cohort, 2) Retention rates and churn patterns over time, 3) Revenue per cohort and monetization effectiveness, 4) Acquisition channel quality by cohort performance, 5) Seasonal cohort behavior and optimization opportunities.',
    category: 'Cohort Analysis',
    lastModified: '2026-03-01',
  },
  'pnl-intelligence': {
    id: 'pnl-intelligence',
    name: 'P&L Intelligence Analysis',
    description: 'Profit and loss statement analysis and insights',
    prompt: 'Analyze P&L performance focusing on: 1) Revenue streams and profitability trends, 2) Cost structure optimization opportunities, 3) Margin analysis and improvement potential, 4) Operating expense efficiency, 5) Bottom-line performance and financial health indicators.',
    category: 'Financial Analysis',
    lastModified: '2026-03-01',
  },
};

const STORAGE_PREFIX = 'clickman-prompt-';
const HISTORY_PREFIX = 'clickman-prompt-history-';

// ─── Core CRUD ───

export function getPromptById(id: string): PromptTemplate {
  if (typeof window === 'undefined') return DEFAULTS[id] || _fallback(id);
  const raw = localStorage.getItem(STORAGE_PREFIX + id);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  return DEFAULTS[id] || _fallback(id);
}

export function savePrompt(template: PromptTemplate): void {
  if (typeof window === 'undefined') return;
  template.lastModified = new Date().toISOString().split('T')[0];
  localStorage.setItem(STORAGE_PREFIX + template.id, JSON.stringify(template));
  // Notify all listeners
  window.dispatchEvent(new CustomEvent('promptUpdated', { detail: { id: template.id } }));
}

export function updatePromptText(id: string, newPrompt: string): void {
  const template = getPromptById(id);
  // Save current to history before updating
  addToHistory(id, template.prompt, 'Before edit');
  template.prompt = newPrompt;
  savePrompt(template);
}

// ─── History ───

export function getHistory(id: string): PromptHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(HISTORY_PREFIX + id);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function addToHistory(id: string, prompt: string, response: string = ''): void {
  if (typeof window === 'undefined') return;
  const history = getHistory(id);
  history.unshift({
    prompt,
    timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }),
    response,
  });
  // Keep last 20
  localStorage.setItem(HISTORY_PREFIX + id, JSON.stringify(history.slice(0, 20)));
}

export function restoreFromHistory(id: string, historyEntry: PromptHistoryEntry): void {
  const template = getPromptById(id);
  addToHistory(id, template.prompt, 'Before restore');
  template.prompt = historyEntry.prompt;
  savePrompt(template);
}

// ─── List ───

export function getAllPrompts(): PromptTemplate[] {
  const ids = Object.keys(DEFAULTS);
  return ids.map(id => getPromptById(id));
}

export function getPromptsByCategory(category: string): PromptTemplate[] {
  return getAllPrompts().filter(p => p.category === category);
}

// ─── Compat helpers ───

function _fallback(id: string): PromptTemplate {
  return {
    id,
    name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: '',
    prompt: 'Analyze the data and provide actionable insights.',
    category: 'General',
    lastModified: '2026-03-01',
  };
}

/** @deprecated — use updatePromptText */
export function syncPromptChanges(id: string, newPrompt: string): void {
  updatePromptText(id, newPrompt);
}
