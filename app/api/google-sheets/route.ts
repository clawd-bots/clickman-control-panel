import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_PNL_SPREADSHEET_ID || '1-88cQYdmxMwXZJH4cMgj3Lvsmb-_6CWv9X8YN5gtxE0';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GA4_CLIENT_EMAIL,
      private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

function parseNumber(val: string | undefined): number {
  if (!val || val === '-' || val === '') return 0;
  // Remove commas, parentheses (negative notation), currency symbols, % signs
  let cleaned = val.replace(/,/g, '').replace(/[%$₱]/g, '').trim();
  // Handle accounting negative: (1,234) → -1234
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parsePercentage(val: string | undefined): number | null {
  if (!val || val === '' || val === '-') return null;
  const cleaned = val.replace('%', '').replace(/[()]/g, c => c === '(' ? '-' : '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

interface PnlRow {
  label: string;
  jan: number;
  janPct: number | null;
  feb: number;
  febPct: number | null;
  change: number;
  changePct: number | null;
  ytd: number;
  ytdPct: number | null;
}

function parseRow(row: string[]): PnlRow {
  return {
    label: (row[0] || '').trim(),
    jan: parseNumber(row[1]),
    janPct: parsePercentage(row[2]),
    feb: parseNumber(row[3]),
    febPct: parsePercentage(row[4]),
    change: parseNumber(row[5]),
    changePct: parsePercentage(row[6]),
    ytd: parseNumber(row[7]),
    ytdPct: parsePercentage(row[8]),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuth();
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });

    // Read SOCI sheet
    const sociRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'SOCI!A1:I55',
    });

    const rows = sociRes.data.values || [];
    
    // Parse the structured P&L data
    const data: Record<string, PnlRow> = {};
    const opexItems: PnlRow[] = [];
    let inOpex = false;

    for (const row of rows) {
      if (!row[0] || row[0] === '' || row.length < 2) {
        if (row[0] === 'Operating Expenses') inOpex = true;
        continue;
      }

      const label = (row[0] as string).trim();
      const parsed = parseRow(row as string[]);

      // Map rows to keys
      switch (label) {
        case '# of Orders': data['orders'] = parsed; break;
        case 'AOV ($)': data['aov'] = parsed; break;
        case 'Gross Sales': data['grossSales'] = parsed; break;
        case 'Discounts': data['discounts'] = parsed; break;
        case 'Refunds': data['refunds'] = parsed; break;
        case 'Net Revenue': data['netRevenue'] = parsed; break;
        case 'Cost of Goods Sold': data['cogs'] = parsed; break;
        case 'CM1': data['cm1'] = parsed; break;
        case 'Logistics': data['logistics'] = parsed; break;
        case 'Packaging Cost': data['packaging'] = parsed; break;
        case 'Transaction Fees': data['transactionFees'] = parsed; break;
        case 'CM2': data['cm2'] = parsed; break;
        case 'Meta Ads': data['metaAds'] = parsed; break;
        case 'Google Ads': data['googleAds'] = parsed; break;
        case 'TikTok Ads': data['tiktokAds'] = parsed; break;
        case 'CM3': data['cm3'] = parsed; break;
        case 'EBITDA': data['ebitda'] = parsed; break;
        case 'Depreciation & Amortization': data['depreciation'] = parsed; break;
        case 'Total Operating Income': data['operatingIncome'] = parsed; break;
        case 'Other Income (Expense), net': data['otherIncome'] = parsed; break;
        case 'Income Tax Expense': data['tax'] = parsed; break;
        default:
          // OpEx line items (prefixed with spaces)
          if (inOpex && label.startsWith('  ')) {
            opexItems.push(parsed);
          } else if (label.startsWith('Total Operating Expense')) {
            data['totalOpex'] = parsed;
            inOpex = false;
          }
          break;
      }
    }

    // Read DEEP DIVE for granular breakdown
    const deepDiveRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'DEEP DIVE!A1:F100',
    });

    const deepDiveRows = deepDiveRes.data.values || [];
    const deepDive: Array<{ category: string; vendor: string; jan: number; feb: number; change: number; changePct: string }> = [];
    let currentCategory = '';

    for (const row of deepDiveRows) {
      const col1 = ((row[1] as string) || '').trim();
      if (!col1) continue;
      
      // Category headers (numbered like "1. MANAGEMENT & LEADERSHIP")
      if (/^\d+\./.test(col1) && col1 === col1.toUpperCase()) {
        currentCategory = col1;
        continue;
      }
      
      // Skip subtotals and totals and sub-headers
      if (col1.startsWith('Subtotal') || col1.startsWith('TOTAL') || col1.endsWith('Fees') || col1.endsWith('Representation')) continue;
      
      // Vendor line items (indented with spaces)
      if (col1.startsWith('  ') && currentCategory) {
        deepDive.push({
          category: currentCategory,
          vendor: col1.trim(),
          jan: parseNumber(row[2] as string),
          feb: parseNumber(row[3] as string),
          change: parseNumber(row[4] as string),
          changePct: ((row[5] as string) || '').trim(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        title: 'RX Ventures Pte. Ltd. Group',
        currency: 'USD',
        periods: ['Jan 2026', 'Feb 2026'],
        ytdLabel: '2026 YTD',
        pnl: data,
        opexItems,
        deepDive,
      },
    });
  } catch (error: any) {
    console.error('Google Sheets API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
