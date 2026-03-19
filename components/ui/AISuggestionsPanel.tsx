'use client';
import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Settings, History } from 'lucide-react';

interface AISuggestionsPanelProps {
  suggestions: string[];
  title?: string;
  attributionModel?: string;
  attributionWindow?: string;
}

const DEFAULT_PROMPTS: Record<string, string> = {
  'Creative Intelligence': 'Analyze the creative performance data and provide actionable insights about ad fatigue, scaling opportunities, and creative strategy recommendations based on CPA trends and spend distribution.',
  'Target Intelligence': 'Review target vs actual performance metrics and provide strategic recommendations for improving KPI achievement, budget allocation, and goal setting.',
  'Cohort Intelligence': 'Analyze cohort retention patterns, lifetime value trends, and provide recommendations for improving customer retention and maximizing CLV by acquisition channel.',
  'Cross-Layer AI Analysis': 'Provide integrated analysis across attribution layers (MER/nCAC, surveys/MMM, MTA/platform data) and recommend strategic decisions for budget allocation and measurement improvements.',
};

export default function AISuggestionsPanel({ 
  suggestions, 
  title = 'AI Insights',
  attributionModel,
  attributionWindow
}: AISuggestionsPanelProps) {
  const [visible, setVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPromptEdit, setShowPromptEdit] = useState(false);
  const [showPromptHistory, setShowPromptHistory] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [promptHistory, setPromptHistory] = useState<string[]>([]);

  // Load prompt and history from localStorage on mount
  useEffect(() => {
    const storageKey = `ai-prompt-${title.toLowerCase().replace(/\s+/g, '-')}`;
    const historyKey = `ai-prompt-history-${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    const savedPrompt = localStorage.getItem(storageKey);
    const savedHistory = localStorage.getItem(historyKey);
    
    if (savedPrompt) {
      setCurrentPrompt(savedPrompt);
    } else {
      setCurrentPrompt(DEFAULT_PROMPTS[title] || 'Analyze the data and provide actionable insights.');
    }
    
    if (savedHistory) {
      setPromptHistory(JSON.parse(savedHistory));
    }
  }, [title]);

  const savePrompt = (prompt: string) => {
    const storageKey = `ai-prompt-${title.toLowerCase().replace(/\s+/g, '-')}`;
    const historyKey = `ai-prompt-history-${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Always add to history when saving (create new version)
    if (prompt.trim() !== '' && prompt !== currentPrompt) {
      const timestamp = new Date().toLocaleString();
      const versionedPrompt = `${prompt} (Saved: ${timestamp})`;
      
      const newHistory = [currentPrompt, ...promptHistory].slice(0, 10); // Keep last 10, add current before saving new
      setPromptHistory(newHistory);
      localStorage.setItem(historyKey, JSON.stringify(newHistory));
    }
    
    // Update current prompt
    setCurrentPrompt(prompt);
    localStorage.setItem(storageKey, prompt);
  };

  const restoreFromHistory = (prompt: string) => {
    setCurrentPrompt(prompt);
    setShowPromptHistory(false);
  };

  // Function to parse markdown bold text
  const parseMarkdownBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-warm-gold" />
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPromptEdit(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs font-medium hover:bg-bg-surface transition-colors"
          >
            <Settings size={12} />
            Prompt
          </button>
          <button
            onClick={() => setShowPromptHistory(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs font-medium hover:bg-bg-surface transition-colors"
          >
            <History size={12} />
            History
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-warm-gold/15 text-warm-gold text-xs font-medium hover:bg-warm-gold/25 transition-colors"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setVisible(!visible)}
            className="text-xs text-text-tertiary hover:text-text-secondary"
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {visible && (
        <div className="space-y-4">
          {attributionModel && attributionWindow && (
            <div className="flex items-center gap-4 text-xs text-text-tertiary pb-2 border-b border-border/50">
              <span>Attribution Model: <strong className="text-text-secondary">{attributionModel}</strong></span>
              <span>•</span>
              <span>Window: <strong className="text-text-secondary">{attributionWindow}</strong></span>
            </div>
          )}
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
                <span className="shrink-0 w-5 h-5 rounded-full bg-brand-blue/20 text-brand-blue-light text-xs flex items-center justify-center font-medium mt-0.5">
                  {i + 1}
                </span>
                <span>{parseMarkdownBold(s)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Edit Modal */}
      {showPromptEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Edit Analysis Prompt</h3>
            <textarea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="w-full h-40 bg-bg-elevated border border-border rounded-md p-3 text-sm text-text-primary resize-none outline-none focus:border-brand-blue"
              placeholder="Enter your custom analysis prompt here..."
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setShowPromptEdit(false)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  savePrompt(currentPrompt);
                  setShowPromptEdit(false);
                  handleRefresh();
                }}
                className="px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90 transition-colors"
              >
                Save & Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt History Modal */}
      {showPromptHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Prompt History</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {promptHistory.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">No prompt history available</p>
              ) : (
                promptHistory.map((prompt, index) => (
                  <div key={index} className="bg-bg-elevated border border-border rounded-md p-3">
                    <div className="text-sm text-text-primary mb-2 line-clamp-3">{prompt}</div>
                    <button
                      onClick={() => restoreFromHistory(prompt)}
                      className="text-xs text-brand-blue-light hover:text-brand-blue transition-colors"
                    >
                      Restore this prompt
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setShowPromptHistory(false)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
