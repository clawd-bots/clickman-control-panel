'use client';
import { useState, useEffect, useCallback } from 'react';
import { Settings, History, Save, RotateCcw } from 'lucide-react';
import {
  getAllPrompts,
  getPromptById,
  updatePromptText,
  getHistory,
  restoreFromHistory,
  loadPromptsFromServer,
  PromptTemplate,
  PromptHistoryEntry,
} from '@/lib/prompt-registry';

export default function PromptTemplatesPage() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [editText, setEditText] = useState('');
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saved, setSaved] = useState(false);

  const reload = useCallback(() => {
    const all = getAllPrompts();
    setPrompts(all);
    if (!selectedId && all.length > 0) {
      setSelectedId(all[0].id);
      setEditText(all[0].prompt);
      setHistory(getHistory(all[0].id));
    } else if (selectedId) {
      const tpl = getPromptById(selectedId);
      setEditText(tpl.prompt);
      setHistory(getHistory(selectedId));
    }
  }, [selectedId]);

  useEffect(() => {
    reload();
    // Hydrate from server
    loadPromptsFromServer().then(() => reload());
    const handler = () => reload();
    window.addEventListener('promptUpdated', handler);
    window.addEventListener('promptStoreLoaded', handler);
    return () => {
      window.removeEventListener('promptUpdated', handler);
      window.removeEventListener('promptStoreLoaded', handler);
    };
  }, [reload]);

  const selectPrompt = (id: string) => {
    setSelectedId(id);
    const tpl = getPromptById(id);
    setEditText(tpl.prompt);
    setHistory(getHistory(id));
    setSaved(false);
    setShowHistory(false);
  };

  const handleSave = () => {
    if (!selectedId) return;
    updatePromptText(selectedId, editText);
    setHistory(getHistory(selectedId));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRestore = (entry: PromptHistoryEntry) => {
    if (!selectedId) return;
    restoreFromHistory(selectedId, entry);
    reload();
    setShowHistory(false);
  };

  const selected = prompts.find(p => p.id === selectedId);

  // Map prompt IDs to their page locations
  const pageMap: Record<string, string> = {
    'dashboard-intelligence': 'Dashboard → Daily Summary & Intelligence',
    'target-intelligence': 'Targets & Goals → Target Intelligence',
    'creative-intelligence': 'Creative & MTA → Intelligence Panel',
    'cohorts-intelligence': 'Cohorts → Retention Intelligence',
    'pnl-intelligence': 'Profit & Loss → (future)',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings size={24} />
          Prompt Templates
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Edit intelligence prompts here. Changes sync instantly to their respective pages.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prompt List */}
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">All Prompts</h3>
          <div className="space-y-1">
            {prompts.map(p => (
              <button
                key={p.id}
                onClick={() => selectPrompt(p.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                  selectedId === p.id
                    ? 'bg-brand-blue/15 text-brand-blue-light font-medium'
                    : 'text-text-primary hover:bg-bg-elevated'
                }`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-text-tertiary mt-0.5">{p.category} • Updated {p.lastModified}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="bg-bg-surface border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-semibold text-text-primary">{selected.name}</h3>
                  <span className="text-xs text-text-tertiary">Last modified: {selected.lastModified}</span>
                </div>
                <p className="text-sm text-text-secondary mb-1">{selected.description}</p>
                <p className="text-xs text-brand-blue-light mb-4">
                  Used in: {pageMap[selected.id] || 'Not linked to a page yet'}
                </p>

                <textarea
                  value={editText}
                  onChange={(e) => { setEditText(e.target.value); setSaved(false); }}
                  className="w-full h-48 bg-bg-elevated border border-border rounded-md p-3 text-sm text-text-primary resize-none outline-none focus:border-brand-blue"
                />

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleSave}
                    disabled={editText === selected.prompt}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save size={14} />
                    {saved ? '✓ Saved' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-border text-sm rounded-md text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <History size={14} />
                    History ({history.length})
                  </button>
                </div>
              </div>

              {/* History */}
              {showHistory && (
                <div className="bg-bg-surface border border-border rounded-lg p-5">
                  <h4 className="text-sm font-medium text-text-primary mb-3">Version History</h4>
                  {history.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-4">No history yet. Editing and saving creates versions.</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {history.map((entry, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-bg-elevated rounded-md">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-text-primary">v{history.length - i}</span>
                              <span className="text-xs text-text-tertiary">{entry.timestamp}</span>
                              {entry.response && <span className="text-xs text-text-tertiary">• {entry.response}</span>}
                            </div>
                            <p className="text-xs text-text-secondary truncate" title={entry.prompt}>{entry.prompt}</p>
                          </div>
                          <button
                            onClick={() => handleRestore(entry)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-brand-blue text-white text-xs rounded-md hover:bg-brand-blue/90 shrink-0"
                          >
                            <RotateCcw size={10} /> Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-bg-surface border border-border rounded-lg p-8 text-center text-text-secondary">
              Select a prompt template to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
