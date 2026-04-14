import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toLocalDateString } from '@/lib/dateUtils';
import { filterAttributionChannelRows } from '@/lib/attribution-filters';
import { getMetric, type TWData } from '@/lib/triple-whale-client';

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

/** USD — ASCII only (safe in Helvetica / jsPDF) */
function fmtUsd(n: number): string {
  const v = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * Shop currency in PDFs: avoid U+20B1 (peso) — standard PDF fonts often render it as wrong glyphs (e.g. "±").
 */
function fmtPhpAscii(n: number): string {
  const v = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}PHP ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}PHP ${(abs / 1_000).toFixed(1)}K`;
  return `${sign}PHP ${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtMoneyForPdf(n: number, currencyCode: string): string {
  const c = (currencyCode || 'USD').toUpperCase();
  if (c === 'PHP') return fmtPhpAscii(n);
  return fmtUsd(n);
}

/** Triple Whale / GA-style metrics in shop currency (PHP) */
function fmt(n: number): string {
  return fmtPhpAscii(n);
}

interface PnlSheetRow {
  label: string;
  isSection: boolean;
  isSubItem: boolean;
  isSummary: boolean;
  months: Record<string, { value: number; pctOfNet: number | null }>;
  ytd: { value: number; pctOfNet: number | null };
}

function pnlMonthValue(row: PnlSheetRow | undefined, monthKey: string): number {
  if (!row || !monthKey) return 0;
  return row.months[monthKey]?.value ?? 0;
}

function pnlYtdValue(row: PnlSheetRow | undefined): number {
  return row?.ytd?.value ?? 0;
}

function cohortReportRange(): { start: string; end: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start: toLocalDateString(start), end: toLocalDateString(end) };
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

    // Fetch Triple Whale data (API returns { summary, daily } — values are in summary[key].current)
    const twJson = await fetchJSON(`/api/triple-whale?startDate=${startStr}&endDate=${endStr}&mode=all`);
    const tw: TWData | null =
      twJson?.data?.summary && twJson?.data ? (twJson.data as TWData) : null;

    if (has('dashboard') || has('kpi-cards')) {
      pdf.subtitle('Dashboard — Key Performance Indicators');
      if (tw) {
        const revenue = getMetric(tw, 'orderRevenue');
        const totalSpend =
          getMetric(tw, 'metaAdSpend') +
          getMetric(tw, 'googleAdSpend') +
          getMetric(tw, 'tiktokAdSpend') +
          getMetric(tw, 'redditAdSpend');
        const mer = getMetric(tw, 'twRoas') || getMetric(tw, 'topRoas');
        const orders = getMetric(tw, 'orders');
        const ncOrders = getMetric(tw, 'newCustomerOrders');
        const aov = getMetric(tw, 'aov');
        pdf.table(
          ['Metric', 'Value', 'Source'],
          [
            ['Net Revenue', fmt(revenue), 'Triple Whale'],
            ['Total Spend', fmt(totalSpend), 'Triple Whale'],
            ['MER', `${mer.toFixed(2)}x`, 'Triple Whale'],
            ['Orders', orders.toLocaleString(), 'Triple Whale'],
            ['New Customer Orders', ncOrders.toLocaleString(), 'Triple Whale'],
            ['AOV', fmt(aov), 'Triple Whale'],
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

    // Channel Attribution (pixel_joined_tvf via SQL API — not part of summary-page response)
    if (has('dashboard') || has('channel-attribution')) {
      const attr = await fetchJSON(
        `/api/triple-whale/attribution?startDate=${startStr}&endDate=${endStr}&model=${encodeURIComponent('Triple Attribution')}&window=lifetime`
      );
      const rows = filterAttributionChannelRows(Array.isArray(attr?.data) ? attr.data : []);
      if (rows.length > 0) {
        pdf.subtitle('Dashboard — Channel Attribution');
        pdf.table(
          ['Channel', 'Spend', 'Revenue', 'ROAS', 'Orders'],
          rows.map((d: { channel?: string; spend?: number; cv?: number; roas?: number; orders?: number }) => {
            const spend = d.spend ?? 0;
            const revenue = d.cv ?? 0;
            return [
              String(d.channel ?? '—'),
              fmt(spend),
              fmt(revenue),
              spend > 0 ? `${(d.roas ?? (revenue / spend)).toFixed(2)}x` : '—',
              String(d.orders ?? 0),
            ];
          })
        );
      }
    }
  }

  // ─── P&L (Google Sheets: rows[] with months{} + ytd — not a keyed object) ───
  if (has('pnl') || has('pnl-summary') || has('pnl-breakdown')) {
    const pnlData = await fetchJSON('/api/google-sheets');
    const sheet = pnlData?.data;
    const rows: PnlSheetRow[] = Array.isArray(sheet?.rows) ? sheet.rows : [];
    const months: string[] = Array.isArray(sheet?.months) ? sheet.months : [];
    const lastMonth = months.length > 0 ? months[months.length - 1] : '';
    const cur = (sheet?.currency as string) || 'USD';

    const findRow = (label: string) => rows.find((r) => r.label === label);
    const findNetIncome = () => rows.find((r) => r.label.startsWith('Net Income'));

    if (rows.length > 0 && lastMonth) {
      if (has('pnl') || has('pnl-summary')) {
        pdf.subtitle(`Profit & Loss — Summary (${lastMonth})`);
        const summaryLines: [string, PnlSheetRow | undefined][] = [
          ['Net Revenue', findRow('Net Revenue')],
          ['CM1 (Gross)', findRow('CM1')],
          ['CM2', findRow('CM2')],
          ['CM3 (Post-Ads)', findRow('CM3')],
          ['EBITDA', findRow('EBITDA')],
          ['Net Income', findNetIncome()],
        ];
        pdf.table(
          ['Line Item', lastMonth, 'YTD'],
          summaryLines.map(([label, r]) => [
            label,
            fmtMoneyForPdf(pnlMonthValue(r, lastMonth), cur),
            fmtMoneyForPdf(pnlYtdValue(r), cur),
          ])
        );
        const note = [sheet?.company, sheet?.currencyNote].filter(Boolean).join(' — ');
        if (note) {
          pdf.text(note.length > 110 ? `${note.slice(0, 107)}…` : note);
          pdf.space(4);
        }
      }

      if (has('pnl') || has('pnl-breakdown')) {
        pdf.subtitle('Profit & Loss — Line items (YTD)');
        let body = rows
          .filter((r) => {
            const y = pnlYtdValue(r);
            const anyMonth = months.some((m) => pnlMonthValue(r, m) !== 0);
            return anyMonth || y !== 0 || r.isSummary;
          })
          .map((r) => [
            r.label,
            fmtMoneyForPdf(pnlYtdValue(r), cur),
            r.ytd.pctOfNet != null ? `${r.ytd.pctOfNet.toFixed(1)}%` : '—',
          ]);
        if (body.length === 0) {
          body = rows.slice(0, 40).map((r) => [
            r.label,
            fmtMoneyForPdf(pnlYtdValue(r), cur),
            r.ytd.pctOfNet != null ? `${r.ytd.pctOfNet.toFixed(1)}%` : '—',
          ]);
        }
        pdf.table(['Line Item', 'YTD', '% of Net'], body);
      }
    } else {
      pdf.subtitle('Profit & Loss');
      pdf.text('⚠ Google Sheets P&L data unavailable or sheet has no month columns.');
    }
  }

  // ─── CREATIVE ───
  if (has('creative') || has('account-control') || has('slugging-rate') || has('demographics')) {
    pdf.subtitle('Creative & MTA');
    pdf.text(
      'Summary numbers below match the dashboard period (month-to-date). Interactive charts (Account Control, churn, demographics, Pareto) stay in the app for exploration.'
    );
    pdf.space(3);

    const today = new Date();
    const startStr = toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
    const endStr = toLocalDateString(today);

    const metaData = await fetchJSON(`/api/meta?mode=overview&startDate=${startStr}&endDate=${endStr}`);
    const metaCur = metaData?.data?.account?.currency || 'USD';
    const fmtMeta = (n: number) => fmtMoneyForPdf(n, metaCur);

    if (metaData?.data?.summary) {
      const s = metaData.data.summary;
      pdf.subtitle('Creative — Meta Ads (Marketing API)');
      pdf.table(
        ['Metric', 'Value'],
        [
          ['Total Ads', s.totalAds?.toString() || '0'],
          ['Active Campaigns', s.activeCampaigns?.toString() || '0'],
          ['Total Spend', fmtMeta(Number(s.totalSpend) || 0)],
          ['Reported Purchases', (s.totalPurchases || 0).toString()],
          ['Avg CPA', fmtMeta(Number(s.avgCpa) || 0)],
          ['Overall ROAS', `${(Number(s.overallRoas) || 0).toFixed(2)}x`],
        ]
      );
    }

    const adsJson = await fetchJSON(
      `/api/triple-whale/ads?startDate=${startStr}&endDate=${endStr}&model=${encodeURIComponent('Triple Attribution')}&window=Lifetime`
    );
    const ads = Array.isArray(adsJson?.data) ? adsJson.data : [];
    if (ads.length > 0) {
      let spend = 0;
      let revenue = 0;
      let orders = 0;
      let ncOrders = 0;
      for (const a of ads) {
        spend += Number(a.spend) || 0;
        revenue += Number(a.revenue) || 0;
        orders += Number(a.orders) || 0;
        ncOrders += Number(a.ncOrders) || 0;
      }
      const roas = spend > 0 ? revenue / spend : 0;
      const cpa = orders > 0 ? spend / orders : 0;
      const ncCpa = ncOrders > 0 ? spend / ncOrders : 0;
      pdf.subtitle('Creative — Triple Whale (pixel_joined_tvf, shop currency)');
      pdf.table(
        ['Metric', 'Value'],
        [
          ['Distinct ads (rows)', ads.length.toString()],
          ['Attributed spend', fmtPhpAscii(spend)],
          ['Attributed revenue', fmtPhpAscii(revenue)],
          ['Attributed orders', orders.toLocaleString()],
          ['New customer orders', ncOrders.toLocaleString()],
          ['Blended ROAS', `${roas.toFixed(2)}x`],
          ['CPA (all orders)', fmtPhpAscii(cpa)],
          ['CPA (new customers)', ncCpa > 0 ? fmtPhpAscii(ncCpa) : '—'],
        ]
      );
    }
  }

  // ─── COHORTS ───
  if (has('cohorts') || has('cohort-retention') || has('cohort-ltv')) {
    pdf.subtitle('Cohorts');
    const { start: cStart, end: cEnd } = cohortReportRange();
    pdf.text(
      `Triple Whale cohort grid (${cStart} – ${cEnd}), Triple Attribution / lifetime window. Heatmaps and toggles remain in the dashboard.`
    );
    pdf.space(3);

    const cohortJson = await fetchJSON(
      `/api/triple-whale/cohorts?startDate=${cStart}&endDate=${cEnd}&model=${encodeURIComponent('Triple Attribution')}&window=Lifetime`
    );
    const cohorts: any[] = Array.isArray(cohortJson?.cohorts) ? cohortJson.cohorts : [];

    if (cohorts.length > 0) {
      const totalNc = cohorts.reduce((s, c) => s + (Number(c.customers) || 0), 0);
      const avgRpr =
        cohorts.length > 0 ? cohorts.reduce((s, c) => s + (Number(c.rpr) || 0), 0) / cohorts.length : 0;
      pdf.text(
        `Cohort months in report: ${cohorts.length} | First-order customers (sum of cohort sizes): ${totalNc.toLocaleString()} | Avg repeat-purchase rate (RPR): ${avgRpr.toFixed(2)}%`
      );
      pdf.space(4);

      const recent = [...cohorts]
        .sort((a, b) => String(b.cohortMonth || '').localeCompare(String(a.cohortMonth || '')))
        .slice(0, 10);

      pdf.table(
        ['Cohort', 'Customers', '1st-order AOV', 'RPR %', 'nCPA', 'LTV @ M3'],
        recent.map((c) => {
          const ltv3 = c.ltvByMonth?.[3];
          const ltv3Str =
            typeof ltv3 === 'number' && Number.isFinite(ltv3) ? fmtPhpAscii(ltv3) : '—';
          return [
            String(c.cohortLabel || c.cohortMonth || '—'),
            String(Math.round(Number(c.customers) || 0)),
            fmtPhpAscii(Number(c.firstOrderAov) || 0),
            `${(Number(c.rpr) || 0).toFixed(2)}%`,
            fmtPhpAscii(Number(c.ncpa) || 0),
            ltv3Str,
          ];
        })
      );
    } else {
      pdf.text('⚠ Cohort data unavailable for this range (check Triple Whale SQL API).');
    }
  }

  // Footer on last page
  pdf.space(10);
  pdf.text('— End of Report —');
  pdf.text('Generated by Click-Man Control Panel • clickman.andyou.ph');

  pdf.save(`click-man-export-${new Date().toISOString().split('T')[0]}.pdf`);
}
