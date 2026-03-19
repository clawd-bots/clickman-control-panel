'use client';
import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Settings, History, FileText } from 'lucide-react';

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

// Load available templates from Prompt Templates page
const AVAILABLE_TEMPLATES: Record<string, Array<{id: string, name: string, prompt: string}>> = {
  'Creative Intelligence': [
    {
      id: 'creative-performance',
      name: 'Creative Performance Analysis',
      prompt: 'Analyze the creative performance data focusing on: 1) Which ad creatives are scaling efficiently (high spend, low CPA), 2) Creative fatigue indicators and refresh recommendations, 3) Platform-specific creative insights (Meta vs TikTok vs Google), 4) Budget reallocation opportunities from underperformers to winners, 5) Creative testing velocity and hit rate analysis.'
    },
    {
      id: 'ad-churn',
      name: 'Ad Churn & Lifecycle Analysis',
      prompt: 'Examine ad creative churn patterns by analyzing: 1) Creative age distribution and spend allocation across age brackets, 2) Launch cohort performance over time, 3) Creative lifecycle optimization (when to refresh vs scale), 4) New creative adoption rate and effectiveness, 5) Recommendations for creative pipeline management and testing cadence.'
    },
    {
      id: 'account-control',
      name: 'Account Control & Zone Analysis',
      prompt: 'Using the CPA vs Spend scatter plot data, analyze: 1) Ads in each performance zone (scaling, testing, zombies, untapped), 2) Budget allocation efficiency and reallocation opportunities, 3) Scale-up candidates currently in testing phase, 4) Zombie ads wasting budget that should be paused immediately, 5) Untapped potential ads that need creative optimization or increased spend.'
    },
    {
      id: 'production-efficiency',
      name: 'Creative Production & Hit Rate',
      prompt: 'Assess creative production effectiveness by examining: 1) Monthly creative launch volume vs scaling success rate, 2) Creative hit rate analysis (what percentage of launched ads actually scale), 3) Production queue optimization based on winning creative patterns, 4) Platform-specific creative preferences and performance differences, 5) Resource allocation recommendations for creative team focus.'
    },
    {
      id: 'demographics-alignment',
      name: 'Demographics vs Creative Alignment',
      prompt: 'Compare creative output vs profitable demographics: 1) Which age/gender segments drive highest LTV and conversion rates, 2) Whether current creative style matches top-performing demographic preferences, 3) Creative misalignment risks (producing Gen Z content when profitable customers are older), 4) Demographic-specific creative recommendations, 5) Production pivot opportunities to better serve high-value segments.'
    }
  ],
  'Target Intelligence': [
    {
      id: 'target-performance',
      name: 'Target vs Actual Performance Analysis',
      prompt: 'Review target vs actual performance metrics and provide strategic recommendations for improving KPI achievement, budget allocation, and goal setting based on current trends and performance gaps.'
    }
  ],
  'Cohort Intelligence': [
    {
      id: 'cohort-retention',
      name: 'Cohort Retention Analysis',
      prompt: 'Analyze cohort retention patterns, lifetime value trends, and provide recommendations for improving customer retention and maximizing CLV by acquisition channel.'
    }
  ]
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
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [promptHistory, setPromptHistory] = useState<Array<{prompt: string, timestamp: string, response: string}>>([]);

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
      try {
        const parsed = JSON.parse(savedHistory);
        // Convert legacy string format to new object format
        const normalizedHistory = parsed.map((item: any) => {
          if (typeof item === 'string') {
            return {
              prompt: item,
              timestamp: 'Legacy entry',
              response: ''
            };
          }
          return item;
        });
        setPromptHistory(normalizedHistory);
      } catch (e) {
        console.warn('Failed to parse prompt history:', e);
      }
    }
  }, [title]);

  const savePrompt = (prompt: string) => {
    const storageKey = `ai-prompt-${title.toLowerCase().replace(/\s+/g, '-')}`;
    const historyKey = `ai-prompt-history-${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Always add to history when saving (create new version)
    if (prompt.trim() !== '' && prompt !== currentPrompt) {
      const newEntry = {
        prompt: currentPrompt,
        timestamp: new Date().toLocaleString(),
        response: 'Manual save'
      };
      
      const newHistory = [newEntry, ...promptHistory].slice(0, 10); // Keep last 10
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
    
    // Save current prompt and response to history
    const newEntry = {
      prompt: currentPrompt,
      timestamp: new Date().toLocaleString(),
      response: suggestions.join(' ') || 'Analysis generated based on current data.'
    };
    
    const updatedHistory = [newEntry, ...promptHistory.slice(0, 9)]; // Keep last 10
    setPromptHistory(updatedHistory);
    
    // Save to localStorage
    const historyKey = `ai-prompt-history-${title.toLowerCase().replace(/\s+/g, '-')}`;
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    
    setTimeout(() => setRefreshing(false), 1200);
  };

  const handleTemplateSelect = (template: {id: string, name: string, prompt: string}) => {
    setCurrentPrompt(template.prompt);
    
    // Save to localStorage
    const storageKey = `ai-prompt-${title.toLowerCase().replace(/\s+/g, '-')}`;
    localStorage.setItem(storageKey, template.prompt);
    
    setShowTemplateSelector(false);
  };

  const availableTemplates = AVAILABLE_TEMPLATES[title] || [];

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-warm-gold" />
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setShowPromptEdit(true)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs font-medium hover:bg-bg-surface transition-colors whitespace-nowrap"
          >
            <Settings size={12} />
            <span className="hidden sm:inline">Prompt</span>
          </button>
          <button
            onClick={() => setShowPromptHistory(true)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs font-medium hover:bg-bg-surface transition-colors whitespace-nowrap"
          >
            <History size={12} />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-brand-blue/15 text-brand-blue text-xs font-medium hover:bg-brand-blue/25 transition-colors whitespace-nowrap"
          >
            <FileText size={12} />
            <span className="hidden sm:inline">Templates</span>
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-warm-gold/15 text-warm-gold text-xs font-medium hover:bg-warm-gold/25 transition-colors whitespace-nowrap"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setVisible(!visible)}
            className="text-xs text-text-tertiary hover:text-text-secondary whitespace-nowrap"
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
                promptHistory.map((entry, index) => (
                  <div key={index} className="bg-bg-elevated border border-border rounded-md p-3">
                    <div className="text-xs text-text-tertiary mb-1">{entry.timestamp}</div>
                    <div className="text-sm text-text-primary mb-2 line-clamp-3">
                      {entry.prompt}
                    </div>
                    {entry.response && (
                      <div className="text-xs text-text-secondary mb-2 italic line-clamp-2">
                        Response: {entry.response.substring(0, 150)}...
                      </div>
                    )}
                    <button
                      onClick={() => restoreFromHistory(entry.prompt)}
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

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-3xl mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Select AI Analysis Template</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {availableTemplates.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">
                  No templates available for {title}. You can create templates in the Prompt Templates page.
                </p>
              ) : (
                availableTemplates.map((template) => (
                  <div key={template.id} className="bg-bg-elevated border border-border rounded-md p-4 hover:border-brand-blue/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-text-primary mb-1">{template.name}</h4>
                        <p className="text-sm text-text-secondary mb-3 line-clamp-2">{template.prompt.substring(0, 200)}...</p>
                        <button
                          onClick={() => handleTemplateSelect(template)}
                          className="text-xs bg-brand-blue text-white px-3 py-1.5 rounded-md hover:bg-brand-blue/90 transition-colors"
                        >
                          Use This Template
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setShowTemplateSelector(false)}
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
