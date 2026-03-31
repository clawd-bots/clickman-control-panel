# Triple Whale Frontend Integration Task

## Goal
Wire real Triple Whale data into ALL frontend pages that currently use sample/dummy data for TW metrics. Add a green "LIVE" badge to every component using real data.

## What's Already Done
- API route: `app/api/triple-whale/route.ts` — working, tested, 91 metrics
- Client lib: `lib/triple-whale-client.ts` — fetch helper + formatters
- LIVE badge: `components/ui/LiveBadge.tsx` — green pulsing "LIVE" pill

## API Usage
```tsx
import { fetchTripleWhaleData, getMetric, getDailyData, TWData } from '@/lib/triple-whale-client';
import { LiveBadge } from '@/components/ui/LiveBadge';

// In component:
const [twData, setTwData] = useState<TWData | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const startDate = dateRange.startDate.toISOString().split('T')[0];
  const endDate = dateRange.endDate.toISOString().split('T')[0];
  fetchTripleWhaleData(startDate, endDate, 'all')
    .then(setTwData)
    .catch(console.error)
    .finally(() => setLoading(false));
}, [dateRange]);

// Get values:
const revenue = getMetric(twData, 'orderRevenue');      // ₱32,431,488.95
const mer = getMetric(twData, 'mer');                    // 28.09
const ncpa = getMetric(twData, 'ncpa');                  // 8348.94
const dailyRevenue = getDailyData(twData, 'orderRevenue'); // [{date, value}, ...]
```

## Available Metric Keys (from TW API)
### Revenue
- orderRevenue, grossSales, netRevenue, totalSales, newCustomerRevenue, returningCustomerRevenue, blendedSales

### Orders
- orders, newCustomerOrders, ordersWithAmount, itemsSold

### Costs
- metaAdSpend, googleAdSpend, tiktokAdSpend, redditAdSpend, cogs, cogsOrders, cogsRefunds, paymentGatewayCosts

### Efficiency (TW-calculated, never calculate these yourself!)
- mer, ncpa, blendedCpa, totalCpa, newCustomerRoas, blendedAttributedRoas, poas

### Profit
- grossProfit, netProfit, netMargin, cashTurnover, contributionProfit, topRoas, topPoas

### Traffic
- sessions, uniqueUsers, conversionRate, costPerSession, costPerAddToCart, bounceRate, pixelPurchases, addToCarts, addToCartRate, newUsers, newUsersPercent, pageViews, pagesPerSession, avgSessionDuration

### AOV & LTV
- aov, aovIncludeZero, ltv, customerFrequency

### Refunds
- refunds

### Meta
- metaRoas, metaCpa, metaImpressions, metaClicks, metaOutboundClicks, metaCtr, metaCpm, metaCpc, metaPurchases, metaTotalPurchases, metaConversionValue, metaCpoc

### Google
- googleRoas, googleAllRoas, googleCpa, googleAllCpa, googleImpressions, googleClicks, googleCtr, googleCpm, googleCpc, googleConversionValue

### TikTok
- tiktokRoas, tiktokCpa, tiktokImpressions, tiktokCtr, tiktokCpm, tiktokCpc, tiktokPurchases, tiktokConversionValue

### Reddit
- redditRoas, redditCpa, redditImpressions, redditClicks, redditCtr, redditCpm, redditCpc, redditConversions, redditConversionValue

## Pages to Update

### 1. Dashboard (`app/dashboard/page.tsx`)
Currently uses sample data from `lib/sample-data.ts`. Replace:
- **KPI Cards** (Row 1): Net Revenue → `orderRevenue`, Net Orders → `orders`, Marketing Costs → sum of ad spends, MER → `mer`
- **KPI Cards** (Row 2): New Customers → `newCustomerOrders`, nCAC → `ncpa`, nMER → `newCustomerRoas` (inverted), CAC → `blendedCpa`
- **Revenue & Marketing Costs chart**: Use `getDailyData(twData, 'orderRevenue')` and daily ad spend
- **Net Orders & New Customers chart**: Use daily orders + daily new customer orders
- **Marketing Metrics Trend**: Sessions → `sessions`, CVR → `conversionRate`, EPS (earnings per session)
- **Channel Attribution Table**: Use real channel data from metaAdSpend, googleAdSpend, etc. for costs + metaRoas, googleRoas, etc.
- **Revenue Insights**: NC vs RC → `newCustomerRevenue` / `returningCustomerRevenue`, AOV → `aov`
- Add `<LiveBadge />` next to every `<DataSource source="Triple Whale" />` tag

### 2. Attribution Tree (`app/attribution/page.tsx`)
- **MER/nCAC Overview**: MER → `mer`, nCAC → `ncpa`, also show blendedCpa, ROAS → `topRoas`
- **Channel Allocation**: Build from real channel spend data (meta, google, tiktok, reddit)
- **Infrastructure section**: Keep as-is (tracking health is not from TW)
- Add `<LiveBadge />` next to DataSource tags for TW-sourced sections

### 3. Creative & MTA (`app/creative/page.tsx`)
- **Platform metrics**: Meta spend/ROAS/CPA, Google spend/ROAS/CPA, TikTok spend/ROAS/CPA
- **Performance tab**: Wire real spend, impressions, clicks, CTR, CPM, CPC, purchases, conversion value per platform
- Note: Ad-level creative data is NOT available from TW Summary API (would need MTA endpoint). Keep ad-level tables as sample data but wire platform-level summaries.
- Add `<LiveBadge />` next to DataSource tags for TW sections

### 4. Cohort Analysis (`app/cohorts/page.tsx`)
- **Retention data**: The Summary API provides `ltv`, `customerFrequency`, `newCustomerOrders` — use these for the summary cards
- The detailed cohort heatmap data is NOT in the Summary API. Keep the cohort table as sample data.
- Wire what we can: customer count, LTV, frequency, NC/RC split
- Add `<LiveBadge />` next to DataSource tags for TW sections

## Important Rules
1. **NEVER calculate derived metrics yourself** — always use TW's pre-calculated values
2. **Graceful fallback** — if twData is null/loading, show the existing sample data as fallback
3. **Loading state** — show skeleton/loading while fetching
4. **LIVE badge placement** — add `<LiveBadge />` right next to every existing `<DataSource source="Triple Whale" />` or `<DataSource source="TripleWhale" />`
5. **Don't break existing functionality** — the date picker, currency toggle, etc. should still work
6. **Date format** — the dateRange from useDateRange() gives Date objects. Convert to YYYY-MM-DD strings for the API.

## LiveBadge Usage
```tsx
import { LiveBadge } from '@/components/ui/LiveBadge';

// Place next to DataSource:
<div className="flex items-center gap-2">
  <DataSource source="Triple Whale" />
  <LiveBadge />
</div>
```
