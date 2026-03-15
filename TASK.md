# Task: Add Demo Charts to Creative & MTA Control Panel

## Context
The Creative & MTA page (`app/creative/page.tsx`) has 9 tabs. Currently only "Performance" and "Pareto" have actual visualizations. 5 tabs show empty placeholders: Account Control, Ad Churn, Creative Launches, Demographics, and (partially) Top Creatives.

We need to add **demo charts with sample data** for these 5 specific tabs. The charts should look polished and match the existing design system. Use recharts (already installed, v3.8.0). All sample data goes in `lib/sample-data.ts`. Tooltip definitions go in `lib/tooltips.ts`.

## Tech Stack
- Next.js 16 (app router), React, TypeScript
- recharts for charts
- Tailwind CSS with CSS variables (see globals.css for theme vars like `--color-bg-surface`, `--color-border`, `--color-text-primary`, etc.)
- Existing components: `InfoTooltip`, `ExportButton`, `AISuggestionsPanel`

## Design System Colors (from CSS vars)
- brand-blue: `#4A6BD6` / light: `#6B8DE8`
- success: `#10B981`
- danger: `#EF4444`  
- warm-gold: `#EDBF63`
- bg-surface, bg-elevated, border, text-primary, text-secondary, text-tertiary (CSS vars)

## The 5 Charts to Implement

### 1. Account Control (Scatter Plot)
**Tab: "Account Control"**

A scatter plot showing CPA (Y-axis) vs Spend (X-axis) per ad. Each dot represents one ad creative. The chart should have 4 visible quadrants defined by a horizontal CPA target line (e.g., ₱787) and a vertical spend threshold (e.g., ₱30K):

- **Bottom-right (green zone):** "Scaling" — High spend, low CPA. These are your winners.
- **Bottom-left:** "Testing" — Low spend, low CPA. Potential winners, not yet proven at scale.
- **Top-left:** "Untapped / Testing" — Low spend, high CPA. Still in learning phase or not working.
- **Top-right (red zone):** "Zombies" — High spend, high CPA. Wasting money. Kill these.

Use `ScatterChart` from recharts. Add a `ReferenceLine` for the CPA target and spend threshold. Color-code dots by quadrant (green for scaling, blue for testing, red for zombies, yellow for untapped). Add a legend explaining the quadrants.

**Info popup description:** "Scatter plot of CPA vs Spend per ad. Identifies which ads are efficient at scale (bottom-right) vs. zombie ads wasting budget (top-right). The horizontal line is your CPA target (₱787). Ads above it are too expensive. The vertical line separates testing (<₱30K spend) from scaled ads."

Generate ~20 data points spread across all 4 quadrants.

### 2. Churn & Testing Control (Stacked Bar Chart)
**Tab: "Ad Churn"**

A stacked bar chart showing monthly ad spend broken down by ad age:
- **Dark colors:** New ads (launched in last 30 days)
- **Medium colors:** Mid-age ads (30-60 days old)
- **Light colors:** Old ads (60+ days old)

X-axis: months (Oct 2025 through Mar 2026)
Y-axis: Spend in ₱

The chart should show a healthy mix shifting over time. Include a description explaining: "Light Colors = Old ads. Dark Colors = New ads. A healthy account has a steady flow of new creative taking over spend from older ads. If you're 100% reliant on ads from 6 months ago, you're fragile. If you never retest old winners, you're leaving money on the table."

### 3. Creative Churn (Stacked Area Chart)
**Tab: needs to be added or use existing "Creative Launches" tab**

Actually, replace the "Creative Launches" tab content with this. A stacked area chart showing spend over time by **creative cohort** (month launched). Each color represents creatives launched in a specific month.

- Darker/newer colors for recent cohorts
- Lighter/older colors for older cohorts

The key insight: if newer cohorts (darker colors) aren't taking over spend from old ones, performance is about to nosedive. This is a forecasting tool.

X-axis: weeks or months
Y-axis: Total spend
Colors: gradient from light (oldest cohort) to dark (newest cohort)

**Description:** "Creative Churn by Cohort. Different colors represent groups of ads launched in the same month. Healthy accounts show newer cohorts (darker colors) steadily taking over spend from older ones. If old cohorts still dominate, creative fatigue is building and performance will decline."

### 4. Production & Slugging Rate (Bar Chart with Hit Rate overlay)
**Tab: "Top Creatives" — rename to show this OR add as section in Creative Launches**

Actually, let's put this in the existing "Top Creatives" tab, replacing the placeholder.

Bar chart with two layers per month:
- Total bar height = total ads launched that month
- Dark/filled portion = ads that "hit" (achieved >₱10K spend with CPA below target)
- The hit rate percentage shown as a label on each bar

X-axis: months (Oct 2025 through Mar 2026)
Y-axis: Number of ads

Include a slugging rate summary: "X out of Y ads launched actually scaled (Z% hit rate)"

**Description:** "Production & Slugging Rate tracks your 'at bats' vs 'hits.' Bars show how many new ads were launched each month. Dark sections show how many actually worked (scaled profitably). If you launch 50 ads and zero scale, you don't have a media buying problem — you have a creative strategy problem."

### 5. Gender/Demo Analysis (Horizontal Bar Charts)
**Tab: "Demographics"**

Two side-by-side charts:

**a) Age Group Performance:**
Horizontal bar chart showing CPA and Conversions by age group:
- 18-24
- 25-34
- 35-44
- 45-54
- 55-64
- 65+

Color bars by efficiency (green if CPA below target, red if above).

**b) Gender Performance:**
Simple breakdown showing:
- Male vs Female vs Other
- For each: Spend, Conversions, CPA, ROAS

Add a callout/insight box: "Women 25-44 drive 62% of conversions at the lowest CPA. Align creative production to this demographic."

**Description:** "Are you producing for the audience that is actually buying? If women 45+ are driving your profit but you keep producing TikTok-style ads for Gen Z, you're burning cash. Align your production queue with your paying demographic."

## Implementation Notes

1. All sample data arrays go in `lib/sample-data.ts` — add new named exports
2. Add new tooltip entries to `lib/tooltips.ts` for any new InfoTooltip usage
3. Update `app/creative/page.tsx` to render actual charts for these 5 tabs instead of the generic placeholder
4. Use the existing `tabDescriptions` object for the info box below tabs — update descriptions with the richer text provided above
5. Keep the existing platform/model/window filters UI even if they don't filter the demo data
6. The page already imports recharts BarChart components. Add ScatterChart, AreaChart, ReferenceLine, etc. as needed
7. Match existing code style: Tailwind classes, CSS variable references, component patterns
8. Ensure dark mode compatibility (use CSS vars, not hardcoded colors)

## DO NOT
- Remove or change any existing working features (Performance tab, Pareto tab, summary KPIs, Creative Intelligence panel)
- Change the overall page layout or navigation structure
- Modify any files outside of `app/creative/page.tsx`, `lib/sample-data.ts`, and `lib/tooltips.ts`
