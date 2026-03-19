import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { kpiCards, channelAttribution, trackingHealth } from './sample-data';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export class DataPDFGenerator {
  private pdf: jsPDF;
  private currentY: number = 20;
  private pageHeight: number = 297;
  private pageWidth: number = 210;
  private margin: number = 15;

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4');
  }

  private addTitle(title: string) {
    this.pdf.setFontSize(18);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(title, this.margin, this.currentY);
    this.currentY += 12;
  }

  private addSubtitle(subtitle: string) {
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(subtitle, this.margin, this.currentY);
    this.currentY += 8;
  }

  private addText(text: string) {
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    const lines = this.pdf.splitTextToSize(text, 180);
    this.pdf.text(lines, this.margin, this.currentY);
    this.currentY += lines.length * 4 + 2;
  }

  private checkPageBreak(height: number) {
    if (this.currentY + height > this.pageHeight - this.margin) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }
  }

  addHeader() {
    this.addTitle('Click-Man Dashboard Export');
    this.addText(`Generated: ${new Date().toLocaleString()}`);
    this.addText('Real-time marketing analytics and performance metrics');
    this.currentY += 5;
  }

  addKPISection() {
    this.checkPageBreak(60);
    this.addSubtitle('Key Performance Indicators');
    
    const kpiData = [
      ['Metric', 'Current Value', 'Target', 'Achievement', 'Change'],
      ['Net Revenue', `₱${(kpiCards.netRevenue.value / 1000000).toFixed(1)}M`, `₱${(kpiCards.netRevenue.target / 1000000).toFixed(1)}M`, `${((kpiCards.netRevenue.value / kpiCards.netRevenue.target) * 100).toFixed(1)}%`, `${((kpiCards.netRevenue.value - kpiCards.netRevenue.prev) / kpiCards.netRevenue.prev * 100).toFixed(1)}%`],
      ['Marketing Costs', `₱${(kpiCards.marketingCosts.value / 1000).toFixed(0)}K`, `₱${(kpiCards.marketingCosts.target / 1000).toFixed(0)}K`, `${((kpiCards.marketingCosts.value / kpiCards.marketingCosts.target) * 100).toFixed(1)}%`, `${((kpiCards.marketingCosts.value - kpiCards.marketingCosts.prev) / kpiCards.marketingCosts.prev * 100).toFixed(1)}%`],
      ['MER', `${kpiCards.mer.value}x`, `${kpiCards.mer.target}x`, `${((kpiCards.mer.value / kpiCards.mer.target) * 100).toFixed(1)}%`, `${((kpiCards.mer.value - kpiCards.mer.prev) / kpiCards.mer.prev * 100).toFixed(1)}%`],
      ['aMER', `${kpiCards.nmer.value}x`, `${kpiCards.nmer.target}x`, `${((kpiCards.nmer.value / kpiCards.nmer.target) * 100).toFixed(1)}%`, `${((kpiCards.nmer.value - kpiCards.nmer.prev) / kpiCards.nmer.prev * 100).toFixed(1)}%`],
      ['Orders', `${kpiCards.netOrders.value.toLocaleString()}`, `${kpiCards.netOrders.target.toLocaleString()}`, `${((kpiCards.netOrders.value / kpiCards.netOrders.target) * 100).toFixed(1)}%`, `${((kpiCards.netOrders.value - kpiCards.netOrders.prev) / kpiCards.netOrders.prev * 100).toFixed(1)}%`],
      ['NC Orders', `${kpiCards.newCustomers.value.toLocaleString()}`, `${kpiCards.newCustomers.target.toLocaleString()}`, `${((kpiCards.newCustomers.value / kpiCards.newCustomers.target) * 100).toFixed(1)}%`, `${((kpiCards.newCustomers.value - kpiCards.newCustomers.prev) / kpiCards.newCustomers.prev * 100).toFixed(1)}%`],
      ['CAC', `₱${kpiCards.cac.value.toLocaleString()}`, `₱${kpiCards.cac.target.toLocaleString()}`, `${((kpiCards.cac.target / kpiCards.cac.value) * 100).toFixed(1)}%`, `${((kpiCards.cac.value - kpiCards.cac.prev) / kpiCards.cac.prev * 100).toFixed(1)}%`],
      ['nCAC', `₱${kpiCards.ncac.value.toLocaleString()}`, `₱${kpiCards.ncac.target.toLocaleString()}`, `${((kpiCards.ncac.target / kpiCards.ncac.value) * 100).toFixed(1)}%`, `${((kpiCards.ncac.value - kpiCards.ncac.prev) / kpiCards.ncac.prev * 100).toFixed(1)}%`],
    ];

    this.pdf.autoTable({
      head: [kpiData[0]],
      body: kpiData.slice(1),
      startY: this.currentY,
      theme: 'striped',
      headStyles: { fillColor: [74, 107, 214], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      fontSize: 9,
      cellPadding: 3,
    });

    this.currentY = (this.pdf as any).lastAutoTable.finalY + 10;
  }

  addChannelAttributionSection() {
    this.checkPageBreak(40);
    this.addSubtitle('Channel Attribution Analysis');
    
    const channelData = [
      ['Channel', 'Costs', 'Revenue', 'ROAS', 'Orders', 'CPO', 'New Customers'],
      ...channelAttribution.map(channel => [
        channel.channel,
        `₱${(channel.costs / 1000).toFixed(0)}K`,
        `₱${(channel.revenue / 1000).toFixed(0)}K`,
        channel.roas > 0 ? `${channel.roas.toFixed(2)}x` : 'N/A',
        channel.orders.toString(),
        channel.cpo > 0 ? `₱${channel.cpo.toLocaleString()}` : 'N/A',
        channel.newCustomers.toString()
      ])
    ];

    this.pdf.autoTable({
      head: [channelData[0]],
      body: channelData.slice(1),
      startY: this.currentY,
      theme: 'striped',
      headStyles: { fillColor: [74, 107, 214], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      fontSize: 8,
      cellPadding: 2,
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20, halign: 'right' },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 15, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
      }
    });

    this.currentY = (this.pdf as any).lastAutoTable.finalY + 10;
  }

  addTrackingHealthSection() {
    this.checkPageBreak(40);
    this.addSubtitle('Tracking Infrastructure Health');
    
    const trackingData = [
      ['System', 'Status', 'Events/Day', 'Match Quality', 'Health'],
      ...trackingHealth.map(system => [
        system.system,
        system.status.charAt(0).toUpperCase() + system.status.slice(1),
        system.events,
        system.matchRate,
        system.status === 'healthy' ? '✅ Good' : system.status === 'warning' ? '⚠️ Issues' : '❌ Critical'
      ])
    ];

    this.pdf.autoTable({
      head: [trackingData[0]],
      body: trackingData.slice(1),
      startY: this.currentY,
      theme: 'striped',
      headStyles: { fillColor: [74, 107, 214], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      fontSize: 9,
      cellPadding: 3,
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
      }
    });

    this.currentY = (this.pdf as any).lastAutoTable.finalY + 10;
  }

  addInsightsSection() {
    this.checkPageBreak(50);
    this.addSubtitle('Key Insights & Recommendations');
    
    const insights = [
      '🟢 Strong Performance: MER at 3.67x exceeds healthy threshold with nCAC improving 2.6% MoM',
      '🟡 Watch Areas: Server-side GTM down (0 events/day), losing ~15% conversion data',
      '🔴 Immediate Actions: Scale Meta spend +15%, fix server-side GTM before budget reallocation',
      '📊 Strategic Opportunities: Revenue at 90% of target, achievable with current run rate',
      '🎯 Next Steps: Implement TikTok cAPI, launch GLP-1 subscription, cap TikTok spend'
    ];

    insights.forEach(insight => {
      this.addText(insight);
    });
  }

  addFooter() {
    this.checkPageBreak(20);
    this.currentY = this.pageHeight - 20;
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.text('Generated by Click-Man Control Panel • AndYou.ph', this.margin, this.currentY);
    this.pdf.text(`Page 1 of 1 • ${new Date().toISOString().split('T')[0]}`, this.pageWidth - this.margin - 40, this.currentY);
  }

  generateComplete(): void {
    this.addHeader();
    this.addKPISection();
    this.addChannelAttributionSection();
    this.addTrackingHealthSection();
    this.addInsightsSection();
    this.addFooter();
  }

  save(filename: string = `clickman-export-${new Date().toISOString().split('T')[0]}.pdf`) {
    this.pdf.save(filename);
  }
}

export async function generateDataPDF(): Promise<void> {
  const generator = new DataPDFGenerator();
  generator.generateComplete();
  generator.save();
}