'use client';
import { useState, useEffect, useCallback } from 'react';
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

interface AIIntelligenceControlsProps {
  intelligenceId: string;
  title: string;
  onToggleVisibility?: (visible: boolean) => void;
  className?: string;
}

export default function AIIntelligenceControls({
  intelligenceId,
  title,
  onToggleVisibility,
  className = ''
}: AIIntelligenceControlsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreEntry, setRestoreEntry] = useState<PromptHistoryEntry | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);

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

  const handleRefresh = () => {
    setRefreshing(true);
    addToHistory(intelligenceId, currentPrompt, 'Refreshed');
    reload();
    setTimeout(() => setRefreshing(false), 1200);
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
      <div className={`flex items-center gap-2 ${className}`}>
        <button onClick={() => { setEditPrompt(currentPrompt); setShowEdit(true); }} className="flex items-center gap-1 px-2 py-1 bg-bg-elevated text-text-secondary border border-border rounded-md text-xs font-medium hover:bg-bg-surface hover:text-text-primary transition-colors" title="Edit prompt">
          <Settings className="w-3 h-3" /> Prompt
        </button>
        <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 px-2 py-1 bg-bg-elevated text-text-secondary border border-border rounded-md text-xs font-medium hover:bg-bg-surface hover:text-text-primary transition-colors" title="View history">
          <History className="w-3 h-3" /> History
        </button>
        <button onClick={handleRefresh} className="flex items-center gap-1 px-2 py-1 bg-warm-gold/15 text-warm-gold border border-warm-gold/30 rounded-md text-xs font-medium hover:bg-warm-gold/25 transition-colors" title="Refresh analysis">
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
        <button onClick={handleToggleVisibility} className="flex items-center gap-1 px-2 py-1 bg-bg-elevated text-text-secondary border border-border rounded-md text-xs font-medium hover:bg-bg-surface hover:text-text-primary transition-colors" title={isVisible ? 'Hide' : 'Show'}>
          {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* Edit Prompt Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Edit Prompt — {title}</h3>
            <p className="text-xs text-text-tertiary mb-4">Changes sync to the Prompt Templates page.</p>
            <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} className="w-full h-40 bg-bg-elevated border border-border rounded-md p-3 text-sm text-text-primary resize-none outline-none focus:border-brand-blue" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90">Save</button>
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
                        <td className="px-4 py-3"><button onClick={() => handleRestore(entry)} className="px-3 py-1 bg-brand-blue text-white text-xs rounded-md hover:bg-brand-blue/90">Restore</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowHistory(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Close</button>
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
              <button onClick={() => setShowRestore(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button onClick={confirmRestore} className="px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90">Restore</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
