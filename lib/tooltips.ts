export const tooltips: Record<string, string> = {
  // Dashboard Overview
  'Net Revenue': 'Total revenue after returns, discounts, and taxes. This is the real money coming in from product sales.',
  'Net Orders': 'Total orders minus cancelled and returned orders. Reflects actual fulfilled demand.',
  'Marketing Costs': 'Total ad spend across all paid channels (Meta, Google, TikTok, etc.). Does not include organic or content costs.',
  'MER': 'Marketing Efficiency Ratio = Net Revenue ÷ Marketing Costs. Higher is better. Shows how many pesos of revenue each peso of ad spend generates.',
  'New Customers': 'First-time purchasers within the period. The lifeblood of growth — these are people who never bought from AndYou before.',
  'nCAC': 'New Customer Acquisition Cost = Marketing Costs ÷ New Customers. How much you pay to acquire each new customer.',
  'nMER': 'New Customer MER = New Customer Revenue ÷ Marketing Costs. Isolates efficiency of spend at acquiring new customers vs. all revenue.',
  'CAC': 'Customer Acquisition Cost = Marketing Costs ÷ Total Orders. Blended cost per order including repeat customers.',
  'Sessions': 'Total website visits. One person can create multiple sessions across different days.',
  'CVR': 'Conversion Rate = Orders ÷ Sessions × 100. What percentage of website visitors actually buy something.',
  'EPS': 'Earnings Per Session = Net Revenue ÷ Sessions. How much revenue each website visit generates on average.',
  'ROAS': 'Return on Ad Spend = Revenue ÷ Ad Spend. A 3.0x ROAS means ₱3 revenue for every ₱1 spent.',
  'CPO': 'Cost Per Order = Ad Spend ÷ Orders from that channel. How much each order costs you in ad spend.',
  'NC%': 'New Customer Percentage = New Customers ÷ Total Orders × 100. Higher means more acquisition vs. repeat.',

  // P&L
  'GMV': 'Gross Merchandise Value — the total value of all items sold before any deductions. The "sticker price" total.',
  'CM1': 'Contribution Margin 1 = Net Revenue − COGS. Profit after product costs but before logistics and marketing.',
  'CM2': 'Contribution Margin 2 = CM1 − Logistics − Transaction Costs. Profit after fulfillment but before marketing.',
  'CM3': 'Contribution Margin 3 = CM2 − Marketing Costs. True profit from operations after all variable costs.',
  'EBITDA': 'Earnings Before Interest, Taxes, Depreciation & Amortization. Operating profit before fixed costs.',
  'CM1%': 'CM1 as a percentage of Net Revenue. Target: 65-75% for health/wellness DTC.',
  'CM2%': 'CM2 as a percentage of Net Revenue. Target: 55-65% for efficient fulfillment.',
  'CM3%': 'CM3 as a percentage of Net Revenue. Target: 15-25% for healthy growth.',
  'AOV': 'Average Order Value = Net Revenue ÷ Net Orders. Higher AOV means more revenue per transaction.',
  'COGS': 'Cost of Goods Sold — direct product costs including manufacturing, packaging, and ingredients.',
  'Logistics': 'Shipping and fulfillment costs including courier fees, packaging materials, and warehouse handling.',
  'Transaction Costs': 'Payment processing fees from GCash, Maya, credit cards, and COD handling charges.',
  'Price Reductions': 'Revenue lost from sale prices vs. original retail price. Tracks markdown impact.',
  'Discount Codes': 'Revenue lost from promo codes and vouchers applied at checkout.',
  'Returns': 'Revenue reversed from returned or refunded orders. Track return rate to identify product issues.',

  // Cash Flow
  'Peak Deficit': 'The maximum negative cash position during the projection period. This is how much working capital you need.',
  'Monthly Break-Even': 'The month where cumulative cash flow turns positive. When the business starts "paying back" its acquisition investment.',
  'LTV:CAC': 'Lifetime Value to Customer Acquisition Cost ratio. Above 3:1 is healthy. Below 1:1 means you lose money on each customer.',
  'Gross Margin %': 'Percentage of revenue retained after COGS. For AndYou, this should be 65-75%.',
  'CPA Escalation': 'Expected monthly increase in Cost Per Acquisition as you scale. Accounts for audience saturation.',
  'Untracked Lift': 'Additional conversions driven by marketing but not attributed by tracking. Usually 10-30% for DTC brands.',

  // Attribution
  'Post-Purchase Survey': 'Self-reported attribution from "How did you hear about us?" surveys. Best for understanding awareness channels like TikTok and word-of-mouth.',
  'MMM': 'Marketing Mix Modeling — statistical model that estimates each channel\'s contribution using aggregate data. Good for budget allocation.',
  'Geo-Lift Testing': 'Incrementality testing by comparing regions where ads run vs. don\'t. The gold standard for proving causality.',
  'MTA': 'Multi-Touch Attribution — assigns credit to touchpoints in the customer journey using tracking data. Good for ad-level optimization.',
  'Platform Reporting': 'Native reporting from Meta, Google, TikTok dashboards. Often inflated due to overlapping attribution windows.',
  'CAPI': 'Conversions API — server-side event tracking that bypasses browser limitations and ad blockers.',

  // Creative
  'Ad Churn': 'Rate at which ad creatives lose effectiveness over time. High churn means you need more frequent creative refreshes.',
  'Account Control Chart': 'Scatter plot of CPA vs. Spend per ad. Identifies which ads are efficient at scale vs. small-budget flukes.',
  'Pareto': 'The 80/20 distribution of ad performance. Usually 20% of creatives drive 80% of results.',
  'Time to Purchase': 'Days between first ad click and purchase. Longer windows may indicate higher consideration products.',

  // Cohorts
  'Cohort': 'A group of customers who made their first purchase in the same time period. Used to track retention behavior over time.',
  'Retention Rate': 'Percentage of customers from a cohort who make another purchase in a given period.',
  'CLV': 'Customer Lifetime Value — total revenue (or margin) a customer generates over their entire relationship.',
  'CLR': 'Customer Lifetime Revenue — cumulative revenue per customer at a given time horizon (90d, 365d, etc.).',
  'Repeat Rate': 'Percentage of customers who make at least one additional purchase after their first.',
  'NC Revenue': 'New Customer Revenue — revenue from first-time purchasers only.',
  'RC Revenue': 'Repeat Customer Revenue — revenue from returning customers. The holy grail of DTC profitability.',
  'NC AOV': 'New Customer Average Order Value. Often lower than repeat due to trial/starter products.',
  'RC AOV': 'Repeat Customer Average Order Value. Usually higher as customers trade up to larger sizes or bundles.',

  // Targets
  'aMER': 'Adjusted MER — MER calculated with estimated untracked conversions included. More realistic efficiency view.',
  'Target Pace': 'Current run rate vs. monthly target. Green = on track, Yellow = at risk, Red = behind.',
};
