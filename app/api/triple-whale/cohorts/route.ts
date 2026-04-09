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

const MODEL_MAP: Record<string, string> = {
  Triple: 'Triple Attribution',
  'Triple Attribution': 'Triple Attribution',
  'Linear All': 'Linear All',
  'Last Click': 'Last Click',
  'First Click': 'First Click',
  'Linear Paid': 'Linear Paid',
};

const WINDOW_MAP: Record<string, string> = {
  Lifetime: 'lifetime',
  lifetime: 'lifetime',
  '1 day': '1_day',
  '7 days': '7_days',
  '14 days': '14_days',
  '28 days': '28_days',
};

function cohortLabel(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number);
  if (!y || !m) return isoDate;
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Revenue expression — uses total_price_usd if non-zero, otherwise total_price (shop currency).
 * For andyou.ph, total_price_usd is NULL, so total_price (PHP) is used.
 */
function REV(alias: string): string {
  return `toFloat64(if(ifNull(${alias}.total_price_usd, 0) > 0, ifNull(${alias}.total_price_usd, 0), ifNull(${alias}.total_price, 0)))`;
}

function buildCohortQuery(startDate: string, endDate: string, twModel: string, twWindow: string): string {
  const custDims = Array.from({ length: 13 }, (_, k) => {
    return `sumIf(rev, dateDiff('month', cohort_month, order_month) <= ${k} AND dateDiff('month', cohort_month, order_month) >= 0) AS m${k}`;
  }).join(',\n    ');

  const custOrderFlags = Array.from({ length: 13 }, (_, k) => {
    return `if(countIf(dateDiff('month', cohort_month, order_month) = ${k}) > 0, 1, 0) AS ordered_in_m${k}`;
  }).join(',\n    ');

  const ltvAvgs = Array.from({ length: 13 }, (_, k) => `avg(m${k}) AS ltv_m${k}`).join(',\n    ');
  const custCounts = Array.from({ length: 13 }, (_, k) => `sum(ordered_in_m${k}) AS cust_in_m${k}`).join(',\n    ');

  return `
WITH
  cfo AS (
    SELECT
      customer_id,
      toStartOfMonth(min(event_date)) AS cohort_month,
      argMin(order_id, event_date) AS first_order_id
    FROM sonic_system.orders
    WHERE (is_deleted IS NULL OR is_deleted = 0)
      AND (tw_ignore_order IS NULL OR tw_ignore_order = 0)
      AND event_date IS NOT NULL
      AND customer_id IS NOT NULL AND customer_id != ''
      AND total_price > 0
    GROUP BY customer_id
    HAVING min(event_date) >= toDate('${startDate}')
      AND min(event_date) <= toDate('${endDate}')
  ),
  first_o AS (
    SELECT
      c.customer_id,
      c.cohort_month,
      ${REV('o')} AS first_rev
    FROM cfo c
    INNER JOIN sonic_system.orders o ON o.order_id = c.first_order_id AND o.customer_id = c.customer_id
    WHERE (o.is_deleted IS NULL OR o.is_deleted = 0)
      AND (o.tw_ignore_order IS NULL OR o.tw_ignore_order = 0)
      AND o.total_price > 0
  ),
  ord AS (
    SELECT
      c.cohort_month,
      c.customer_id,
      toStartOfMonth(o.event_date) AS order_month,
      ${REV('o')} AS rev
    FROM cfo c
    INNER JOIN sonic_system.orders o ON o.customer_id = c.customer_id
    WHERE (o.is_deleted IS NULL OR o.is_deleted = 0)
      AND (o.tw_ignore_order IS NULL OR o.tw_ignore_order = 0)
      AND o.event_date IS NOT NULL
      AND o.total_price > 0
      AND toStartOfMonth(o.event_date) >= c.cohort_month
  ),
  cust_cum AS (
    SELECT cohort_month, customer_id,
    count(*) AS total_orders,
    ${custDims},
    ${custOrderFlags}
    FROM ord
    GROUP BY cohort_month, customer_id
  ),
  cohort_ltv AS (
    SELECT cohort_month,
      count() AS customers,
      countIf(total_orders > 1) * 100.0 / count() AS rpr,
    ${ltvAvgs},
    ${custCounts}
    FROM cust_cum
    GROUP BY cohort_month
  ),
  first_aov AS (
    SELECT cohort_month, avg(first_rev) AS first_order_aov
    FROM first_o
    GROUP BY cohort_month
  ),
  month_px AS (
    SELECT
      toStartOfMonth(event_date) AS cohort_month,
      sum(spend) AS spend
    FROM pixel_joined_tvf
    WHERE event_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      AND model = '${twModel}'
      AND attribution_window = '${twWindow}'
    GROUP BY cohort_month
  )
SELECT
  l.cohort_month AS cohort_month,
  l.customers AS customers,
  l.rpr AS rpr,
  if(l.customers > 0 AND px.spend IS NOT NULL, px.spend / l.customers, 0) AS ncpa,
  fa.first_order_aov AS first_order_aov,
  ${Array.from({ length: 13 }, (_, k) => `l.ltv_m${k} AS ltv_m${k}`).join(',\n  ')},
  ${Array.from({ length: 13 }, (_, k) => `l.cust_in_m${k} AS cust_in_m${k}`).join(',\n  ')}
FROM cohort_ltv l
LEFT JOIN month_px px ON l.cohort_month = px.cohort_month
LEFT JOIN first_aov fa ON l.cohort_month = fa.cohort_month
ORDER BY l.cohort_month ASC
`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2025-01-01';
    const endDate = searchParams.get('endDate');
    if (!endDate) {
      return NextResponse.json({ success: false, error: 'endDate required (YYYY-MM-DD)' }, { status: 400 });
    }

    const model = searchParams.get('model') || 'Triple Attribution';
    const window = searchParams.get('window') || 'Lifetime';
    const forceRefresh = searchParams.get('refresh') === 'true';

    const twModel = MODEL_MAP[model] || 'Triple Attribution';
    const twWindow = WINDOW_MAP[window] || 'lifetime';

    const cacheKey = `v7_${startDate}_${endDate}_${twModel}_${twWindow}`;
    if (!forceRefresh) {
      const cached = await getCached('tw-cohorts', cacheKey);
      if (cached !== null) return NextResponse.json({ ...cached, _fromCache: true });
    }

    const { apiKey, shopId } = getConfig();
    const query = buildCohortQuery(startDate, endDate, twModel, twWindow);

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

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TW SQL API error (${res.status}): ${errText.substring(0, 400)}`);
    }

    const rawData = await res.json();
    const rows = Array.isArray(rawData) ? rawData : rawData.data || [];

    // Calculate max valid month index for each cohort based on today's date
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth(); // 0-indexed

    const cohorts = (rows as Record<string, unknown>[]).map((r) => {
      const cohortMonth = String(r.cohort_month ?? '').split('T')[0] || '';
      
      // Calculate how many months have elapsed since cohort start (include current partial month)
      const [cYear, cMonth] = cohortMonth.split('-').map(Number);
      const maxValidMonth = cYear && cMonth
        ? (nowYear - cYear) * 12 + (nowMonth - (cMonth - 1))  // Include current month (partial data exists)
        : 12;
      const cappedMax = Math.min(Math.max(maxValidMonth, 0), 12);

      const ltvByMonth = Array.from({ length: 13 }, (_, k) => {
        if (k > cappedMax) return null; // Future month — no data possible
        const v = r[`ltv_m${k}`];
        const n = typeof v === 'string' ? parseFloat(v) : Number(v);
        return Number.isFinite(n) ? n : 0;
      });
      const customersByMonth = Array.from({ length: 13 }, (_, k) => {
        if (k > cappedMax) return null; // Future month — no data possible
        const v = r[`cust_in_m${k}`];
        const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
        return Number.isFinite(n) ? n : 0;
      });
      const ncpa = Number(r.ncpa) || 0;
      const firstOrderAov = Number(r.first_order_aov) || 0;
      const rpr = Number(r.rpr) || 0;

      return {
        cohortMonth,
        cohortLabel: cohortLabel(cohortMonth),
        customers: Math.round(Number(r.customers) || 0),
        ncpa,
        rpr: Math.round(rpr * 100) / 100,
        firstOrderAov,
        ltvByMonth,
        customersByMonth,
        maxValidMonth: cappedMax,
      };
    });

    const payload = {
      success: true,
      source: 'triple-whale-sql',
      dateRange: { startDate, endDate },
      model: twModel,
      attributionWindow: twWindow,
      cohorts,
    };

    setCache('tw-cohorts', cacheKey, payload).catch(() => {});

    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
