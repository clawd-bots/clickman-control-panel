# Click-Man Control Panel — Build Brief

## What You're Building
A multi-page marketing and financial dashboard for AndYou.ph (Philippine telehealth company). 
It's called the "Click-Man Control Panel." Built on Next.js, deployed to Vercel.
Uses SAMPLE DATA for now (no real API connections yet). Focus on design, UX, and structure.

## Brand Identity
- **Company:** &you (andyou.ph) — telehealth for Filipinos
- **Font:** Sofia Pro (body + headings). Use system fallback: `'Sofia Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Accent italic font:** PP Editorial New (for decorative headlines only)
- **Logo:** Use text "&you" in the nav (with ampersand styled). The ampersand should be distinctive.
- **Color Palette (DARK THEME dashboard):**
  - Background primary: `#0D0F17` (deep dark navy, almost black)
  - Background surface: `#161927` (card/panel backgrounds)
  - Background elevated: `#1E2235` (hover states, active items)
  - Brand blue: `#334FB4` (primary accent, buttons, active states)
  - Brand blue light: `#4A6BD6` (hover states)
  - Warm gold: `#E8C872` (highlights, important metrics, warnings)
  - Success green: `#34D399`
  - Danger red: `#EF4444`
  - Text primary: `#F1F5F9` (white-ish)
  - Text secondary: `#94A3B8` (muted gray)
  - Text tertiary: `#64748B` (very muted)
  - Border: `#1E293B`
- **Design style:** Dark theme like Klar analytics. Clean, professional, data-dense but not cluttered. Rounded corners (8px cards, 6px buttons). Subtle borders. No heavy shadows.

## Pages to Build (7 pages via sidebar navigation)

### Page 1: Dashboard Overview (Daily Overview)
Klar-style daily overview. Main landing page.
- **Top row:** Date range picker (default: Past 7 days) + Refresh button
- **KPI Cards (2 rows x 4 columns):**
  Row 1: Net Revenue, Net Orders, Marketing Costs, MER
  Row 2: New Customers, nCAC, nMER, CAC
  Each card has: metric label + info icon (tooltip), large bold number, comparison value (vs prior period) with colored dot, % change badge (green/red), inline sparkline chart
- **Revenue & Marketing Costs chart:** Multi-line time series (green = revenue, orange = spend) with targets as dashed lines
- **Net Orders & Customers chart:** Multi-line (orders + new customers with targets)
- **Marketing Insights section:** Left: Sessions, CVR, EPS cards. Right: stacked bar chart of marketing metrics over time
- **Channel Attribution Table:** Columns: Channel, Costs, Net Revenue, ROAS, Orders, CPO, New Customers, NC%. With checkboxes for graphing. Tabs: Data Driven, Order Date, Validated
- **Revenue Insights:** Left: Stacked bar (NC vs RC revenue). Right: NC Revenue, RC Revenue, NC AOV, RC AOV cards + donut charts for First-Purchase % and Repeat %
- **Product KPIs table:** Product, Net Revenue, Units Sold, Price Reduction %, Discount Code %

### Page 2: Profit & Loss
Full P&L waterfall view.
- **KPI Cards:** Net Revenue, CM1, CM2, CM3, EBITDA with sparklines
- **Time period toggle:** Total | Quarter | Month | Week | Day
- **Trend chart:** Multi-line showing all margin levels over time
- **P&L Table:** Hierarchical/tree with expandable rows. Color-coded aggregation bars:
  - 🟡 GMV → Price Reductions, Discount Codes, Shipping Revenue
  - 🟠 Gross Revenue → Gross Orders, AOV, Returns, Taxes
  - 🟢 Net Revenue → Net Orders, Net AOV, COGS
  - 🟡 CM1 → CM1%, Logistics, Transaction Costs
  - 🔵 CM2 → CM2%, Marketing Costs
  - 🟣 CM3 → CM3%
  - EBITDA
- Each row expandable. Values right-aligned. Export XLSX button.

### Page 3: Cash Flow Analysis
Inspired by curtishowland.com/tools/cashflow-projection
- **Input panel (sidebar or top):** Editable variables:
  - AOV, CPA, Gross Margin %, Monthly Growth %, M1 Spend
  - Retention model selector (E-Commerce / Subscription / Custom)
  - Advanced: Untracked Lift %, CPA Escalation %, Split Margins toggle
- **12-Month Outlook summary:** Peak Deficit, Ending Position, Monthly Break-Even, Total Spend, Total Gross Profit
- **Cohort Waterfall Table:** Rows = cohorts (C1-C12), Columns = months. Shows acquisition loss then repeat margin flowing back. Checkmarks for break-even. Bottom rows: Acq. Spend, Gross Margin, Net Cash, Cumulative.
- **Charts:**
  - Revenue Composition (new vs repeat stacked)
  - Cohort Retention Curves
  - Cash Flow Waterfall
  - Sensitivity Analysis (cards showing impact of CPA -$5, AOV +$10, Retention +5pts, Margin +5pts)
  - Cohort LTV Buildup
- **Monthly Summary Table:** Month, New Cust, Acq Spend, Repeat Orders, Total Revenue, Gross Profit, Net Cash, Cumulative, LTV:CAC

### Page 4: Attribution Tree
Visual representation of the Christmas Tree framework.
- **Visual tree diagram** at top showing the hierarchy:
  - Star (top): MER/nCAC
  - Upper branches: Post-Purchase Surveys, MMM, Geo-Lift Testing
  - Lower branches: MTA, Platform Reporting
  - Trunk: GA4, CAPI, Server-side tracking
  - Roots: Cohort-based LTV
- **Each layer is clickable** and expands into a detail section below
- **MER/nCAC section:** Current values, trend, max marketing spend formula, target CPA
- **Channel Allocation section:** Survey results visualization (pie chart: where customers first heard about us), budget recommendations per channel
- **Ad-Level section:** Account Control Chart (scatter: CPA vs Spend per ad), top/bottom performers table
- **Infrastructure section:** Tracking health status (green/yellow/red indicators), event manager verification
- **AI Suggestions panel:** "Refresh Analysis" button. When clicked, shows AI-generated suggestions like:
  - "Meta CPA trending up 12% MoM. Consider refreshing top-of-funnel creative."
  - "Survey data shows TikTok driving 22% of first touches but only getting 8% of budget. Consider reallocation."
  - "Cohort LTV for Meta customers is 2.1x vs TikTok at 1.4x. Adjust CPA targets accordingly."

### Page 5: Creative & MTA Control Panel
Replicates and extends Jordan's DataSlayer Google Sheet.
- **Tab navigation:** Performance, Ad Churn, Account Control, Top Creatives, Creative Launches, Pareto, Campaign Spend, Y/Y Comp, Demographics
- **Platform selector:** Meta | Google | TikTok | Reddit | All
- **Attribution toggle:** Default | Triple Whale First Click | Triple Whale Total
- **Attribution window selector:** 1d Click | 7d Click | 7d Click + 1d View | 28d Click
- **MTA Segmentation tabs:** First Click | Last Click | Linear Paid | Triple Attribution (No Views)
- **Time-to-purchase table** with sub-tabs per platform and AOV data
- **Each tab:** Data table with sorting + key metrics cards + charts
- **AI Suggestions panel** with refresh button

### Page 6: Cohort Analysis & Retention
Two sub-views (tabs):
**Tab A: Cohort Analysis**
- Metric dropdown (Net Revenue / CM2 / Orders)
- Toggle: Incremental vs Accumulative
- Toggle: Customer vs Total
- Time granularity: Month | Week | Quarter | Year
- Format: % | #
- Heatmap toggle
- **Cohort table:** Rows = monthly cohorts, Columns = periods after first purchase. Cells colored with heatmap gradient. Includes New Customers, CAC, First Order columns.
- Average row at bottom.

**Tab B: Cohort Comparison**
- **CLV Extension bar chart:** Grouped bars per product showing First Order, 90d CLR, 365d CLR, >365d revenue
- **Product comparison table:** Product, Customers, Days since 1st Order, Time-lag to 2nd/3rd/4th order, Avg Orders, 30d/60d/90d/180d/365d repeat rates
- Heatmap coloring on cells

### Page 7: Targets & Goals
- **Monthly target entry:** Set targets for MER, aMER, nMER, Revenue, CM3, New Customers, CAC, etc.
- **Progress visualization:** Gauge charts or progress bars showing actual vs target
- **On-track indicators:** Green (on pace), Yellow (at risk), Red (off track)
- **Trend chart:** Actual vs target over time for each metric
- **AI Suggestions panel** with refresh button analyzing progress

## Global UX Requirements
1. **Left sidebar navigation:** Icon + text, collapsible. Active state highlighted. Icons for each page.
2. **Top bar:** "&you" logo (left), "Click-Man Control Panel" title (center), date range picker + user avatar (right)
3. **Info tooltips:** Every metric label has an (i) icon. On hover, shows a clear tooltip explaining what the metric means, how it's calculated, and why it matters. Make these genuinely helpful, not generic.
4. **Refresh/AI Suggestions buttons:** Yellow/gold accent button labeled "🔄 Refresh Analysis" or "✨ Get Insights". When clicked, shows a panel with 3-5 actionable suggestions. Use sample suggestions for now.
5. **Comparison badges:** Green pill for positive change, red pill for negative. Show % and absolute delta.
6. **Sparklines:** Small inline charts in KPI cards (50px tall, no axes).
7. **Export buttons:** "Export XLSX" in bottom-right of data tables.
8. **Responsive:** Primarily desktop (1440px+) but should work on tablets.
9. **Loading states:** Skeleton loaders for cards and tables.
10. **All sample data should feel realistic** for a Philippine telehealth company selling weight loss, hair regrowth, and men's health products. Use Philippine Peso (₱) where appropriate but also USD for ad spend metrics.

## Tech Stack
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Recharts for charts
- Lucide React for icons
- shadcn/ui components (where helpful)
- Sample data in /lib/sample-data.ts

## File Structure
```
/app
  /layout.tsx (sidebar + topbar)
  /page.tsx (redirects to /dashboard)
  /dashboard/page.tsx (Page 1: Overview)
  /pnl/page.tsx (Page 2: P&L)
  /cashflow/page.tsx (Page 3: Cash Flow)
  /attribution/page.tsx (Page 4: Attribution Tree)
  /creative/page.tsx (Page 5: Creative & MTA)
  /cohorts/page.tsx (Page 6: Cohort Analysis)
  /targets/page.tsx (Page 7: Targets)
/components
  /layout/Sidebar.tsx
  /layout/TopBar.tsx
  /ui/ (shared components)
  /dashboard/ (page-specific components)
  /pnl/
  /cashflow/
  /attribution/
  /creative/
  /cohorts/
  /targets/
/lib
  /sample-data.ts
  /utils.ts
  /tooltips.ts (all tooltip content centralized)
```

## Important Notes
- This is visualization/scaffolding ONLY. No real API connections.
- Sample data should be comprehensive and realistic.
- Every metric needs a tooltip explanation.
- The AI suggestions panels should show realistic, actionable sample suggestions.
- Follow the &you brand. This should feel premium and polished.
- The name "Click-Man Control Panel" should appear in the header. Make it look cool.
