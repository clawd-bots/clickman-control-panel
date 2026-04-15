/**
 * Unified Prompt Registry — server-backed (Vercel Blob) with localStorage cache.
 * 
 * Every Intelligence panel and the Prompt Templates page use these functions.
 * Server is the source of truth; localStorage provides fast reads.
 */

import { DEFAULT_PROMPT_TEMPLATES } from '@/lib/prompt-defaults-data';

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
const DEFAULTS: Record<string, PromptTemplate> = Object.fromEntries(
  DEFAULT_PROMPT_TEMPLATES.map((p) => [p.id, p] as const),
) as Record<string, PromptTemplate>;

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
