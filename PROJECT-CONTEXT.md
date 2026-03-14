# Click-Man Control Panel — Project Brief

*Created: 2026-03-14*
*Source: Jordan's email "Clickman Control Panel for &you"*

---

## Overview
Multi-page marketing and financial dashboard for AndYou.ph. Visualizes data AND provides direct insights/suggestions. Branded with AndYou identity. Deployed on Vercel.

---

## Pages / Modules

### Page 1: Cash Flow Analysis
*Inspiration: https://www.curtishowland.com/tools/cashflow-projection*

**Must have:**
- Sensitivity analysis
- Cohort analysis (waterfall model)
- Monthly summary
- First-time vs repeat customer breakdown
- Pull real-time data from BigQuery
- Allow manual variable adjustment: target CPA, return customer rate, AOV
- Predict cashflow, profitability, targets
- Pull from: BigQuery, P&L, cash on hand
- Variables for anything it can't pull directly
- **Separate view from attribution tree**

**Data sources:**
- BigQuery (order data, customer data)
- First Time Customer P&L Google Sheet (1FreUi7y_yELYZ9raSmIDf6_tERYD4Dv-oOax2th9Y_U)
- Company actual P&L (Jordan to provide)

### Page 2: Attribution Tree
*Framework: Curtis Howland's Christmas Tree (curtishowland.com/attribution)*

#### The Star (Top): MER & nCAC
- Monthly cron jobs analyzing historical data
- Channel-agnostic business health metrics
- Updates on where to allocate spend

#### Upper Branches: Channel Allocation
- Post-purchase surveys from Triple Whale
- MMM (Marketing Mix Modeling)
- Geo-lift testing placeholder (for future multi-market / Philippine island testing, e.g., Davao holdout)
- Budget allocation recommendations per channel

#### Lower Branches: Ad-Level Optimization
- Pull platform data from: Meta, Google, Reddit, TikTok, Email, SMS
- Platform metrics: CTR, CPM, CPC, Frequency, etc.
- Touch attribution: Triple Attribution (no views), Linear Paid, First Click, Last Click
- Which specific ads to scale or cut

#### Supporting Infrastructure (Trunk)
- Platform event manager verification (server-side)
- Cohort-based LTV analysis
- GA4, CAPI, server-side tracking status
- Sets CPA targets everything else optimizes toward

### Page 3: MER & nCAC Model
- Next step: extrapolate to all new customers
- Calculate cost per new customer response per channel (from post-purchase survey)
- Visualize budget push recommendations

### Page 4: MTA Analysis & Creative Control Panel
*Replicate and extend Jordan's DataSlayer Google Sheet (1J6pfAZmzRTdj71TlCHl8u0lSvnVTq5C_75oa1NEeYNg)*

**Existing sheet tabs to replicate:**
- Performance_Spend (account performance + spend metrics)
- AdChurn_Monthly (ads launched/churned per month)
- AdChurn_Percentage (creative fatigue tracking)
- AccountControl (campaign-level overview with CPA vs Spend)
- AccountControl_Opportunity (optimization insights)
- TopCreatives_SpendSplit (budget on winners)
- TopCreatives_Instances (creative reuse frequency)
- TopCreatives_HitRate (success rate of creatives)
- CreativeLaunches_Hitrate (new creative success rate)
- CreativeLaunches_Spend (test budget allocation)
- Pareto_Analysis (80/20 rule for creatives/campaigns)
- Campaign_Spend (spend distribution)
- Y/Y_Comp (year-over-year)
- Demographic_Data (age, gender breakdown)

**Current data:** Meta only via DataSlayer. Need: Reddit, Google, TikTok, Meta.

**MTA segmentation required:**
- First click, Last click, Linear paid, Triple attribution
- Attribution windows
- Time-to-purchase table with sub-tabs per platform
- AOV incorporated per platform/attribution model

### Page 5: Target Tracking (Klar-style)
- Set monthly targets: MER, aMER, revenue, CM3, etc.
- Real-time tracking against targets
- Visual indicators for on/off track

### Page 6+: Klar Reference Views (5 dashboard views)
From attached images:
1. **Daily Overview** — KPI cards (revenue, orders, costs, MER, NC, CAC), time series charts, channel attribution table, revenue insights (NC vs RC), product KPIs
2. **Revenue & Profit (P&L)** — GMV → Gross Revenue → Net Revenue → CM1 → CM2 → CM3 → EBITDA waterfall, time period toggles, trend lines
3. **Product Relationships** — Product table with customers, orders, repurchase rate, first/repeat order rates
4. **Cohort Analysis** — Monthly cohorts, new customers, CAC, incremental revenue by period, heatmap
5. **Cohort Comparison** — Product-level CLV extension (First Order, 90d, 365d, >365d), time-lag to repeat purchase, repeat rates by window

---

## Data Sources

| Source | What it provides | Connection |
|--------|-----------------|------------|
| BigQuery | Order data, customer data, revenue, products | API / Vercel serverless |
| Triple Whale | MTA data, post-purchase surveys, attribution | API |
| Shopify | Orders, customers, products, subscriptions | Via BigQuery or direct API |
| Meta Ads | Campaign/ad-level data, spend, conversions | API or BigQuery |
| Google Ads | Campaign/ad-level data, spend, conversions | API or BigQuery |
| TikTok Ads | Campaign/ad-level data, spend, conversions | API or BigQuery |
| Reddit Ads | Campaign/ad-level data, spend, conversions | API |
| Google Sheets | First Time Customer P&L, actual P&L | Google Sheets API |
| Manual Input | Cash on hand, targets, variables | UI input fields |
| Microsoft Clarity | Session data, heatmaps | API (already connected) |

---

## Tech Stack
- **Frontend:** Next.js + React (Vercel)
- **Data:** BigQuery (primary), direct API calls (TW, ad platforms)
- **Visualization:** Recharts or similar (dark theme, Klar-style)
- **Branding:** AndYou.ph brand guidelines
- **Refresh:** Cron jobs for automated analysis OR manual refresh button

---

## Design Direction
- Dark theme (deep navy/purple like Klar)
- AndYou brand colors and identity
- KPI cards with sparklines and comparison badges
- Heatmap tables for cohort data
- Time-series charts with multiple lines
- Expandable/collapsible rows in P&L view
- Mobile responsive but primarily desktop
- Export to XLSX capability

---

## Questions for Jordan
1. Can you share the actual company P&L (or a template)?
2. What BigQuery tables/datasets are available for AndYou? (schema/table names)
3. Which ad platform data already flows to BigQuery vs needs direct API?
4. Do post-purchase surveys already run in Triple Whale?
5. What Triple Whale API access do we have? (API key, endpoints)
6. Reddit Ads API access (do we have credentials)?
7. TikTok Ads API access?
8. AndYou brand assets (logo, color palette, fonts)?
9. What specific targets does the team currently track monthly?
10. Who besides you will use this dashboard? (Wesley, team?)
11. Any MMM tools currently in use, or placeholder for now?
12. Preferred hosting: Vercel project under existing AndYou account?

---

## Build Order (Proposed)
1. **Scaffold:** Next.js app with dark theme, AndYou branding, navigation
2. **Cash Flow Analysis:** Hardest standalone piece, build first with manual inputs
3. **Daily Overview (Klar-style):** KPI cards, charts, channel table
4. **P&L View:** Waterfall breakdown
5. **Attribution Tree:** Visual + data integration
6. **MTA/Creative Control Panel:** Port Google Sheet logic
7. **Cohort Views:** Analysis + comparison
8. **Target Tracking:** Monthly target entry and real-time tracking
9. **Data Connections:** Wire up BigQuery, TW, ad platform APIs
10. **Cron Jobs / Refresh:** Automated analysis and suggestions engine

---

## Notes
- Jordan said "Take your time on this, be extra thorough"
- Jordan said "For now, let's focus on building the visualization and then we can work on connections and perfection later"
- Lift studies: Use Meta Lift, Google Lift, TikTok Lift instead of tools like Haus for now
- FYI for later: May want geo-lift within Philippines by island (e.g., Davao holdout test)
