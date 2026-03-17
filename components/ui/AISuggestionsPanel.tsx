'use client';
import { useState } from 'react';
import { Sparkles, RefreshCw, Settings } from 'lucide-react';

interface AISuggestionsPanelProps {
  suggestions: string[];
  title?: string;
  attributionModel?: string;
  attributionWindow?: string;
}

export default function AISuggestionsPanel({ 
  suggestions, 
  title = 'AI Insights',
  attributionModel = 'Linear All',
  attributionWindow = '7-day click / 1-day view'
}: AISuggestionsPanelProps) {
  const [visible, setVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPromptEdit, setShowPromptEdit] = useState(false);

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
          <div className="flex items-center gap-4 text-xs text-text-tertiary pb-2 border-b border-border/50">
            <span>Attribution Model: <strong className="text-text-secondary">{attributionModel}</strong></span>
            <span>•</span>
            <span>Window: <strong className="text-text-secondary">{attributionWindow}</strong></span>
          </div>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
                <span className="shrink-0 w-5 h-5 rounded-full bg-brand-blue/20 text-brand-blue-light text-xs flex items-center justify-center font-medium mt-0.5">
                  {i + 1}
                </span>
                <span>{s}</span>
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
              className="w-full h-40 bg-bg-elevated border border-border rounded-md p-3 text-sm text-text-primary resize-none outline-none focus:border-brand-blue"
              placeholder="Enter your custom analysis prompt here..."
              defaultValue="Analyze the creative performance data and provide actionable insights about ad fatigue, scaling opportunities, and creative strategy recommendations based on CPA trends and spend distribution."
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setShowPromptEdit(false)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowPromptEdit(false)}
                className="px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90 transition-colors"
              >
                Save & Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
