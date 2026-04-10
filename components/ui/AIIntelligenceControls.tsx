'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { History, RefreshCw, EyeOff, Eye, Settings } from 'lucide-react';
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
import { parseQuadrantJson, type QuadrantInsights } from '@/lib/parse-ai-response';

export type LayerInsights = QuadrantInsights;

interface AIIntelligenceControlsProps {
  intelligenceId: string;
  title: string;
  /** Live JSON snapshot for the model (merged with date/currency on server) */
  analysisContext: Record<string, unknown>;
  pageLabel?: string;
  quadrantMode?: boolean;
  onQuadrantInsights?: (insights: LayerInsights) => void;
  onToggleVisibility?: (visible: boolean) => void;
  className?: string;
}

function buildDateRangeLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

export default function AIIntelligenceControls({
  intelligenceId,
  title,
  analysisContext,
  pageLabel = 'Attribution',
  quadrantMode = false,
  onQuadrantInsights,
  onToggleVisibility,
  className = '',
}: AIIntelligenceControlsProps) {
  const { dateRange } = useDateRange();
  const { currency, exchangeRate } = useCurrency();
  const [isVisible, setIsVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreEntry, setRestoreEntry] = useState<PromptHistoryEntry | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const runtimeVars: PromptRuntimeVars = useMemo(
    () => ({
      DATE_RANGE: buildDateRangeLabel(dateRange.startDate, dateRange.endDate),
      CURRENCY: currency === '$' ? 'USD ($)' : 'PHP (₱)',
      EXCHANGE_RATE: Number.isFinite(exchangeRate) ? exchangeRate.toFixed(4) : '—',
    }),
    [dateRange.startDate, dateRange.endDate, currency, exchangeRate]
  );

  const reload = useCallback(() => {
    const tpl = getPromptById(intelligenceId);
    setCurrentPrompt(tpl.prompt);
    setEditPrompt(tpl.prompt);
    setHistory(getHistory(intelligenceId));
  }, [intelligenceId]);

  useEffect(() => {
    reload();
    loadPromptsFromServer().then(() => reload());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.id === intelligenceId) reload();
    };
    window.addEventListener('promptUpdated', handler);
    window.addEventListener('promptStoreLoaded', reload);
    return () => {
      window.removeEventListener('promptUpdated', handler);
      window.removeEventListener('promptStoreLoaded', reload);
    };
  }, [intelligenceId, reload]);

  const handleToggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onToggleVisibility?.(newVisibility);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    const tpl = getPromptById(intelligenceId);
    const filledInstructions = fillPromptTemplate(tpl.prompt, runtimeVars);
    const runtimeBlock = buildRuntimeContextBlock(runtimeVars);
    const payload = {
      promptId: intelligenceId,
      instructions: filledInstructions,
      runtimeBlock,
      data: {
        page: pageLabel,
        dateRangeLabel: runtimeVars.DATE_RANGE,
        displayCurrency: runtimeVars.CURRENCY,
        exchangeRate: runtimeVars.EXCHANGE_RATE,
        ...analysisContext,
      },
      outputFormat: quadrantMode ? ('attribution_quadrants' as const) : ('numbered_list' as const),
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
        addToHistory(intelligenceId, tpl.prompt, `Error: ${json.error || res.status}`);
        return;
      }
      const text = String(json.text ?? '');
      if (quadrantMode && onQuadrantInsights) {
        const parsed = parseQuadrantJson(text);
        if (!parsed) {
          setRefreshError('Could not parse JSON from model — try Refresh again.');
          addToHistory(intelligenceId, tpl.prompt, text.slice(0, 200));
          return;
        }
        onQuadrantInsights(parsed);
        addToHistory(intelligenceId, tpl.prompt, 'Quadrant refresh OK');
      } else {
        addToHistory(intelligenceId, tpl.prompt, text.slice(0, 200));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setRefreshError(msg);
      addToHistory(intelligenceId, tpl.prompt, `Error: ${msg}`);
    } finally {
      setRefreshing(false);
      reload();
    }
  };

  const handleSave = () => {
    if (editPrompt.trim() && editPrompt !== currentPrompt) {
      updatePromptText(intelligenceId, editPrompt);
      reload();
    }
    setShowEdit(false);
  };

  const handleRestore = (entry: PromptHistoryEntry) => {
    setRestoreEntry(entry);
    setShowRestore(true);
    setShowHistory(false);
  };

  const confirmRestore = () => {
    if (restoreEntry) {
      registryRestore(intelligenceId, restoreEntry);
      reload();
    }
    setShowRestore(false);
  };

  return (
    <>
      <div className={`flex flex-col items-end gap-1 ${className}`}>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button type="button" onClick={() => { setEditPrompt(currentPrompt); setShowEdit(true); }} className="flex items-center gap-1 px-2 py-1 bg-bg-elevated text-text-secondary border border-border rounded-md text-xs font-medium hover:bg-bg-surface hover:text-text-primary transition-colors" title="Edit prompt">
            <Settings className="w-3 h-3" /> Prompt
          </button>
          <button type="button" onClick={() => setShowHistory(true)} className="flex items-center gap-1 px-2 py-1 bg-bg-elevated text-text-secondary border border-border rounded-md text-xs font-medium hover:bg-bg-surface hover:text-text-primary transition-colors" title="View history">
            <History className="w-3 h-3" /> History
          </button>
          <button type="button" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-1 px-2 py-1 bg-warm-gold/15 text-warm-gold border border-warm-gold/30 rounded-md text-xs font-medium hover:bg-warm-gold/25 transition-colors disabled:opacity-50" title="Refresh analysis">
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button type="button" onClick={handleToggleVisibility} className="flex items-center gap-1 px-2 py-1 bg-bg-elevated text-text-secondary border border-border rounded-md text-xs font-medium hover:bg-bg-surface hover:text-text-primary transition-colors" title={isVisible ? 'Hide' : 'Show'}>
            {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {isVisible ? 'Hide' : 'Show'}
          </button>
        </div>
        {refreshError && (
          <p className="text-[10px] text-danger text-right max-w-[280px]" role="alert">{refreshError}</p>
        )}
      </div>

      {/* Edit Prompt Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Edit Prompt — {title}</h3>
            <p className="text-xs text-text-tertiary mb-2">Changes sync to the Prompt Templates page.</p>
            <p className="text-xs text-text-secondary mb-3">
              Optional: <code className="text-text-primary">{'{{DATE_RANGE}}'}</code>,{' '}
              <code className="text-text-primary">{'{{CURRENCY}}'}</code>,{' '}
              <code className="text-text-primary">{'{{EXCHANGE_RATE}}'}</code>
            </p>
            <div className="text-xs bg-bg-elevated border border-border rounded-md p-2 mb-3 text-text-secondary line-clamp-3">
              {fillPromptTemplate(editPrompt, runtimeVars).slice(0, 360)}
              {fillPromptTemplate(editPrompt, runtimeVars).length > 360 ? '…' : ''}
            </div>
            <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} className="w-full h-40 bg-bg-elevated border border-border rounded-md p-3 text-sm text-text-primary resize-none outline-none focus:border-brand-blue" />
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button type="button" onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-4xl mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Prompt History — {title}</h3>
            <div className="max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">No history yet.</p>
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
                        <td className="px-4 py-3 text-text-primary"><div className="max-w-md truncate">{entry.prompt.substring(0, 100)}{entry.prompt.length > 100 ? '...' : ''}</div></td>
                        <td className="px-4 py-3"><button type="button" onClick={() => handleRestore(entry)} className="px-3 py-1 bg-brand-blue text-white text-xs rounded-md hover:bg-brand-blue/90">Restore</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setShowHistory(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirm Modal */}
      {showRestore && restoreEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Restore This Version?</h3>
            <div className="bg-bg-elevated border border-border rounded-md p-3 text-sm text-text-primary max-h-32 overflow-y-auto mb-4">{restoreEntry.prompt}</div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowRestore(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button type="button" onClick={confirmRestore} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90">Restore</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
