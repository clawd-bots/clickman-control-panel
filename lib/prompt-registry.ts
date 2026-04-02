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
