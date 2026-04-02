'use client';
import { useState, useCallback } from 'react';
import { Download, FileText, ChevronDown, ChevronRight, Minus } from 'lucide-react';

interface ExportSection {
  id: string;
  name: string;
  children?: ExportSection[];
}

const exportSections: ExportSection[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    children: [
      { id: 'kpi-cards', name: 'KPI Cards (Revenue, MER, Orders, CAC, etc.)' },
      { id: 'revenue-chart', name: 'Revenue & Marketing Costs Chart' },
      { id: 'orders-chart', name: 'Net Orders & New Customers Chart' },
      { id: 'unique-sessions', name: 'Unique Sessions (GA4)' },
      { id: 'channel-attribution', name: 'Channel Attribution Table' },
      { id: 'revenue-composition', name: 'Revenue Composition Chart' },
      { id: 'product-kpis', name: 'Product KPIs Table' },
    ]
  },
  {
    id: 'pnl',
    name: 'Profit & Loss',
    children: [
      { id: 'pnl-summary', name: 'P&L Summary KPIs' },
      { id: 'pnl-income-expenses', name: 'Income vs Expenses Chart' },
      { id: 'pnl-margins', name: 'Gross & Net Margin Chart' },
      { id: 'pnl-breakdown', name: 'P&L Breakdown Table' },
    ]
  },
  {
    id: 'creative',
    name: 'Creative & MTA',
    children: [
      { id: 'account-control', name: 'Account Control (CPA vs Spend)' },
      { id: 'ad-churn', name: 'Ad Churn (Spend by Creative Age)' },
      { id: 'creative-churn-cohort', name: 'Creative Churn Cohort' },
      { id: 'slugging-rate', name: 'Slugging Rate' },
      { id: 'pareto', name: 'Pareto Analysis' },
      { id: 'demographics', name: 'Demographics' },
    ]
  },
  {
    id: 'cohorts',
    name: 'Cohorts',
    children: [
      { id: 'cohort-retention', name: 'Retention Matrix' },
      { id: 'cohort-ltv', name: 'LTV Analysis' },
    ]
  },
];

// Collect all leaf IDs from a section
function getAllIds(sections: ExportSection[]): string[] {
  return sections.flatMap(s => [s.id, ...(s.children ? getAllIds(s.children) : [])]);
}

function getChildIds(section: ExportSection): string[] {
  if (!section.children) return [];
  return section.children.flatMap(c => [c.id, ...getChildIds(c)]);
}

export default function PDFExportPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['dashboard', 'pnl', 'creative', 'cohorts']));
  const [isExporting, setIsExporting] = useState(false);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Parent-child checkbox logic
  const toggleSelect = useCallback((section: ExportSection) => {
    setSelected(prev => {
      const next = new Set(prev);
      const childIds = getChildIds(section);
      const allIds = [section.id, ...childIds];
      const allSelected = allIds.every(id => next.has(id));

      if (allSelected) {
        // Uncheck all
        allIds.forEach(id => next.delete(id));
      } else {
        // Check all
        allIds.forEach(id => next.add(id));
      }

      // Update parent states upward
      updateParents(next, exportSections);
      return next;
    });
  }, []);

  // Recursively update parent checkbox states
  function updateParents(sel: Set<string>, sections: ExportSection[]) {
    for (const section of sections) {
      if (section.children && section.children.length > 0) {
        updateParents(sel, section.children);
        const childIds = getChildIds(section);
        const allChecked = childIds.length > 0 && childIds.every(id => sel.has(id));
        if (allChecked) {
          sel.add(section.id);
        } else {
          sel.delete(section.id);
        }
      }
    }
  }

  // Get checkbox state: 'checked', 'indeterminate', 'unchecked'
  const getCheckState = (section: ExportSection): 'checked' | 'indeterminate' | 'unchecked' => {
    if (!section.children || section.children.length === 0) {
      return selected.has(section.id) ? 'checked' : 'unchecked';
    }
    const childIds = getChildIds(section);
    const checkedCount = childIds.filter(id => selected.has(id)).length;
    if (checkedCount === 0) return 'unchecked';
    if (checkedCount === childIds.length) return 'checked';
    return 'indeterminate';
  };

  const selectAll = () => {
    const all = new Set(getAllIds(exportSections));
    setSelected(all);
  };

  const clearAll = () => setSelected(new Set());

  const selectedLeafCount = Array.from(selected).filter(id => {
    // Count only leaf nodes (no children)
    const find = (sections: ExportSection[]): ExportSection | null => {
      for (const s of sections) {
        if (s.id === id) return s;
        if (s.children) { const f = find(s.children); if (f) return f; }
      }
      return null;
    };
    const section = find(exportSections);
    return section && (!section.children || section.children.length === 0);
  }).length;

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const { generateDataPDF } = await import('@/lib/data-pdf-generator');
      await generateDataPDF(Array.from(selected));
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderSection = (section: ExportSection, level: number = 0) => {
    const isExpanded = expanded.has(section.id);
    const hasChildren = section.children && section.children.length > 0;
    const checkState = getCheckState(section);

    return (
      <div key={section.id} className={level === 0 ? 'border border-border rounded-lg mb-2' : 'mb-1'}>
        <div
          className={`flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors ${
            level === 0 ? 'bg-bg-surface' : 'bg-bg-elevated/50 hover:bg-bg-elevated'
          }`}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(section.id)} className="text-text-secondary hover:text-text-primary shrink-0">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-[14px] shrink-0" />
          )}

          <button
            onClick={() => toggleSelect(section)}
            className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
              checkState === 'checked'
                ? 'bg-brand-blue border-brand-blue text-white'
                : checkState === 'indeterminate'
                ? 'bg-brand-blue/30 border-brand-blue text-brand-blue'
                : 'bg-bg-elevated border-border hover:border-text-secondary'
            }`}
          >
            {checkState === 'checked' && <span className="text-[10px]">✓</span>}
            {checkState === 'indeterminate' && <Minus size={10} />}
          </button>

          <span
            className={`text-sm cursor-pointer select-none ${
              level === 0 ? 'font-semibold text-text-primary' : 'text-text-primary'
            }`}
            onClick={() => toggleSelect(section)}
          >
            {section.name}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div className={`${level === 0 ? 'border-t border-border p-2 bg-bg-elevated/30' : 'pl-5'}`}>
            {section.children!.map(child => renderSection(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Download size={24} />
          PDF Export
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Select sections to include in your PDF report. Data is pulled live from connected sources.
        </p>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center gap-3">
        <button onClick={selectAll} className="px-3 py-1.5 text-xs bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 transition-colors">
          Select All
        </button>
        <button onClick={clearAll} className="px-3 py-1.5 text-xs bg-bg-elevated text-text-primary border border-border rounded-md hover:bg-bg-surface transition-colors">
          Clear All
        </button>
        <span className="text-xs text-text-secondary">
          {selectedLeafCount} item{selectedLeafCount !== 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Hierarchical Selection */}
      <div className="bg-bg-surface border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium text-text-primary mb-3">Select Sections to Export</h3>
        <div className="space-y-1">
          {exportSections.map(section => renderSection(section))}
        </div>
      </div>

      {/* Export Button */}
      <div className="flex items-center gap-4 p-4 bg-bg-surface border border-border rounded-lg">
        <button
          onClick={exportPDF}
          disabled={selectedLeafCount === 0 || isExporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-success text-white rounded-md hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isExporting ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileText size={16} />
              Export PDF ({selectedLeafCount} sections)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
