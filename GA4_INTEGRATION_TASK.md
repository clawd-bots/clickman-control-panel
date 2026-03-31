# GA4 Frontend Integration Task

## Goal
Wire real GA4 data into frontend pages that use Google Analytics metrics. Add LIVE badges for GA4-powered components (same pattern as Triple Whale).

## What's Already Done
- API route: `app/api/ga4/route.ts` — working, tested, 20+ metrics
- Client lib: `lib/ga4-client.ts` — fetch helper + types
- LIVE badge: `components/ui/LiveBadge.tsx` — already exists
- Skeleton components: `components/ui/Skeleton.tsx` — already exists

## API Usage
```tsx
import { fetchGA4Data, getGA4Metric, GA4Data } from '@/lib/ga4-client';

// In component, add alongside existing TW fetch:
const [ga4Data, setGa4Data] = useState<GA4Data | null>(null);
const [ga4Loading, setGa4Loading] = useState(true);

useEffect(() => {
  const start = dateRange.startDate.toISOString().split('T')[0];
  const end = dateRange.endDate.toISOString().split('T')[0];
  fetchGA4Data(start, end, 'all')
    .then(setGa4Data)
    .catch(console.error)
    .finally(() => setGa4Loading(false));
}, [dateRange]);

// Get values:
const ga4Sessions = getGA4Metric(ga4Data, 'sessions');
const engagementRate = getGA4Metric(ga4Data, 'engagementRate');
```

## Available GA4 Metrics
### Summary
- sessions, totalUsers, newUsers, activeUsers
- screenPageViews, screenPageViewsPerSession
- averageSessionDuration, bounceRate
- engagedSessions, engagementRate, sessionsPerUser
- conversions, eventCount
- ecommercePurchases, purchaseRevenue
- addToCarts, checkouts, itemsViewed
- cartToViewRate, purchaseToViewRate

### Traffic Sources (array)
- channel, sessions, totalUsers, newUsers, engagementRate, averageSessionDuration, conversions, ecommercePurchases, purchaseRevenue

### Daily (array)
- date, sessions, totalUsers, newUsers, screenPageViews, averageSessionDuration, bounceRate, engagementRate, conversions, ecommercePurchases, purchaseRevenue

## Pages to Update

### 1. Dashboard (`app/dashboard/page.tsx`)
The "Marketing Insights" section currently has a `<DataSource source="Google Analytics" />` tag. Wire these:
- **Sessions** → use `ga4Data.summary.sessions` (currently shows TW sessions — keep TW as primary, but add GA4 sessions as a secondary metric or replace the "Marketing Insights" section)
- **Engagement Rate** → `ga4Data.summary.engagementRate` (new — multiply by 100 for %)
- **Pages/Session** → `ga4Data.summary.screenPageViewsPerSession`
- **Avg Session Duration** → `ga4Data.summary.averageSessionDuration` (in seconds, format as Xm Ys)
- **Bounce Rate** → `ga4Data.summary.bounceRate` (multiply by 100 for %)
- **Conversions** → `ga4Data.summary.conversions`
- Update the Marketing Insights section to show these GA4 metrics. The section already has the "Google Analytics" DataSource tag — add a LiveBadge next to it.

IMPORTANT: The existing skeleton loading (`if (twLoading)`) should also check `ga4Loading`. Update the loading condition to: `if (twLoading || ga4Loading)` so the skeleton shows until BOTH data sources are ready.

### 2. Attribution Tree (`app/attribution/page.tsx`)
The "Tracking Infrastructure" section (trunk layer) references GA4. Wire:
- **GA4 Event Count** → `ga4Data.summary.eventCount` — shows tracking health
- **GA4 Sessions** → compare with TW sessions to show tracking accuracy
- **GA4 Ecommerce Purchases** → compare with TW pixel purchases
- Add LiveBadge to any DataSource tags in the trunk section that get GA4 data

IMPORTANT: Same loading condition update — `if (twLoading || ga4Loading)` for the skeleton.

### 3. Creative & MTA (`app/creative/page.tsx`)
- No major GA4 integration needed here (platform metrics come from TW)
- But update loading condition: `if (twLoading || ga4Loading)` if you add ga4 fetch

### 4. Cohort Analysis (`app/cohorts/page.tsx`)  
- No major GA4 integration needed here
- But update loading condition: `if (twLoading || ga4Loading)` if you add ga4 fetch

## Key Rules
1. LIVE badge goes next to any DataSource that gets real GA4 data
2. Skeleton loading must wait for ALL data sources (TW + GA4): `if (twLoading || ga4Loading)`
3. Don't break existing TW integration — GA4 supplements, doesn't replace
4. GA4 `bounceRate` and `engagementRate` are 0-1 decimals — multiply by 100 for display
5. `averageSessionDuration` is in seconds — format nicely (e.g. "2m 37s")
6. Graceful fallback if GA4 data fails to load — show TW data or sample data

## After Changes
1. Run `cd ~/clickman-control-panel && npx next build` to verify compilation
2. Commit: `git add -A && git commit -m "feat: wire GA4 live data to frontend with LIVE badges"`
3. When finished, run: `openclaw system event --text "Done: GA4 frontend wired to Dashboard + Attribution" --mode now`
