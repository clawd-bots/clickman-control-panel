import { google } from 'googleapis';
import { getCached, setCache } from '@/lib/api-cache';
import { NextRequest, NextResponse } from 'next/server';

// RX Ventures P&L sheet (uploaded .xlsx — requires CSV export approach)
const SPREADSHEET_ID = '1Qkj7nRqwLY75qdFNcSZyhgJ9VrOmz3KX';
const SHEET_GID = '342664778';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GA4_CLIENT_EMAIL,
      private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

function parseNumber(val: string | undefined | null): number {
  if (!val || val === '-' || val === '' || val === '—') return 0;
  let cleaned = val.replace(/,/g, '').replace(/[$₱%]/g, '').trim();
  // Handle accounting negatives: (1,234) → -1234
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parsePercent(val: string | undefined | null): number | null {
  if (!val || val === '' || val === '—' || val === '-') return null;
  const cleaned = val.replace('%', '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

interface PnlRow {
  label: string;
  isSection: boolean;
  isSubItem: boolean;
  isSummary: boolean;
  months: {
    [monthKey: string]: {
      value: number;
      pctOfNet: number | null;
    };
  };
  change: {
    value: number;
    pctChange: number | null;
  };
  ytd: {
    value: number;
    pctOfNet: number | null;
  };
}

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];
  
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if (ch === '\n' && !inQuotes) {
      row.push(current);
      current = '';
      rows.push(row);
      row = [];
    } else if (ch === '\r' && !inQuotes) {
      // skip
    } else {
      current += ch;
    }
  }
  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!forceRefresh) {
      const cached = await getCached('google-sheets', 'pnl-rx');
      if (cached !== null) return NextResponse.json({ ...cached, _fromCache: true });
    }

    const auth = getAuth();
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    // Export as CSV (required for uploaded .xlsx files that don't support Sheets API)
    const exportUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    const csvRes = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${token.token}` },
    });

    if (!csvRes.ok) {
      const errText = await csvRes.text();
      throw new Error(`Failed to export sheet: ${csvRes.status} ${errText.substring(0, 200)}`);
    }

    const csvText = await csvRes.text();
    const rows = parseCSV(csvText);

    if (rows.length < 10) {
      return NextResponse.json({ success: false, error: 'Sheet has insufficient data' }, { status: 500 });
    }

    // Parse header info
    const company = (rows[0]?.[0] || '').trim();
    const reportTitle = (rows[1]?.[0] || '').trim();
    const currencyNote = (rows[2]?.[0] || '').trim();

    // Row 5 (index 4) has column headers:
    // [label, Month1, % of Net, Month2, % of Net, Change, +/-, YTD, % of Net]
    const headerRow = rows[4] || [];

    // Extract month names from header (columns B, D, etc. — every other starting from 1)
    const months: string[] = [];
    const monthColIndices: number[] = [];
    const pctColIndices: number[] = [];
    
    // Find month columns: they contain "20XX" (year)
    for (let i = 1; i < headerRow.length; i++) {
      const h = (headerRow[i] || '').trim();
      if (h.match(/\b20\d{2}\b/) && !h.includes('YTD')) {
        if (headerRow[i + 1]?.trim() === '% of Net') {
          months.push(h);
          monthColIndices.push(i);
          pctColIndices.push(i + 1);
        }
      }
    }

    // Find Change, +/-, YTD, YTD % of Net columns
    let changeCol = -1;
    let changePctCol = -1;
    let ytdCol = -1;
    let ytdPctCol = -1;
    for (let i = 1; i < headerRow.length; i++) {
      const h = (headerRow[i] || '').trim();
      if (h === 'Change') changeCol = i;
      if (h === '+/−' || h === '+/-') changePctCol = i;
      if (h.includes('YTD')) {
        ytdCol = i;
        if (headerRow[i + 1]?.trim() === '% of Net') ytdPctCol = i + 1;
      }
    }

    // Parse data rows (starting from row index 6, skipping blank row after header)
    const pnlRows: PnlRow[] = [];
    const sectionLabels = new Set([
      'Revenue', 'Operating Expenses',
    ]);

    for (let r = 5; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawLabel = (row[0] || '').trimEnd();
      if (!rawLabel) continue;
      
      const label = rawLabel.trim();
      if (!label) continue;

      // Skip pure section headers with no data
      const isSection = sectionLabels.has(label);
      const isSubItem = rawLabel.startsWith('  ');
      const isSummary = /^(CM\d|EBITDA|Net Revenue|Net Income|Total Operating)/.test(label) ||
        label.includes('Total Operating');

      // Parse month values
      const monthData: PnlRow['months'] = {};
      for (let m = 0; m < months.length; m++) {
        monthData[months[m]] = {
          value: parseNumber(row[monthColIndices[m]]),
          pctOfNet: parsePercent(row[pctColIndices[m]]),
        };
      }

      // Parse change columns
      const change = {
        value: changeCol >= 0 ? parseNumber(row[changeCol]) : 0,
        pctChange: changePctCol >= 0 ? parsePercent(row[changePctCol]) : null,
      };

      // Parse YTD
      const ytd = {
        value: ytdCol >= 0 ? parseNumber(row[ytdCol]) : 0,
        pctOfNet: ytdPctCol >= 0 ? parsePercent(row[ytdPctCol]) : null,
      };

      // Skip rows that have no values at all (pure section headers or blank separators)
      const hasAnyValue = Object.values(monthData).some(m => m.value !== 0) || ytd.value !== 0;
      if (!hasAnyValue && isSection) continue;
      if (!hasAnyValue && !label) continue;

      pnlRows.push({
        label,
        isSection,
        isSubItem,
        isSummary,
        months: monthData,
        change,
        ytd,
      });
    }

    const response = {
      success: true,
      data: {
        company,
        reportTitle,
        currency: 'USD',
        currencyNote,
        months,
        rows: pnlRows,
      },
    };

    setCache('google-sheets', 'pnl-rx', response).catch(() => {});
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Google Sheets P&L API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
