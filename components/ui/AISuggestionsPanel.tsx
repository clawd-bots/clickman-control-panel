'use client';
import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

interface AISuggestionsPanelProps {
  suggestions: string[];
  title?: string;
}

export default function AISuggestionsPanel({ suggestions, title = 'AI Insights' }: AISuggestionsPanelProps) {
  const [visible, setVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-warm-gold/15 text-warm-gold text-xs font-medium hover:bg-warm-gold/25 transition-colors"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh Analysis
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
      )}
    </div>
  );
}
