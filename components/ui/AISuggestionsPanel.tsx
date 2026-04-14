'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sparkles, RefreshCw, Settings, History } from 'lucide-react';
import {
  getPromptById,
  updatePromptText,
  getHistory,
  restoreFromHistory as registryRestore,
  addToHistory,
  loadPromptsFromServer,
  PromptHistoryEntry,
} from '@/lib/prompt-registry';
import { useDateRange } from '@/components/DateProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { fillPromptTemplate, buildRuntimeContextBlock, PromptRuntimeVars } from '@/lib/prompt-interpolate';
import { parseNumberedList } from '@/lib/parse-ai-response';
import { toLocalDateString } from '@/lib/dateUtils';

const INSIGHTS_LS_PREFIX = 'clickman-ai-insights:';

function loadPersistedInsights(key: string): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw) as { items?: unknown };
    if (!Array.isArray(p.items) || p.items.length === 0) return null;
    if (!p.items.every((x) => typeof x === 'string')) return null;
    return p.items as string[];
  } catch {
    return null;
  }
}

function savePersistedInsights(key: string, items: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify({ items, savedAt: Date.now() }));
  } catch {
    /* quota or private mode */
  }
}

export interface AISuggestionsPanelProps {
  suggestions: string[];
  title?: string;
  promptId: string;
  /** Serializable snapshot of page metrics / state for the model */
  analysisContext: Record<string, unknown>;
  pageLabel?: string;
}

function buildDateRangeLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

export default function AISuggestionsPanel({
  suggestions,
  title = 'AI Insights',
  promptId,
  analysisContext,
  pageLabel = 'Page',
}: AISuggestionsPanelProps) {
  const { dateRange } = useDateRange();
  const { currency, exchangeRate } = useCurrency();
  const [visible, setVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPromptEdit, setShowPromptEdit] = useState(false);
  const [showPromptHistory, setShowPromptHistory] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreEntry, setRestoreEntry] = useState<PromptHistoryEntry | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);
  const [displayItems, setDisplayItems] = useState<string[]>(suggestions);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  /** Parent often passes a new `suggestions` array every render; only read it when hydrating, never overwrite AI output on every render. */
  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;

  const insightsCacheKey = useMemo(
    () =>
      `${INSIGHTS_LS_PREFIX}${promptId}:${toLocalDateString(dateRange.startDate)}:${toLocalDateString(dateRange.endDate)}:${currency === '$' ? 'usd' : 'php'}`,
    [promptId, dateRange.startDate, dateRange.endDate, currency]
  );

  const runtimeVars: PromptRuntimeVars = useMemo(() => {
    const ga4Tz =
      typeof analysisContext['ga4ReportingTimeZone'] === 'string'
        ? analysisContext['ga4ReportingTimeZone']
        : '';
    const ga4Today =
      typeof analysisContext['ga4TodayInReportingTimeZone'] === 'string'
        ? analysisContext['ga4TodayInReportingTimeZone']
        : toLocalDateString(new Date());
    return {
      DATE_RANGE: buildDateRangeLabel(dateRange.startDate, dateRange.endDate),
      CURRENCY: currency === '$' ? 'USD ($)' : 'PHP (₱)',
      EXCHANGE_RATE: Number.isFinite(exchangeRate) ? exchangeRate.toFixed(4) : '—',
      GA4_REPORTING_TIMEZONE: ga4Tz || '(not loaded)',
      GA4_TODAY_IN_REPORTING_TZ: ga4Today,
    };
  }, [
    dateRange.startDate,
    dateRange.endDate,
    currency,
    exchangeRate,
    analysisContext,
  ]);

  useEffect(() => {
    const cached = loadPersistedInsights(insightsCacheKey);
    if (cached) {
      setDisplayItems(cached);
      return;
    }
    setDisplayItems(suggestionsRef.current);
  }, [insightsCacheKey]);

  const reload = useCallback(() => {
    const tpl = getPromptById(promptId);
    setCurrentPrompt(tpl.prompt);
    setEditPrompt(tpl.prompt);
    setHistory(getHistory(promptId));
  }, [promptId]);

  useEffect(() => {
    reload();
    loadPromptsFromServer().then(() => reload());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.id === promptId) reload();
    };
    window.addEventListener('promptUpdated', handler);
    window.addEventListener('promptStoreLoaded', reload);
    return () => {
      window.removeEventListener('promptUpdated', handler);
      window.removeEventListener('promptStoreLoaded', reload);
    };
  }, [promptId, reload]);

  const handleSave = () => {
    if (editPrompt.trim() && editPrompt !== currentPrompt) {
      updatePromptText(promptId, editPrompt);
      reload();
    }
    setShowPromptEdit(false);
  };

  const handleRestore = (entry: PromptHistoryEntry) => {
    setRestoreEntry(entry);
    setShowRestoreModal(true);
    setShowPromptHistory(false);
  };

  const confirmRestore = () => {
    if (restoreEntry) {
      registryRestore(promptId, restoreEntry);
      reload();
    }
    setShowRestoreModal(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    const tpl = getPromptById(promptId);
    const filledInstructions = fillPromptTemplate(tpl.prompt, runtimeVars);
    const runtimeBlock = buildRuntimeContextBlock(runtimeVars);
    const payload = {
      promptId,
      instructions: filledInstructions,
      runtimeBlock,
      pageLabel,
      data: {
        page: pageLabel,
        dateRangeLabel: runtimeVars.DATE_RANGE,
        displayCurrency: runtimeVars.CURRENCY,
        exchangeRate: runtimeVars.EXCHANGE_RATE,
        ...analysisContext,
      },
      outputFormat: 'numbered_list' as const,
    };

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setRefreshError(typeof json.error === 'string' ? json.error : 'Analysis failed');
        addToHistory(promptId, tpl.prompt, `Error: ${json.error || res.status}`);
      } else {
        const items = parseNumberedList(String(json.text ?? ''));
        if (items.length === 0) {
          setRefreshError('Model returned no numbered items — try Refresh again.');
          addToHistory(promptId, tpl.prompt, String(json.text ?? '').slice(0, 200));
        } else {
          setDisplayItems(items);
          savePersistedInsights(insightsCacheKey, items);
          addToHistory(promptId, tpl.prompt, items.map((s, i) => `${i + 1}. ${s}`).join(' ').slice(0, 280));
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setRefreshError(msg);
      addToHistory(promptId, tpl.prompt, `Error: ${msg}`);
    } finally {
      setRefreshing(false);
      reload();
    }
  };

  const parseMarkdownBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-warm-gold" />
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setEditPrompt(currentPrompt);
              setShowPromptEdit(true);
            }}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs font-medium hover:bg-bg-surface transition-colors whitespace-nowrap"
          >
            <Settings size={12} /><span className="hidden sm:inline">Prompt</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPromptHistory(true)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs font-medium hover:bg-bg-surface transition-colors whitespace-nowrap"
          >
            <History size={12} /><span className="hidden sm:inline">History</span>
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-warm-gold/15 text-warm-gold text-xs font-medium hover:bg-warm-gold/25 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="text-xs text-text-tertiary hover:text-text-secondary whitespace-nowrap"
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {refreshError && (
        <p className="text-xs text-danger mb-3" role="alert">{refreshError}</p>
      )}

      {visible && (
        <div className="space-y-3">
          {displayItems.map((s, i) => (
            <div key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
              <span className="shrink-0 w-5 h-5 rounded-full bg-brand-blue/20 text-brand-blue-light text-xs flex items-center justify-center font-medium mt-0.5">{i + 1}</span>
              <span>{parseMarkdownBold(s)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Edit Prompt Modal */}
      {showPromptEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Edit Analysis Prompt</h3>
            <p className="text-xs text-text-tertiary mb-2">Changes sync to the Prompt Templates page and vice versa.</p>
            <p className="text-xs text-text-secondary mb-3">
              Optional tokens (filled on each Refresh):{' '}
              <code className="text-text-primary">{'{{DATE_RANGE}}'}</code>,{' '}
              <code className="text-text-primary">{'{{CURRENCY}}'}</code>,{' '}
              <code className="text-text-primary">{'{{EXCHANGE_RATE}}'}</code>,{' '}
              <code className="text-text-primary">{'{{GA4_REPORTING_TIMEZONE}}'}</code>,{' '}
              <code className="text-text-primary">{'{{GA4_TODAY_IN_REPORTING_TZ}}'}</code>
            </p>
            <div className="text-xs bg-bg-elevated border border-border rounded-md p-2 mb-3 text-text-secondary">
              <span className="font-medium text-text-primary">Live preview after tokens:</span>{' '}
              {(() => {
                const prev = fillPromptTemplate(editPrompt, runtimeVars);
                return <span className="line-clamp-3">{prev.slice(0, 320)}{prev.length > 320 ? '…' : ''}</span>;
              })()}
            </div>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              className="w-full h-40 bg-bg-elevated border border-border rounded-md p-3 text-sm text-text-primary resize-none outline-none focus:border-brand-blue"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowPromptEdit(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button type="button" onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showPromptHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-4xl mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Prompt History</h3>
            <div className="max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">No history yet — edit or refresh the prompt to create versions.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-bg-elevated border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase w-16">Ver</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase w-40">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Prompt</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((entry, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-elevated'}>
                        <td className="px-4 py-3 text-text-primary">v{history.length - i}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{entry.timestamp}</td>
                        <td className="px-4 py-3 text-text-primary">
                          <div className="max-w-md truncate" title={entry.prompt}>{entry.prompt.substring(0, 100)}{entry.prompt.length > 100 ? '...' : ''}</div>
                          {entry.response ? (
                            <div className="text-[10px] text-text-tertiary truncate mt-0.5" title={entry.response}>{entry.response}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => handleRestore(entry)} className="px-3 py-1 bg-brand-blue text-white text-xs rounded-md hover:bg-brand-blue/90">Restore</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setShowPromptHistory(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirm Modal */}
      {showRestoreModal && restoreEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Restore This Version?</h3>
            <p className="text-sm text-text-secondary mb-2">This will replace the current prompt with:</p>
            <div className="bg-bg-elevated border border-border rounded-md p-3 text-sm text-text-primary max-h-32 overflow-y-auto mb-4">{restoreEntry.prompt}</div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowRestoreModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button type="button" onClick={confirmRestore} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90">Restore</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
