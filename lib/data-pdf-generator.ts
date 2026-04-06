import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toLocalDateString } from '@/lib/dateUtils';

class PDFBuilder {
  private pdf: jsPDF;
  private y: number = 20;
  private pageH: number = 297;
  private pageW: number = 210;
  private m: number = 15;

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4');
  }

  private checkBreak(h: number) {
    if (this.y + h > this.pageH - this.m) {
      this.pdf.addPage();
      this.y = this.m;
    }
  }

  title(text: string) {
    this.checkBreak(15);
    this.pdf.setFontSize(18);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(text, this.m, this.y);
    this.y += 12;
  }

  subtitle(text: string) {
    this.checkBreak(12);
    this.pdf.setFontSize(13);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(text, this.m, this.y);
    this.y += 8;
  }

  text(text: string) {
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    const lines = this.pdf.splitTextToSize(text, this.pageW - this.m * 2);
    this.checkBreak(lines.length * 4 + 2);
    this.pdf.text(lines, this.m, this.y);
    this.y += lines.length * 4 + 2;
  }

  table(head: string[], body: string[][], opts?: any) {
    this.checkBreak(30);
    autoTable(this.pdf, {
      head: [head],
      body,
      startY: this.y,
      theme: 'striped',
      headStyles: { fillColor: [51, 79, 180], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      cellPadding: 2.5,
      ...opts,
    });
    this.y = (this.pdf as any).lastAutoTable.finalY + 8;
  }

  space(h: number = 5) { this.y += h; }

  save(filename: string) { this.pdf.save(filename); }
}

// Fetch helpers
async function fetchJSON(url: string) {
  try {
    const res = await fetch(url);
    const json = await res.json();
    return json.success !== false ? json : null;
  } catch { return null; }
}

function fmt(v: number, prefix = '₱'): string {
  if (Math.abs(v) >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${prefix}${(v / 1_000).toFixed(1)}K`;
  return `${prefix}${v.toLocaleString()}`;
}

export async function generateDataPDF(selectedSections?: string[]): Promise<void> {
  const sel = new Set(selectedSections || []);
  const includeAll = sel.size === 0;
  const has = (id: string) => includeAll || sel.has(id);

  const pdf = new PDFBuilder();

  // Header
  pdf.title('Click-Man Dashboard Report');
  pdf.text(`Generated: ${new Date().toLocaleString()}`);
  pdf.text('Data pulled live from Triple Whale, Google Analytics, and Google Sheets.');
  pdf.space(5);

  // ─── DASHBOARD ───
  if (has('dashboard') || has('kpi-cards') || has('channel-attribution')) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const startStr = toLocalDateString(start);
    const endStr = toLocalDateString(today);

    // Fetch Triple Whale data
    const twData = await fetchJSON(`/api/triple-whale?startDate=${startStr}&endDate=${endStr}&mode=all`);

    if (has('dashboard') || has('kpi-cards')) {
      pdf.subtitle('Dashboard — Key Performance Indicators');
      if (twData?.data) {
        const d = twData.data;
        const getM = (key: string) => d.metrics?.[key] ?? d[key] ?? 0;
        pdf.table(
          ['Metric', 'Value', 'Source'],
          [
            ['Net Revenue', fmt(getM('orderRevenue')), 'Triple Whale'],
            ['Total Spend', fmt(getM('totalAdSpend') || getM('metaAdSpend') + getM('googleAdSpend') + getM('tiktokAdSpend')), 'Triple Whale'],
            ['MER', `${(getM('mer') || 0).toFixed(2)}x`, 'Triple Whale'],
            ['Orders', (getM('orders') || 0).toLocaleString(), 'Triple Whale'],
            ['New Customer Orders', (getM('newCustomerOrders') || 0).toLocaleString(), 'Triple Whale'],
            ['AOV', fmt(getM('aov') || 0), 'Triple Whale'],
          ]
        );
      } else {
        pdf.text('⚠ Triple Whale data unavailable for the current period.');
      }
    }

    // GA4 data
    if (has('dashboard') || has('unique-sessions')) {
      const ga4Data = await fetchJSON(`/api/ga4?startDate=${startStr}&endDate=${endStr}&mode=summary`);
      if (ga4Data?.data?.summary) {
        const s = ga4Data.data.summary;
        pdf.subtitle('Dashboard — Google Analytics');
        pdf.table(
          ['Metric', 'Value'],
          [
            ['Sessions', (s.sessions || 0).toLocaleString()],
            ['Total Users', (s.totalUsers || 0).toLocaleString()],
            ['New Users', (s.newUsers || 0).toLocaleString()],
            ['Bounce Rate', `${((s.bounceRate || 0) * 100).toFixed(1)}%`],
            ['Engagement Rate', `${((s.engagementRate || 0) * 100).toFixed(1)}%`],
            ['Pages/Session', (s.screenPageViewsPerSession || 0).toFixed(2)],
          ]
        );
      }
    }

    // Channel Attribution
    if (has('dashboard') || has('channel-attribution')) {
      if (twData?.data?.channelBreakdown) {
        pdf.subtitle('Dashboard — Channel Attribution');
        const channels = twData.data.channelBreakdown;
        pdf.table(
          ['Channel', 'Spend', 'Revenue', 'ROAS', 'Orders'],
          Object.entries(channels).map(([ch, d]: [string, any]) => [
            ch,
            fmt(d.spend || 0),
            fmt(d.revenue || 0),
            d.spend > 0 ? `${(d.revenue / d.spend).toFixed(2)}x` : '—',
            (d.orders || 0).toString(),
          ])
        );
      }
    }
  }

  // ─── P&L ───
  if (has('pnl') || has('pnl-summary') || has('pnl-breakdown')) {
    const pnlData = await fetchJSON('/api/google-sheets');
    if (pnlData?.data?.rows) {
      const rows = pnlData.data.rows;
      const months = pnlData.data.months || [];
      const lastMonth = months[months.length - 1] || 'Latest';

      if (has('pnl') || has('pnl-summary')) {
        pdf.subtitle(`Profit & Loss — Summary (${lastMonth})`);
        const getVal = (key: string) => rows[key]?.monthly?.[lastMonth] ?? rows[key]?.total ?? 0;
        pdf.table(
          ['Line Item', lastMonth, 'Total (All Months)'],
          [
            ['Total Income', fmt(getVal('total_income'), '$'), fmt(rows.total_income?.total || 0, '$')],
            ['Cost of Goods Sold', fmt(getVal('total_cost_of_goods_sold'), '$'), fmt(rows.total_cost_of_goods_sold?.total || 0, '$')],
            ['Gross Profit', fmt(getVal('gross_profit'), '$'), fmt(rows.gross_profit?.total || 0, '$')],
            ['Total Expenses', fmt(getVal('total_expenses'), '$'), fmt(rows.total_expenses?.total || 0, '$')],
            ['Net Operating Income', fmt(getVal('net_operating_income'), '$'), fmt(rows.net_operating_income?.total || 0, '$')],
            ['Net Income', fmt(getVal('net_income'), '$'), fmt(rows.net_income?.total || 0, '$')],
          ]
        );
      }

      if (has('pnl') || has('pnl-breakdown')) {
        pdf.subtitle('Profit & Loss — Detailed Breakdown');
        const detailKeys = [
          'affiliate_income', 'total_service_fee_income', 'total_services_sales',
          'client_ad_budget_spend', 'advertising_marketing', 'company_req_softwares_tools',
          'total_contractors', 'legal_professional_services', 'quickbooks_payments_fees',
        ];
        pdf.table(
          ['Line Item', 'Total'],
          detailKeys
            .filter(k => rows[k])
            .map(k => [rows[k].label, fmt(rows[k].total, '$')])
        );
      }
    } else {
      pdf.subtitle('Profit & Loss');
      pdf.text('⚠ Google Sheets P&L data unavailable.');
    }
  }

  // ─── CREATIVE ───
  if (has('creative') || has('account-control') || has('slugging-rate') || has('demographics')) {
    pdf.subtitle('Creative & MTA');
    pdf.text('Creative analytics (Account Control, Ad Churn, Slugging Rate, Demographics, Pareto) contain interactive charts best viewed in the dashboard. PDF export includes summary data.');

    // Fetch Meta overview for ad count summary
    const today = new Date();
    const startStr = toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
    const endStr = toLocalDateString(today);
    const metaData = await fetchJSON(`/api/meta?mode=overview&startDate=${startStr}&endDate=${endStr}`);
    
    if (metaData?.data?.summary) {
      const s = metaData.data.summary;
      pdf.table(
        ['Metric', 'Value'],
        [
          ['Total Ads (Meta)', s.totalAds?.toString() || '0'],
          ['Active Campaigns', s.activeCampaigns?.toString() || '0'],
          ['Total Spend', fmt(s.totalSpend || 0)],
          ['Total Purchases', (s.totalPurchases || 0).toString()],
          ['Avg CPA', fmt(s.avgCpa || 0)],
          ['Overall ROAS', `${(s.overallRoas || 0).toFixed(2)}x`],
        ]
      );
    }
  }

  // ─── COHORTS ───
  if (has('cohorts') || has('cohort-retention') || has('cohort-ltv')) {
    pdf.subtitle('Cohorts');
    pdf.text('Cohort retention and LTV analysis contains interactive heatmaps best viewed in the dashboard.');
  }

  // Footer on last page
  pdf.space(10);
  pdf.text('— End of Report —');
  pdf.text('Generated by Click-Man Control Panel • clickman.andyou.ph');

  pdf.save(`click-man-export-${new Date().toISOString().split('T')[0]}.pdf`);
}
