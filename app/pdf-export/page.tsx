'use client';
import { useState } from 'react';
import { Download, FileText, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface ExportSection {
  id: string;
  name: string;
  children?: ExportSection[];
  excluded?: boolean;
}

const exportSections: ExportSection[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    children: [
      {
        id: 'daily-overview',
        name: 'Daily Overview',
        children: [
          { id: 'cac-ltv-ratio', name: 'CAC/LTV Ratio Card' },
          { id: 'ltv-per-customer', name: 'LTV per Customer Card' },
          { id: 'net-revenue-card', name: 'Net Revenue KPI' },
          { id: 'marketing-costs-card', name: 'Marketing Costs KPI' },
          { id: 'mer-card', name: 'MER KPI' },
          { id: 'amer-card', name: 'aMER KPI' },
          { id: 'orders-card', name: 'Orders KPI' },
          { id: 'nc-orders-card', name: 'NC Orders KPI' },
          { id: 'cac-card', name: 'CAC KPI' },
          { id: 'ncac-card', name: 'nCAC KPI' },
          { id: 'revenue-chart', name: 'Revenue & Marketing Costs Chart' },
          { id: 'orders-chart', name: 'Net Orders & New Customers Chart' },
          { id: 'marketing-insights', name: 'Marketing Insights' },
          { id: 'marketing-trend', name: 'Marketing Metrics Trend' },
          { id: 'channel-attribution', name: 'Channel Attribution Table' },
          { id: 'revenue-composition', name: 'Revenue Composition Chart' },
          { id: 'product-kpis', name: 'Product KPIs Table' },
        ]
      }
    ]
  },
  {
    id: 'attribution-tree',
    name: 'Attribution Tree',
    children: [
      {
        id: 'mer-ncac',
        name: 'MER/nCAC Overview',
        children: [
          { id: 'mer-cards', name: 'MER & nCAC Cards' },
          { id: 'max-spend', name: 'Max Marketing Spend' },
          { id: 'target-cpa', name: 'Target CPA' },
        ]
      },
      {
        id: 'surveys-mmm',
        name: 'Surveys & MMM Section',
        children: [
          { id: 'survey-chart', name: 'Post-Purchase Survey Chart' },
          { id: 'survey-breakdown', name: 'Channel Attribution Breakdown' },
        ]
      },
      {
        id: 'tracking-infra',
        name: 'Tracking Infrastructure',
        children: [
          { id: 'tracking-health', name: 'Tracking Health Status' },
          { id: 'pixel-status', name: 'Pixel & CAPI Status' },
        ]
      },
    ]
  }
];

const excludedSections = [
  'Intelligence reports',
  'AI summaries', 
  'Targets & Goals',
  'Prompt templates',
  'Final Items',
  'P&L',
  'Cashflow'
];

export default function PDFExportPage() {
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['dashboard', 'attribution-tree']));
  const [isExporting, setIsExporting] = useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const toggleSelection = (sectionId: string) => {
    setSelectedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const getAllIds = (sections: ExportSection[]): string[] => {
      return sections.flatMap(section => [
        section.id,
        ...(section.children ? getAllIds(section.children) : [])
      ]);
    };
    setSelectedSections(new Set(getAllIds(exportSections)));
  };

  const clearAll = () => {
    setSelectedSections(new Set());
  };

  const exportPDF = async () => {
    setIsExporting(true);
    
    try {
      const selectedItems = Array.from(selectedSections);
      
      // Show progress message
      const progressDiv = document.createElement('div');
      progressDiv.id = 'pdf-progress';
      progressDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 20px 40px;
        border-radius: 8px;
        z-index: 9999;
        text-align: center;
        font-family: Arial, sans-serif;
      `;
      progressDiv.innerHTML = `
        <div>📊 Generating PDF Export...</div>
        <div style="margin-top: 10px; font-size: 14px;">
          Generating report with live dashboard data
        </div>
        <div style="margin-top: 10px; font-size: 12px; opacity: 0.8;">
          Including KPIs, channel attribution, and tracking health
        </div>
      `;
      document.body.appendChild(progressDiv);

      // Try the advanced DOM capture method first, fallback to data-only PDF
      try {
        // Dynamic import for DOM capture
        const { generateComprehensivePDF } = await import('@/lib/pdf-generator');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for content to settle
        await generateComprehensivePDF(selectedItems);
      } catch (domError) {
        console.warn('DOM capture failed, falling back to data-only PDF:', domError);
        
        // Fallback to data-focused PDF
        const { generateDataPDF } = await import('@/lib/data-pdf-generator');
        await generateDataPDF();
      }
      
      // Remove progress indicator
      const progress = document.getElementById('pdf-progress');
      if (progress) progress.remove();
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.style.cssText = progressDiv.style.cssText;
      successDiv.style.background = 'rgba(16, 185, 129, 0.9)'; // Green background
      successDiv.innerHTML = `
        <div>✅ PDF Export Complete!</div>
        <div style="margin-top: 10px; font-size: 14px;">
          Your Click-Man dashboard report has been downloaded
        </div>
        <div style="margin-top: 10px; font-size: 12px; opacity: 0.9;">
          Contains real KPI values, channel data, and tracking metrics
        </div>
        <div style="margin-top: 15px;">
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="padding: 8px 16px; background: rgba(0,0,0,0.2); color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </div>
      `;
      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 5000);
      
      setIsExporting(false);
    } catch (error) {
      console.error('PDF generation failed:', error);
      
      // Remove progress indicator
      const progress = document.getElementById('pdf-progress');
      if (progress) progress.remove();
      
      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(239, 68, 68, 0.9);
        color: white;
        padding: 20px 40px;
        border-radius: 8px;
        z-index: 9999;
        text-align: center;
        font-family: Arial, sans-serif;
      `;
      errorDiv.innerHTML = `
        <div>❌ PDF Export Failed</div>
        <div style="margin-top: 10px; font-size: 14px;">
          ${error instanceof Error ? error.message : 'Unable to generate PDF export'}
        </div>
        <div style="margin-top: 10px; font-size: 12px; opacity: 0.8;">
          Please try again or contact support if the issue persists
        </div>
        <div style="margin-top: 15px;">
          <button onclick="this.parentElement.remove()" 
                  style="padding: 8px 16px; background: rgba(0,0,0,0.3); color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </div>
      `;
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 10000);
      
      setIsExporting(false);
    }
  };

  const renderSection = (section: ExportSection, level: number = 0) => {
    const isExpanded = expandedSections.has(section.id);
    const isSelected = selectedSections.has(section.id);
    const hasChildren = section.children && section.children.length > 0;

    return (
      <div key={section.id} className="border border-border rounded-lg mb-2">
        <div className={`flex items-center p-3 ${level > 0 ? 'bg-bg-elevated' : 'bg-bg-surface'}`}>
          {hasChildren && (
            <button
              onClick={() => toggleSection(section.id)}
              className="mr-2 text-text-secondary hover:text-text-primary"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          
          <div className="flex items-center flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelection(section.id)}
              className="mr-3 w-4 h-4 text-brand-blue bg-bg-elevated border-border rounded focus:ring-brand-blue"
            />
            <span className="text-sm font-medium text-text-primary">{section.name}</span>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="border-t border-border bg-bg-elevated/30 p-2">
            {section.children!.map(child => renderSection(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Download size={24} />
          PDF Export
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Select dashboard sections and individual metrics/charts to export as downloadable PDFs.
        </p>
      </div>



      {/* Selection Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={selectAll}
          className="px-3 py-1.5 text-xs bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 transition-colors"
        >
          Select All
        </button>
        <button
          onClick={clearAll}
          className="px-3 py-1.5 text-xs bg-bg-elevated text-text-primary border border-border rounded-md hover:bg-bg-surface transition-colors"
        >
          Clear All
        </button>
        <span className="text-xs text-text-secondary">
          {selectedSections.size} item{selectedSections.size !== 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Hierarchical Selection */}
      <div className="bg-bg-surface border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium text-text-primary mb-4">Select Sections to Export</h3>
        <div className="space-y-2">
          {exportSections.map(section => renderSection(section))}
        </div>
      </div>

      {/* Export Button */}
      <div className="flex items-center gap-4 p-4 bg-bg-surface border border-border rounded-lg">
        <button
          onClick={exportPDF}
          disabled={selectedSections.size === 0 || isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileText size={16} />
              Export Selected ({selectedSections.size})
            </>
          )}
        </button>
        
        {selectedSections.size > 0 && (
          <div className="text-xs text-text-secondary">
            PDF will include {selectedSections.size} selected section{selectedSections.size !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}