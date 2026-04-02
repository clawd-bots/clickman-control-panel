'use client';
import { useState, useEffect, useCallback } from 'react';
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

interface AISuggestionsPanelProps {
  suggestions: string[];
  title?: string;
  promptId: string; // Must match a key in prompt-registry
}

export default function AISuggestionsPanel({
  suggestions,
  title = 'AI Insights',
  promptId,
}: AISuggestionsPanelProps) {
  const [visible, setVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPromptEdit, setShowPromptEdit] = useState(false);
  const [showPromptHistory, setShowPromptHistory] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreEntry, setRestoreEntry] = useState<PromptHistoryEntry | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);

  // Load from unified registry
  const reload = useCallback(() => {
    const tpl = getPromptById(promptId);
    setCurrentPrompt(tpl.prompt);
    setEditPrompt(tpl.prompt);
    setHistory(getHistory(promptId));
  }, [promptId]);

  useEffect(() => {
    reload();
    // Hydrate from server, then reload
    loadPromptsFromServer().then(() => reload());
    // Listen for changes from other panels / Prompt Templates page
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

  const handleRefresh = () => {
    setRefreshing(true);
    addToHistory(promptId, currentPrompt, suggestions.join(' ').substring(0, 200));
    reload();
    setTimeout(() => setRefreshing(false), 1200);
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
          <button onClick={() => { setEditPrompt(currentPrompt); setShowPromptEdit(true); }} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs font-medium hover:bg-bg-surface transition-colors whitespace-nowrap">
            <Settings size={12} /><span className="hidden sm:inline">Prompt</span>
          </button>
          <button onClick={() => setShowPromptHistory(true)} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs font-medium hover:bg-bg-surface transition-colors whitespace-nowrap">
            <History size={12} /><span className="hidden sm:inline">History</span>
          </button>
          <button onClick={handleRefresh} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-warm-gold/15 text-warm-gold text-xs font-medium hover:bg-warm-gold/25 transition-colors whitespace-nowrap">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setVisible(!visible)} className="text-xs text-text-tertiary hover:text-text-secondary whitespace-nowrap">
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {visible && (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
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
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Edit Analysis Prompt</h3>
            <p className="text-xs text-text-tertiary mb-4">Changes sync to the Prompt Templates page and vice versa.</p>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              className="w-full h-40 bg-bg-elevated border border-border rounded-md p-3 text-sm text-text-primary resize-none outline-none focus:border-brand-blue"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button onClick={() => setShowPromptEdit(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90 transition-colors">Save & Refresh</button>
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
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleRestore(entry)} className="px-3 py-1 bg-brand-blue text-white text-xs rounded-md hover:bg-brand-blue/90">Restore</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowPromptHistory(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Close</button>
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
              <button onClick={() => setShowRestoreModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button onClick={confirmRestore} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90">Restore</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
