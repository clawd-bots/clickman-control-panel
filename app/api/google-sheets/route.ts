import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_PNL_SPREADSHEET_ID || '1CKnqlTVXN06CX8ApVpqFzQ1NnDesIPW7zdx-TBcA7uo';
const SHEET_NAME = 'MoM P&L 25-26';

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
  if (!val || val === '-' || val === '' || val === '0') return 0;
  let cleaned = val.replace(/,/g, '').replace(/[$₱%]/g, '').trim();
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

interface MomRow {
  label: string;
  monthly: Record<string, number>; // { "Jan 2025": 380.4, "Feb 2025": 831.01, ... }
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuth();
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });

    // Read MoM P&L sheet (rows 1-100, columns A-Q)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A1:Q100`,
    });

    const rows = res.data.values || [];
    if (rows.length < 6) {
      return NextResponse.json({ success: false, error: 'Sheet has insufficient data' }, { status: 500 });
    }

    // Row 5 (index 4) has the month headers
    const headerRow = rows[4];
    // Columns B through P are months (index 1-15), column Q is Total (index 16)
    const months: string[] = [];
    for (let i = 1; i < headerRow.length - 1; i++) {
      const h = (headerRow[i] || '').trim();
      if (h) months.push(h);
    }

    // Parse all data rows
    const data: Record<string, MomRow> = {};
    const sectionRows: { key: string; label: string; section: string; indent: number }[] = [];

    let currentSection = '';
    let currentSubSection = '';

    for (let r = 5; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[0]) continue;

      const label = (row[0] as string).trim();
      if (!label) continue;

      // Detect section headers (no values)
      const hasValues = row.slice(1).some((v: string) => v && v.trim() !== '');
      
      // Track sections
      if (label === 'Income' || label === 'Cost of Goods Sold' || label === 'Expenses' || 
          label === 'Other Income' || label === 'Other Expenses') {
        currentSection = label;
        continue;
      }

      if (label.startsWith('Service/Fee Income') || label.startsWith('Services Sales') ||
          label.startsWith('Sales (Advertising)') || label.startsWith('Sales (Website/Branding)') ||
          label.startsWith('Paid Search') || label.startsWith('Paid Social') ||
          label.startsWith('SDE')) {
        currentSubSection = label;
        if (!hasValues) continue;
      }

      // Parse row values
      const monthly: Record<string, number> = {};
      for (let i = 0; i < months.length; i++) {
        monthly[months[i]] = parseNumber(row[i + 1] as string);
      }
      const total = parseNumber(row[headerRow.length - 1] as string);

      // Generate a key from the label
      const key = label
        .replace(/^Total for\s+/i, 'total_')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase();

      data[key] = { label, monthly, total };

      // Track for section ordering
      const isTotal = label.startsWith('Total for') || label.startsWith('Total ');
      const isIndented = label.startsWith('  ');
      sectionRows.push({
        key,
        label,
        section: currentSection,
        indent: isIndented ? 2 : isTotal ? 0 : 1,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        title: (rows[1]?.[0] || 'Impremis Marketing') as string,
        dateRange: (rows[2]?.[0] || '') as string,
        currency: 'USD',
        months,
        rows: data,
        sections: sectionRows,
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
