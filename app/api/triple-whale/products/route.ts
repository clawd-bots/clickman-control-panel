import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/api-cache';

const TW_SQL_URL = 'https://api.triplewhale.com/api/v2/orcabase/api/sql';

function getConfig() {
  const apiKey = process.env.TRIPLE_WHALE_API_KEY;
  const shopId = process.env.TRIPLE_WHALE_SHOP_ID;
  if (!apiKey || !shopId) {
    throw new Error('Missing TRIPLE_WHALE_API_KEY or TRIPLE_WHALE_SHOP_ID');
  }
  return { apiKey, shopId };
}

/** Prefer Product Analytics (product-level revenue + units). Fallback: explode line items from orders_table. */
function buildProductAnalyticsQuery(startDate: string, endDate: string): string {
  return `
SELECT
  product_id AS product_id,
  anyLast(product_name) AS product_name,
  SUM(toFloat64(ifNull(revenue, 0))) AS revenue,
  SUM(toFloat64(ifNull(total_items_sold, 0))) AS units
FROM product_analytics_table
WHERE toDate(event_date) >= toDate('${startDate}')
  AND toDate(event_date) <= toDate('${endDate}')
  AND entity = 'product'
GROUP BY product_id
ORDER BY revenue DESC
LIMIT 100
`.trim();
}

function buildOrdersTableFallbackQuery(startDate: string, endDate: string): string {
  return `
SELECT
  product.product_id AS product_id,
  anyLast(product.product_name) AS product_name,
  SUM(
    toFloat64(ifNull(product.product_name_price, 0)) * toFloat64(ifNull(product.product_name_quantity_sold, 0))
  ) AS revenue,
  SUM(toFloat64(ifNull(product.product_name_quantity_sold, 0))) AS units
FROM orders_table
ARRAY JOIN products_info AS product
WHERE toDate(event_date) >= toDate('${startDate}')
  AND toDate(event_date) <= toDate('${endDate}')
  AND order_revenue > 0
GROUP BY product.product_id
ORDER BY revenue DESC
LIMIT 100
`.trim();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { success: false, error: 'Dates must be YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const forceRefresh = searchParams.get('refresh') === 'true';
    const cacheParams = `product_kpis_${startDate}_${endDate}`;
    if (!forceRefresh) {
      const cached = await getCached('triple-whale', cacheParams);
      if (cached !== null) return NextResponse.json({ ...cached, _fromCache: true });
    }

    const { apiKey, shopId } = getConfig();

    async function execSql(query: string) {
      const res = await fetch(TW_SQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          shopId,
          query,
          period: { startDate, endDate },
        }),
      });
      const errText = await res.text();
      if (!res.ok) {
        throw new Error(errText.slice(0, 500));
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(errText);
      } catch {
        throw new Error(`TW SQL invalid JSON: ${errText.slice(0, 200)}`);
      }
      const rows = Array.isArray(parsed) ? parsed : (parsed as { data?: unknown }).data;
      return Array.isArray(rows) ? rows : [];
    }

    let rows: Record<string, unknown>[] = [];
    let source: 'product_analytics_table' | 'orders_table' = 'product_analytics_table';

    try {
      rows = (await execSql(buildProductAnalyticsQuery(startDate, endDate))) as Record<string, unknown>[];
    } catch (e) {
      console.warn('TW product_kpis: product_analytics_table failed, trying orders_table:', e);
      source = 'orders_table';
      rows = (await execSql(buildOrdersTableFallbackQuery(startDate, endDate))) as Record<string, unknown>[];
    }

    const data = rows.map((r) => {
      const revenue = Number(r.revenue ?? 0) || 0;
      const units = Number(r.units ?? 0) || 0;
      const id = String(r.product_id ?? r.productId ?? '');
      const name = String(r.product_name ?? r.productName ?? 'Unknown').trim() || 'Unknown';
      return {
        productId: id,
        product: name,
        revenue,
        units: Math.round(units),
      };
    });

    const payload = {
      success: true,
      source: 'triple-whale-sql',
      sqlSource: source,
      dateRange: { startDate, endDate },
      data,
    };

    setCache('triple-whale', cacheParams, payload).catch(() => {});

    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('TW products route:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
