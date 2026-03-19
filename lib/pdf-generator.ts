import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PDFSection {
  id: string;
  name: string;
  selector?: string;
  pageBreak?: boolean;
}

export class PDFGenerator {
  private pdf: jsPDF;
  private currentY: number = 20;
  private pageHeight: number = 297; // A4 height in mm
  private pageWidth: number = 210; // A4 width in mm
  private margin: number = 15;

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4');
  }

  private addTitle(title: string) {
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(title, this.margin, this.currentY);
    this.currentY += 15;
  }

  private addSubtitle(subtitle: string) {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(subtitle, this.margin, this.currentY);
    this.currentY += 10;
  }

  private addText(text: string) {
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    const lines = this.pdf.splitTextToSize(text, this.pageWidth - (this.margin * 2));
    this.pdf.text(lines, this.margin, this.currentY);
    this.currentY += lines.length * 4;
  }

  private async captureElement(selector: string, title: string): Promise<void> {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      this.addText(`❌ Section "${title}" not found`);
      return;
    }

    try {
      // Temporarily show hidden elements for capture
      const originalDisplay = element.style.display;
      const originalVisibility = element.style.visibility;
      element.style.display = 'block';
      element.style.visibility = 'visible';

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
      });

      // Restore original styles
      element.style.display = originalDisplay;
      element.style.visibility = originalVisibility;

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = this.pageWidth - (this.margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if we need a new page
      if (this.currentY + imgHeight > this.pageHeight - this.margin) {
        this.pdf.addPage();
        this.currentY = this.margin;
      }

      this.addSubtitle(title);
      this.pdf.addImage(imgData, 'PNG', this.margin, this.currentY, imgWidth, imgHeight);
      this.currentY += imgHeight + 10;

    } catch (error) {
      console.error(`Error capturing ${selector}:`, error);
      this.addText(`❌ Error capturing "${title}": ${error}`);
    }
  }

  async generateDashboardPDF(sections: PDFSection[]): Promise<void> {
    // Add header
    this.addTitle('Click-Man Dashboard Export');
    this.addText(`Generated: ${new Date().toLocaleString()}`);
    this.addText(`Sections: ${sections.length}`);
    this.currentY += 10;

    // Process each section
    for (const section of sections) {
      if (section.pageBreak && this.currentY > this.margin + 20) {
        this.pdf.addPage();
        this.currentY = this.margin;
      }

      if (section.selector) {
        await this.captureElement(section.selector, section.name);
      } else {
        this.addSubtitle(section.name);
        this.addText('Section data not available for capture.');
        this.currentY += 5;
      }
    }
  }

  async generateKPICards(): Promise<void> {
    const kpiSelectors = [
      { selector: '[data-testid="kpi-net-revenue"]', title: 'Net Revenue KPI' },
      { selector: '[data-testid="kpi-marketing-costs"]', title: 'Marketing Costs KPI' },
      { selector: '[data-testid="kpi-mer"]', title: 'MER KPI' },
      { selector: '[data-testid="kpi-amer"]', title: 'aMER KPI' },
      { selector: '[data-testid="kpi-orders"]', title: 'Orders KPI' },
      { selector: '[data-testid="kpi-nc-orders"]', title: 'NC Orders KPI' },
      { selector: '[data-testid="kpi-cac"]', title: 'CAC KPI' },
      { selector: '[data-testid="kpi-ncac"]', title: 'nCAC KPI' },
    ];

    this.addTitle('Key Performance Indicators');
    
    for (const kpi of kpiSelectors) {
      await this.captureElement(kpi.selector, kpi.title);
    }
  }

  async generateCharts(): Promise<void> {
    const chartSelectors = [
      { selector: '[data-testid="revenue-chart"]', title: 'Revenue & Marketing Costs Trend' },
      { selector: '[data-testid="orders-chart"]', title: 'Orders & New Customers Trend' },
      { selector: '[data-testid="attribution-table"]', title: 'Channel Attribution Table' },
      { selector: '[data-testid="revenue-composition"]', title: 'Revenue Composition Chart' },
    ];

    this.addTitle('Charts & Analytics');
    
    for (const chart of chartSelectors) {
      await this.captureElement(chart.selector, chart.title);
    }
  }

  save(filename: string = `click-man-export-${new Date().toISOString().split('T')[0]}.pdf`) {
    this.pdf.save(filename);
  }
}

// Helper function to generate a comprehensive dashboard PDF
export async function generateComprehensivePDF(selectedSections: string[]): Promise<void> {
  const generator = new PDFGenerator();

  try {
    // Wait a bit for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (selectedSections.includes('dashboard') || selectedSections.includes('daily-overview')) {
      await generator.generateKPICards();
      await generator.generateCharts();
    }

    if (selectedSections.includes('attribution-tree')) {
      const sections: PDFSection[] = [
        { 
          id: 'mer-overview', 
          name: 'MER/nCAC Overview', 
          selector: '[data-testid="mer-overview"]',
          pageBreak: true 
        },
        { 
          id: 'attribution-chart', 
          name: 'Attribution Analysis', 
          selector: '[data-testid="attribution-chart"]' 
        },
        { 
          id: 'tracking-health', 
          name: 'Tracking Infrastructure', 
          selector: '[data-testid="tracking-health"]' 
        },
      ];

      await generator.generateDashboardPDF(sections);
    }

    generator.save();
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}