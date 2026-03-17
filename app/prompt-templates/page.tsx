'use client';
import { useState } from 'react';
import { FileText, Edit3, Save, Plus, Trash2, RefreshCw } from 'lucide-react';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  lastModified: string;
}

const sampleTemplates: PromptTemplate[] = [
  {
    id: '1',
    name: 'Performance Analysis',
    description: 'Analyzes ad creative performance and provides actionable insights',
    prompt: 'Analyze the performance data for these ad creatives. Focus on identifying: 1) Top performing ads and why they work, 2) Underperforming ads that need optimization, 3) Specific recommendations for scaling winners, 4) Creative fatigue indicators, 5) Budget reallocation suggestions.',
    category: 'Creative Analysis',
    lastModified: '2026-03-16'
  },
  {
    id: '2',
    name: 'Attribution Analysis',
    description: 'Cross-channel attribution insights and recommendations',
    prompt: 'Based on the attribution data across all layers (MER/nCAC, surveys, platform data, tracking health, cohort LTV), provide: 1) Channel allocation recommendations, 2) Attribution discrepancies to investigate, 3) Budget reallocation opportunities, 4) Tracking infrastructure priorities, 5) Cross-layer validation insights.',
    category: 'Attribution',
    lastModified: '2026-03-16'
  },
  {
    id: '3',
    name: 'Account Control Analysis',
    description: 'CPA vs Spend quadrant analysis for ad optimization',
    prompt: 'Analyze the CPA vs Spend scatter plot data. Categorize ads into quadrants and provide: 1) Scaling opportunities (low CPA, high spend), 2) Zombie ads to pause (high CPA, high spend), 3) Testing prospects to scale (low CPA, low spend), 4) Learning phase ads needing attention, 5) Specific CPA targets and budget recommendations.',
    category: 'Account Management',
    lastModified: '2026-03-16'
  }
];

const categories = ['All', 'Creative Analysis', 'Attribution', 'Account Management', 'Cohort Analysis', 'Performance'];

export default function PromptTemplatesPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>(sampleTemplates);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PromptTemplate>>({});

  const filteredTemplates = selectedCategory === 'All' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const startEdit = (template: PromptTemplate) => {
    setEditingTemplate(template.id);
    setEditForm(template);
  };

  const saveEdit = () => {
    if (editingTemplate && editForm.name && editForm.prompt) {
      setTemplates(templates.map(t => 
        t.id === editingTemplate 
          ? { ...t, ...editForm, lastModified: new Date().toISOString().split('T')[0] }
          : t
      ));
      setEditingTemplate(null);
      setEditForm({});
    }
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
      category: 'Creative Analysis',
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
        <button
          onClick={addNewTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-medium hover:bg-brand-blue-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
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
              // Edit Mode
              <div className="space-y-4">
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm text-text-primary outline-none focus:border-brand-blue transition-colors"
                  placeholder="Template name"
                />
                <input
                  type="text"
                  value={editForm.description || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm text-text-secondary outline-none focus:border-brand-blue transition-colors"
                  placeholder="Template description"
                />
                <select
                  value={editForm.category || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm text-text-primary outline-none focus:border-brand-blue transition-colors"
                >
                  {categories.slice(1).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <textarea
                  value={editForm.prompt || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, prompt: e.target.value }))}
                  rows={8}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm text-text-primary outline-none focus:border-brand-blue transition-colors resize-none"
                  placeholder="Enter your prompt template..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="flex items-center gap-1 px-3 py-1.5 bg-success text-white rounded-md text-sm font-medium hover:bg-success/80 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    Save
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
                      onClick={() => startEdit(template)}
                      className="p-1 text-text-tertiary hover:text-brand-blue transition-colors"
                      title="Edit template"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-1 text-text-tertiary hover:text-danger transition-colors"
                      title="Delete template"
                    >
                      <Trash2 className="w-3 h-3" />
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

                <div className="flex gap-2 pt-2">
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-bg-elevated text-text-secondary border border-border rounded-md text-xs font-medium hover:bg-bg-surface hover:text-text-primary transition-colors">
                    <RefreshCw className="w-3 h-3" />
                    Test Prompt
                  </button>
                  <button className="px-3 py-1.5 bg-bg-elevated text-text-secondary border border-border rounded-md text-xs font-medium hover:bg-bg-surface hover:text-text-primary transition-colors">
                    Copy
                  </button>
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
          <button
            onClick={addNewTemplate}
            className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-medium hover:bg-brand-blue-light transition-colors"
          >
            Create Template
          </button>
        </div>
      )}
    </div>
  );
}