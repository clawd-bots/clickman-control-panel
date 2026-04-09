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

// Inline revenue expressions for Moby-style queries (no table alias prefix)
const REV_INLINE = `toFloat64(if(ifNull(total_price_usd, 0) > 0, ifNull(total_price_usd, 0), ifNull(total_price, 0)))`;
const REV_INLINE_OT = `toFloat64(if(ifNull(ot.total_price_usd, 0) > 0, ifNull(ot.total_price_usd, 0), ifNull(ot.total_price, 0)))`;

function buildCohortQuery(startDate: string, endDate: string, twModel: string, twWindow: string): string {
  // Moby-style query: SUM(cohort revenue) / cohort_size
  // Split into two queries to avoid complex multi-CTE joins that ClickHouse struggles with
  
  // Cumulative LTV columns
  const cumulativeLtvCols = Array.from({ length: 13 }, (_, k) =>
    `ROUND(SUM(IF(rp.months_since_first <= ${k}, rp.revenue, 0)) / NULLIF(cs.cohort_size, 0), 2) AS ltv_m${k}`
  ).join(',\n  ');

  // Retention columns
  const retentionCols = Array.from({ length: 13 }, (_, k) =>
    `SUM(IF(rp.months_since_first = ${k}, rp.cust_count, 0)) AS cust_in_m${k}`
  ).join(',\n  ');

  return `
WITH
  customer_cohorts AS (
    SELECT
      customer_id,
      MIN(event_date) AS first_order_date,
      toStartOfMonth(MIN(event_date)) AS cohort_month
    FROM sonic_system.orders
    WHERE (is_deleted IS NULL OR is_deleted = 0)
      AND (tw_ignore_order IS NULL OR tw_ignore_order = 0)
      AND ${REV_INLINE} > 0
      AND customer_id IS NOT NULL
      AND customer_id != ''
    GROUP BY customer_id
  ),

  cohort_sizes AS (
    SELECT
      cohort_month,
      COUNT(DISTINCT customer_id) AS cohort_size
    FROM customer_cohorts
    WHERE cohort_month >= toDate('${startDate}')
      AND cohort_month <= toDate('${endDate}')
    GROUP BY cohort_month
  ),

  revenue_by_period AS (
    SELECT
      cc.cohort_month,
      dateDiff('month', cc.cohort_month, toStartOfMonth(ot.event_date)) AS months_since_first,
      SUM(${REV_INLINE_OT}) AS revenue,
      COUNT(DISTINCT ot.customer_id) AS cust_count
    FROM customer_cohorts cc
    INNER JOIN sonic_system.orders ot ON cc.customer_id = ot.customer_id
    WHERE (ot.is_deleted IS NULL OR ot.is_deleted = 0)
      AND (ot.tw_ignore_order IS NULL OR ot.tw_ignore_order = 0)
      AND ${REV_INLINE_OT} > 0
      AND cc.cohort_month >= toDate('${startDate}')
      AND cc.cohort_month <= toDate('${endDate}')
    GROUP BY cc.cohort_month, months_since_first
  ),

  rpr_data AS (
    SELECT
      cc.cohort_month,
      ROUND(
        countIf(coc.total_orders > 1) * 100.0 / NULLIF(count(), 0),
        2
      ) AS rpr
    FROM customer_cohorts cc
    INNER JOIN (
      SELECT customer_id, COUNT(DISTINCT order_id) AS total_orders
      FROM sonic_system.orders
      WHERE (is_deleted IS NULL OR is_deleted = 0)
        AND (tw_ignore_order IS NULL OR tw_ignore_order = 0)
        AND ${REV_INLINE} > 0
      GROUP BY customer_id
    ) coc ON cc.customer_id = coc.customer_id
    WHERE cc.cohort_month >= toDate('${startDate}')
      AND cc.cohort_month <= toDate('${endDate}')
    GROUP BY cc.cohort_month
  ),

  monthly_spend AS (
    SELECT
      toStartOfMonth(event_date) AS cohort_month,
      SUM(spend) AS total_spend
    FROM pixel_joined_tvf
    WHERE event_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      AND model = '${twModel}'
      AND attribution_window = '${twWindow}'
    GROUP BY cohort_month
  )

SELECT
  cs.cohort_month AS cohort_month,
  cs.cohort_size AS customers,
  rd.rpr AS rpr,
  ROUND(COALESCE(ms.total_spend / NULLIF(cs.cohort_size, 0), 0), 2) AS ncpa,
  ROUND(SUM(IF(rp.months_since_first = 0, rp.revenue, 0)) / NULLIF(cs.cohort_size, 0), 2) AS first_order_aov,
  ${cumulativeLtvCols},
  ${retentionCols}
FROM cohort_sizes cs
LEFT JOIN revenue_by_period rp ON cs.cohort_month = rp.cohort_month
LEFT JOIN rpr_data rd ON cs.cohort_month = rd.cohort_month
LEFT JOIN monthly_spend ms ON cs.cohort_month = ms.cohort_month
GROUP BY cs.cohort_month, cs.cohort_size, ms.total_spend, rd.rpr
ORDER BY cs.cohort_month ASC
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

    const cacheKey = `v8_moby_${startDate}_${endDate}_${twModel}_${twWindow}`;
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
