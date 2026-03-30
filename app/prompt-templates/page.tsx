'use client';
import { useState, useEffect } from 'react';
import { FileText, Edit3, Save, Plus, History, X } from 'lucide-react';
import { getAllPrompts, updatePrompt, syncPromptChanges, type PromptTemplate } from '@/lib/prompt-registry';

// Remove local interface and sample data - now using centralized registry
const legacySampleTemplates: PromptTemplate[] = [
  // Creative Analysis Templates
  {
    id: 'creative-1',
    name: 'Creative Performance Analysis',
    description: 'Analyzes ad creative performance, identifies winners and losers',
    prompt: 'Analyze the creative performance data focusing on: 1) Which ad creatives are scaling efficiently (high spend, low CPA), 2) Creative fatigue indicators and refresh recommendations, 3) Platform-specific creative insights (Meta vs TikTok vs Google), 4) Budget reallocation opportunities from underperformers to winners, 5) Creative testing velocity and hit rate analysis.',
    category: 'Creative Analysis',
    lastModified: '2026-03-19'
  },
  {
    id: 'creative-2', 
    name: 'Ad Churn & Lifecycle Analysis',
    description: 'Evaluates creative aging and churn patterns across launch cohorts',
    prompt: 'Examine ad creative churn patterns by analyzing: 1) Creative age distribution and spend allocation across age brackets, 2) Launch cohort performance over time, 3) Creative lifecycle optimization (when to refresh vs scale), 4) New creative adoption rate and effectiveness, 5) Recommendations for creative pipeline management and testing cadence.',
    category: 'Creative Analysis',
    lastModified: '2026-03-19'
  },
  {
    id: 'creative-3',
    name: 'Account Control & Zone Analysis', 
    description: 'CPA vs Spend scatter analysis identifying scaling opportunities',
    prompt: 'Using the CPA vs Spend scatter plot data, analyze: 1) Ads in each performance zone (scaling, testing, zombies, untapped), 2) Budget allocation efficiency and reallocation opportunities, 3) Scale-up candidates currently in testing phase, 4) Zombie ads wasting budget that should be paused immediately, 5) Untapped potential ads that need creative optimization or increased spend.',
    category: 'Creative Analysis', 
    lastModified: '2026-03-19'
  },
  {
    id: 'creative-4',
    name: 'Creative Production & Hit Rate',
    description: 'Evaluates creative production efficiency and scaling success rate',
    prompt: 'Assess creative production effectiveness by examining: 1) Monthly creative launch volume vs scaling success rate, 2) Creative hit rate analysis (what percentage of launched ads actually scale), 3) Production queue optimization based on winning creative patterns, 4) Platform-specific creative preferences and performance differences, 5) Resource allocation recommendations for creative team focus.',
    category: 'Creative Analysis',
    lastModified: '2026-03-19'
  },
  {
    id: 'creative-5',
    name: 'Demographics vs Creative Alignment',
    description: 'Analyzes if creative production aligns with profitable audience segments', 
    prompt: 'Compare creative output vs profitable demographics: 1) Which age/gender segments drive highest LTV and conversion rates, 2) Whether current creative style matches top-performing demographic preferences, 3) Creative misalignment risks (producing Gen Z content when profitable customers are older), 4) Demographic-specific creative recommendations, 5) Production pivot opportunities to better serve high-value segments.',
    category: 'Creative Analysis',
    lastModified: '2026-03-19'
  },
  {
    id: '1',
    name: 'Linear Attribution Analysis',
    description: 'Analyzes performance using linear attribution model across all touchpoints',
    prompt: 'Using Linear Attribution model, analyze the customer journey data. Focus on: 1) Multi-touch conversion paths and how credit is distributed equally, 2) Channel interaction effects and assist rates, 3) True incrementality of each touchpoint, 4) Budget allocation recommendations based on linear attribution, 5) Comparison with last-click to understand attribution differences.',
    category: 'Attribution Models',
    lastModified: '2026-03-19'
  },
  {
    id: '2',
    name: 'First Click Attribution Analysis', 
    description: 'Evaluates performance through first click attribution lens',
    prompt: 'Apply First Click Attribution model to assess: 1) Which channels drive initial awareness most effectively, 2) Top-of-funnel performance and reach optimization, 3) Brand building vs performance channel effectiveness, 4) Customer acquisition source quality, 5) Budget allocation for awareness vs conversion campaigns.',
    category: 'Attribution Models',
    lastModified: '2026-03-19'
  },
  {
    id: '3',
    name: 'Last Click Attribution Analysis',
    description: 'Focuses on conversion-driving touchpoints using last click model',
    prompt: 'Using Last Click Attribution model, analyze: 1) Direct conversion drivers and closing channels, 2) Bottom-funnel performance optimization, 3) Channels getting full conversion credit accuracy, 4) Short-term ROAS and immediate performance, 5) Scaling recommendations for conversion-focused campaigns.',
    category: 'Attribution Models', 
    lastModified: '2026-03-19'
  },
  {
    id: '4',
    name: 'Time Decay Attribution Analysis',
    description: 'Weighted attribution giving more credit to recent touchpoints',
    prompt: 'Apply Time Decay Attribution model to evaluate: 1) Recency bias in conversion paths and its impact, 2) Which channels perform better as customers near conversion, 3) Optimal timing for retargeting and remarketing, 4) Budget allocation based on proximity to conversion, 5) Customer journey velocity insights.',
    category: 'Attribution Models',
    lastModified: '2026-03-19'
  },
  {
    id: '5',
    name: 'Position Based Attribution Analysis',
    description: 'U-shaped attribution crediting first and last touchpoints equally',
    prompt: 'Using Position Based (U-shaped) Attribution model, analyze: 1) First touch awareness vs last touch conversion effectiveness, 2) Middle funnel touchpoint optimization opportunities, 3) Channel role clarity in customer journey (awareness vs conversion), 4) Budget split between top and bottom funnel activities, 5) Creative strategy aligned with channel position in journey.',
    category: 'Attribution Models',
    lastModified: '2026-03-19'
  },
  {
    id: '6',
    name: 'Data-Driven Attribution Analysis',
    description: 'Machine learning based attribution model insights',
    prompt: 'Apply Data-Driven Attribution model to analyze: 1) AI-determined attribution weights vs rule-based models, 2) Unique customer journey patterns and micro-conversions, 3) True incremental value of each channel interaction, 4) Dynamic attribution based on user behavior, 5) Budget optimization using machine learning insights.',
    category: 'Attribution Models',
    lastModified: '2026-03-19'
  },
  {
    id: '7',
    name: 'Cross-Attribution Model Comparison',
    description: 'Compares performance across multiple attribution models',
    prompt: 'Compare Linear, First Click, Last Click, Time Decay, and Position Based attribution models. Analyze: 1) Channel performance variations across attribution models, 2) Which model best represents true business impact, 3) Attribution model selection for different campaign objectives, 4) Budget allocation differences between models, 5) Hybrid attribution approach recommendations.',
    category: 'Attribution Models',
    lastModified: '2026-03-19'
  },
  {
    id: '8',
    name: 'Attribution Window Analysis',
    description: 'Evaluates optimal attribution windows for different models',
    prompt: 'Analyze attribution windows (1-day, 7-day, 28-day click and view-through). Focus on: 1) Optimal attribution window by customer journey length, 2) Click vs view-through attribution impact, 3) Channel performance changes across different windows, 4) Customer consideration period insights, 5) Window selection recommendations by campaign type.',
    category: 'Attribution Models',
    lastModified: '2026-03-19'
  }
];

// Get dynamic categories from registry
const getDynamicCategories = (templates: PromptTemplate[]) => {
  const categories = ['All', ...new Set(templates.map(t => t.category))];
  return categories;
};

// Mock history data - in real implementation this would come from a database
const getTemplateHistory = (templateId: string) => [
  {
    version: 3,
    date: '2026-03-20 12:40 GMT+8',
    prompt: 'Current version of the prompt...',
    isCurrent: true
  },
  {
    version: 2,
    date: '2026-03-19 15:22 GMT+8', 
    prompt: 'Previous version with different focus...',
    isCurrent: false
  },
  {
    version: 1,
    date: '2026-03-18 09:15 GMT+8',
    prompt: 'Original version created...',
    isCurrent: false
  }
];

export default function PromptTemplatesPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PromptTemplate>>({});
  const [showHistory, setShowHistory] = useState<string | null>(null);

  // Load prompts from centralized registry on mount
  useEffect(() => {
    const registryPrompts = getAllPrompts();
    // Merge with any legacy templates for backwards compatibility
    const mergedTemplates = [...registryPrompts, ...legacySampleTemplates.filter(
      legacy => !registryPrompts.find(reg => reg.id === legacy.id)
    )];
    setTemplates(mergedTemplates);
  }, []);

  const filteredTemplates = selectedCategory === 'All' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);
  
  const categories = getDynamicCategories(templates);

  const startEdit = (template: PromptTemplate) => {
    setEditingTemplate(template.id);
    // Only allow editing prompt text, not name/description
    setEditForm({ prompt: template.prompt });
  };

  const saveEdit = () => {
    if (editingTemplate && editForm.prompt) {
      const originalTemplate = templates.find(t => t.id === editingTemplate)!;
      const updatedTemplate = { 
        ...originalTemplate,
        prompt: editForm.prompt, 
        lastModified: new Date().toISOString().split('T')[0] 
      };
      
      // Update in centralized registry and trigger sync
      updatePrompt(editingTemplate, updatedTemplate);
      syncPromptChanges(editingTemplate, updatedTemplate.prompt);
      
      // Update local state
      setTemplates(templates.map(t => 
        t.id === editingTemplate ? updatedTemplate : t
      ));
      
      setEditingTemplate(null);
      setEditForm({});
    }
  };

  const restoreFromHistory = (templateId: string, historicalPrompt: string) => {
    const originalTemplate = templates.find(t => t.id === templateId)!;
    const restoredTemplate = {
      ...originalTemplate,
      prompt: historicalPrompt,
      lastModified: new Date().toISOString().split('T')[0]
    };

    // Update in centralized registry and trigger sync
    updatePrompt(templateId, restoredTemplate);
    syncPromptChanges(templateId, restoredTemplate.prompt);

    // Update local state
    setTemplates(templates.map(t => 
      t.id === templateId ? restoredTemplate : t
    ));

    setShowHistory(null);
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setEditForm({});
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  const addNewTemplate = () => {
    const newTemplate: PromptTemplate = {
      id: Date.now().toString(),
      name: 'New Template',
      description: 'Describe what this prompt template does',
      prompt: 'Enter your prompt template here...',
      category: 'Custom',
      lastModified: new Date().toISOString().split('T')[0]
    };
    setTemplates([newTemplate, ...templates]);
    startEdit(newTemplate);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-blue-light" />
            Prompt Templates
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Manage AI analysis prompts used throughout the dashboard
          </p>
        </div>

      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-brand-blue/15 text-brand-blue-light'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 space-y-4"
          >
            {editingTemplate === template.id ? (
              // Edit Mode - Only allow prompt text editing
              <div className="space-y-4">
                <div className="bg-bg-elevated rounded-md p-3 text-xs text-text-secondary">
                  <strong>Note:</strong> Only prompt text can be edited. Name and description are managed by the system.
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-2 block">Template Name (Read-only)</label>
                  <div className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm text-text-primary opacity-50">
                    {template.name}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-2 block">Description (Read-only)</label>
                  <div className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm text-text-secondary opacity-50">
                    {template.description}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-2 block">Prompt Text (Editable)</label>
                  <textarea
                    value={editForm.prompt || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, prompt: e.target.value }))}
                    rows={8}
                    className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm text-text-primary outline-none focus:border-brand-blue transition-colors resize-none"
                    placeholder="Enter your prompt template..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="flex items-center gap-1 px-3 py-1.5 bg-success text-white rounded-md text-sm font-medium hover:bg-success/80 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 bg-bg-elevated text-text-secondary border border-border rounded-md text-sm font-medium hover:bg-bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {template.name}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setShowHistory(template.id)}
                      className="p-1 text-text-tertiary hover:text-brand-blue transition-colors"
                      title="View history"
                    >
                      <History className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => startEdit(template)}
                      className="p-1 text-text-tertiary hover:text-brand-blue transition-colors"
                      title="Edit prompt text only"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-1 bg-brand-blue/10 text-brand-blue-light rounded-full font-medium">
                      {template.category}
                    </span>
                    <span className="text-text-tertiary">
                      Updated {template.lastModified}
                    </span>
                  </div>
                </div>

                <div className="bg-bg-elevated rounded-md p-3">
                  <div className="text-xs text-text-secondary mb-2 font-medium">Prompt:</div>
                  <div className="text-xs text-text-primary leading-relaxed max-h-32 overflow-y-auto">
                    {template.prompt}
                  </div>
                </div>


              </>
            )}
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <h3 className="text-sm font-medium text-text-primary mb-1">No templates found</h3>
          <p className="text-sm text-text-secondary mb-4">
            {selectedCategory === 'All' 
              ? 'Create your first prompt template to get started'
              : `No templates in the ${selectedCategory} category`
            }
          </p>

        </div>
      )}

      {/* History Dialog */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface border border-border rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">
                Prompt History: {templates.find(t => t.id === showHistory)?.name}
              </h3>
              <button
                onClick={() => setShowHistory(null)}
                className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-text-secondary uppercase">
                      <th className="text-left py-3 px-3 font-medium">Version</th>
                      <th className="text-left py-3 px-3 font-medium">Date</th>
                      <th className="text-left py-3 px-3 font-medium">Prompt</th>
                      <th className="text-center py-3 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTemplateHistory(showHistory).map((historyItem) => (
                      <tr key={historyItem.version} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                        <td className="py-3 px-3 text-text-primary font-medium">
                          v{historyItem.version}
                          {historyItem.isCurrent && (
                            <span className="ml-2 px-2 py-0.5 bg-success/15 text-success rounded-full text-xs font-medium">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-text-secondary">
                          {historyItem.date}
                        </td>
                        <td className="py-3 px-3 text-text-primary max-w-md">
                          <div className="truncate">
                            {historyItem.prompt}
                          </div>
                          <div className="text-xs text-text-tertiary mt-1">
                            {historyItem.prompt.length} characters
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {!historyItem.isCurrent && (
                            <button
                              onClick={() => restoreFromHistory(showHistory, historyItem.prompt)}
                              className="px-3 py-1.5 bg-brand-blue text-white rounded-md text-xs font-medium hover:bg-brand-blue-light transition-colors"
                            >
                              Restore
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}