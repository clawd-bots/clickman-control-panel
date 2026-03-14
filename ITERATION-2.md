# Iteration 2 — Jordan's Feedback (19 Points)

## Changes Required

### 1. Click-Man Control Panel title — Make prominent, center-aligned
- In TopBar.tsx: Make "Click-Man Control Panel" the dominant center element
- Larger font, more visual weight. It IS the product name
- Keep the &you logo in the sidebar only

### 2. &you logo — already handled (PNG in /public/andyou-logo.jpg)
- Already uses `brightness-0 invert` for dark theme

### 3. Contrast ratios — Fix all text visibility
- Audit every text element. Ensure text-secondary (#94A3B8) is only used for truly secondary info
- Labels should be at minimum text-secondary, never text-tertiary
- Values should always be text-primary
- Check chart axis labels, table headers, sparkline labels

### 4. Date dropdown — Make functional
- TopBar date picker needs to be an actual working dropdown
- Use preset ranges: Today, Yesterday, Past 7 Days, Past 30 Days, This Month, Last Month, This Quarter, Custom
- Store in React state and pass via context or props

### 5. Comparison period selector
- Add "vs" comparison period next to date picker
- Options: Previous Period, Previous Year, Custom
- Shows what we're comparing against

### 6. Date picker — Show only when relevant
- Dashboard, Creative, Targets pages: show date picker
- P&L: show date picker (but also has its own period toggle)
- Cash Flow: hide date picker (uses its own projection inputs)
- Attribution: show date picker
- Cohorts: hide date picker (uses its own cohort range)

### 7. Info tooltips — Fix all broken ones
- Some tooltips don't show because the metric name doesn't match the tooltips record
- Audit every InfoTooltip usage and ensure the `metric` prop matches a key in tooltips.ts
- Add any missing tooltip entries

### 8. P&L — Fix date/period toggle conflict
- Remove the top-right global date picker on P&L page (or make it control the data range)
- The Total/Quarter/Month/Week/Day toggle should be the ONLY time control on P&L
- Make it clear: the toggle changes the granularity of the view
- Add a label like "View by:" before the toggle buttons

### 9. P&L Breakdown — Make cleaner
- Add more spacing between rows
- Make the color bars more subtle (thinner left border instead of full row bg)
- Better visual hierarchy: header rows bold, child rows indented more
- Add subtle row hover state
- Add expand/collapse all button

### 10. Report Issues widget — Bottom-left
- Fixed position button bottom-left (not overlapping sidebar)
- Icon: MessageCircle or Bug
- On click: opens a small form/modal with:
  - Issue type dropdown (Bug, Feature Request, Data Issue, Other)
  - Description textarea
  - Screenshot toggle (optional)
  - Submit button
- For now: just logs to console. Later will message Alfred via WhatsApp/email
- Text: "Report to Alfred" with a small butler hat emoji 🎩

### 11. Cash Flow — Hybrid subscription model
- Remove the retention model picker (E-Commerce/Subscription/Custom)
- Replace with TWO inputs:
  - Subscription Attach Rate % (what % of customers subscribe, default 0%)
  - Subscription Retention Curve (separate from one-time retention)
- Show BOTH one-time and subscription revenue streams in the waterfall
- Revenue composition chart should show: New (one-time), Repeat (one-time), Subscription
- Add a note: "Currently 0% subscription. Projected subscription launch in 1-2 months."
- Keep the sensitivity analysis cards but add one for "Sub Attach +10%"

### 12. Peak Deficit overlapping sidebar
- This is a layout issue. The cash flow summary cards may overflow
- Add `overflow-hidden` or proper `min-w-0` to the main content area
- Ensure cards wrap properly on smaller content widths
- Test at various widths

### 13. Attribution Tree — Redesign as tabbed/button row
- Remove the visual tree diagram (the stacked buttons)
- Replace with a horizontal row of tab-like buttons at the top
- Each button: icon + label (e.g., ⭐ MER/nCAC, 📊 Surveys & MMM, etc.)
- Clicking a tab shows that layer's content below
- Much cleaner, more professional UX
- Active tab has a bottom border accent color

### 14. Attribution — Default open to MER/nCAC
- Set initial state to activeLayer = 'star' instead of null

### 15. AI Insights — Two levels
- Global AI Insights panel at the top of Attribution page: cross-layer analysis
  - "Based on all attribution layers, here's the overall picture..."
  - 5-7 high-level suggestions
- Per-layer AI Insights: Each expanded layer section gets its own mini-insights
  - Structured as: ✅ What's Working, ⚠️ What's Not, 🎯 Do Next, 🛑 Stop Doing
  - 2-3 items per category

### 16. Creative & MTA — Add explanations for all tabs
- Each tab, when selected, should show a brief description/header explaining what it is and why it matters
- Pareto: "The 80/20 principle applied to ad creatives. Usually 20% of creatives drive 80% of results. Use this to identify your winners and stop spreading budget too thin."
- Ad Churn: "Tracks how quickly your ad creatives lose effectiveness. High churn = you need more frequent creative refreshes. Low churn = your creative has longer legs."
- Account Control: "Scatter plot of CPA vs Spend per ad. Helps identify which ads are efficient at scale vs. small-budget flukes. Top-right quadrant = expensive AND high spend = problem."
- Similar for all other tabs
- If Jordan's Google Sheet had descriptions that could be improved, improve them

### 17. Attribution windows — Match Triple Whale, use dropdowns
- Replace button array with TWO dropdowns:
  - Attribution Model: First Click, Last Click, Linear, Triple Attribution (No Views), Data-Driven
  - Attribution Window: 1-Day Click, 7-Day Click, 14-Day Click, 28-Day Click, 7-Day Click + 1-Day View
- These are the models/windows Triple Whale offers
- Much cleaner UX than a row of buttons

### 18. Cohort Analysis — Enhanced AI analysis
- Add a comprehensive AI analysis section below the cohort table
- Structure:
  - 💰 Spending Recommendations: Where to allocate budget based on cohort data
  - ⚠️ Caution Areas: Channels/products with declining retention
  - 📊 Channel Breakdown: Retention by channel (Meta, Google, TikTok)
  - 🛒 Product Impact: How product mix affects returning customer rate
  - 💵 AOV Analysis: AOV trends by cohort age, channel, product
  - 🎯 Key Outcome: Clear 1-sentence summary of what the data says

### 19. Targets — Add input fields, differentiate from Dashboard
- Add editable input fields for each target metric
- Each target card should have an edit icon that makes the target value editable
- ALSO add a "Set Monthly Targets" section at top with a clean form
- Differentiate from Dashboard:
  - Dashboard = overview of what IS happening (actuals, trends, channels)
  - Targets = what SHOULD happen (goals, gaps, recommendations)
  - Make this distinction clear in the page header/description
  - Consider removing the KPI cards from Targets page and keeping them Dashboard-only
  - Targets page focuses on: target entry, progress tracking, gap analysis, recommendations

### 20. (Bonus) Build anything else critical
After all 19 points, add:
- Proper 404 page
- Loading skeletons for all data sections
- Better mobile handling (at least don't break on tablet)

## Brand Colors Update (from Brand Toolbox)
Update globals.css with actual brand colors:
- Base near-black: #101312 (was #0D0F17)
- Warm cream accents: #F0EDE3
- Gold palette: #FFDF85 (light) to #C69346 (medium) to #51391A (dark)
- Keep the existing blue as a secondary accent for data viz
- The warm gold #EDBF63 is closer to the brand than our current #E8C872

## QA After Changes
Run QA from 3 perspectives:
1. Marketer: Can I quickly find the metrics I need? Are the AI suggestions actionable?
2. CEO: Does the P&L tell me if we're profitable? Can I set targets and track them?
3. QA/Developer: Are there any broken interactions, overlapping elements, TypeScript errors?
