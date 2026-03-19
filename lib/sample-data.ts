// ─── Dashboard Overview ───
export const dailyMetrics = [
  { date: 'Mar 1', revenue: 285000, spend: 82000, orders: 142, newCustomers: 98, sessions: 4200 },
  { date: 'Mar 2', revenue: 312000, spend: 85000, orders: 156, newCustomers: 108, sessions: 4600 },
  { date: 'Mar 3', revenue: 298000, spend: 79000, orders: 149, newCustomers: 103, sessions: 4350 },
  { date: 'Mar 4', revenue: 335000, spend: 91000, orders: 168, newCustomers: 115, sessions: 5100 },
  { date: 'Mar 5', revenue: 320000, spend: 88000, orders: 160, newCustomers: 110, sessions: 4800 },
  { date: 'Mar 6', revenue: 345000, spend: 93000, orders: 172, newCustomers: 120, sessions: 5300 },
  { date: 'Mar 7', revenue: 358000, spend: 95000, orders: 179, newCustomers: 125, sessions: 5500 },
];

export const kpiCards = {
  netRevenue: { value: 2253000, prev: 2058000, sparkline: [285, 312, 298, 335, 320, 345, 358], target: 2500000 },
  netOrders: { value: 1126, prev: 1042, sparkline: [142, 156, 149, 168, 160, 172, 179], target: 1200 },
  marketingCosts: { value: 613000, prev: 578000, sparkline: [82, 85, 79, 91, 88, 93, 95], target: 650000 },
  mer: { value: 3.67, prev: 3.56, sparkline: [3.48, 3.67, 3.77, 3.68, 3.64, 3.71, 3.77], target: 4.0 },
  newCustomers: { value: 779, prev: 715, sparkline: [98, 108, 103, 115, 110, 120, 125], target: 850 },
  ncac: { value: 787, prev: 808, sparkline: [837, 787, 767, 791, 800, 775, 760], target: 750 },
  nmer: { value: 1.92, prev: 1.78, sparkline: [1.72, 1.88, 1.95, 1.90, 1.87, 1.94, 1.99], target: 2.0 },
  cac: { value: 544, prev: 555, sparkline: [577, 545, 530, 542, 550, 541, 531], target: 500 },
};

export const channelAttribution = [
  { channel: 'Meta Ads', costs: 320000, revenue: 1250000, roas: 3.91, orders: 580, cpo: 552, newCustomers: 410, ncPct: 70.7 },
  { channel: 'Google Ads', costs: 165000, revenue: 580000, roas: 3.52, orders: 290, cpo: 569, newCustomers: 185, ncPct: 63.8 },
  { channel: 'TikTok Ads', costs: 88000, revenue: 280000, roas: 3.18, orders: 156, cpo: 564, newCustomers: 120, ncPct: 76.9 },
  { channel: 'Organic Search', costs: 0, revenue: 85000, roas: 0, orders: 52, cpo: 0, newCustomers: 35, ncPct: 67.3 },
  { channel: 'Direct', costs: 0, revenue: 42000, roas: 0, orders: 32, cpo: 0, newCustomers: 18, ncPct: 56.3 },
  { channel: 'Referral', costs: 40000, revenue: 16000, roas: 0.40, orders: 16, cpo: 2500, newCustomers: 11, ncPct: 68.8 },
];

export const productKPIs = [
  { product: 'GLP-1 Weight Loss Program (Semaglutide)', revenue: 985000, units: 328, priceReduction: 2.1, discountCode: 8.5 },
  { product: 'Hair Regrowth Kit (Minoxidil + Finasteride)', revenue: 520000, units: 412, priceReduction: 5.2, discountCode: 12.3 },
  { product: "Men's Health Starter Pack", revenue: 365000, units: 245, priceReduction: 0, discountCode: 15.1 },
  { product: 'Skin Care Essentials Bundle', revenue: 198000, units: 165, priceReduction: 3.8, discountCode: 10.2 },
  { product: 'Consultation Only (Follow-up)', revenue: 105000, units: 210, priceReduction: 0, discountCode: 0 },
  { product: 'Sleep & Stress Support', revenue: 80000, units: 89, priceReduction: 1.5, discountCode: 7.8 },
];

export const revenueInsights = {
  ncRevenue: 1320000,
  rcRevenue: 933000,
  ncAOV: 1694,
  rcAOV: 2688,
  firstPurchasePct: 58.6,
  repeatPct: 41.4,
  monthly: [
    { month: 'Oct', nc: 980000, rc: 620000 },
    { month: 'Nov', nc: 1050000, rc: 710000 },
    { month: 'Dec', nc: 1180000, rc: 830000 },
    { month: 'Jan', nc: 1150000, rc: 850000 },
    { month: 'Feb', nc: 1250000, rc: 900000 },
    { month: 'Mar', nc: 1320000, rc: 933000 },
  ],
};

// ─── P&L ───
export const pnlData = {
  gmv: { value: 2850000, items: [
    { label: 'Price Reductions', value: -85500, pct: -3.0 },
    { label: 'Discount Codes', value: -256500, pct: -9.0 },
    { label: 'Shipping Revenue', value: 45000, pct: 1.6 },
  ]},
  grossRevenue: { value: 2553000, items: [
    { label: 'Gross Orders', value: 1240 },
    { label: 'AOV', value: 2059 },
    { label: 'Returns', value: -210000, pct: -8.2 },
    { label: 'Taxes', value: -90000, pct: -3.5 },
  ]},
  netRevenue: { value: 2253000, items: [
    { label: 'Net Orders', value: 1126 },
    { label: 'Net AOV', value: 2001 },
    { label: 'COGS', value: -675900, pct: -30.0 },
  ]},
  cm1: { value: 1577100, pct: 70.0, items: [
    { label: 'CM1%', value: 70.0 },
    { label: 'Logistics', value: -225300, pct: -10.0 },
    { label: 'Transaction Costs', value: -112650, pct: -5.0 },
  ]},
  cm2: { value: 1239150, pct: 55.0, items: [
    { label: 'CM2%', value: 55.0 },
    { label: 'Marketing Costs', value: -613000, pct: -27.2 },
  ]},
  cm3: { value: 626150, pct: 27.8, items: [
    { label: 'CM3%', value: 27.8 },
  ]},
  ebitda: { value: 476150, pct: 21.1 },
};

export const pnlTrend = [
  { month: 'Oct', netRevenue: 1600000, cm1: 1120000, cm2: 870000, cm3: 380000 },
  { month: 'Nov', netRevenue: 1760000, cm1: 1232000, cm2: 960000, cm3: 430000 },
  { month: 'Dec', netRevenue: 2010000, cm1: 1407000, cm2: 1085000, cm3: 510000 },
  { month: 'Jan', netRevenue: 2000000, cm1: 1400000, cm2: 1090000, cm3: 490000 },
  { month: 'Feb', netRevenue: 2150000, cm1: 1505000, cm2: 1170000, cm3: 560000 },
  { month: 'Mar', netRevenue: 2253000, cm1: 1577100, cm2: 1239150, cm3: 626150 },
];

// ─── Cash Flow ───
export const cashFlowDefaults = {
  aov: 2001,
  cpa: 787,
  grossMargin: 70,
  monthlyGrowth: 8,
  m1Spend: 350000,
  retentionModel: 'ecommerce' as const,
  untrackedLift: 15,
  cpaEscalation: 3,
};

export const cohortWaterfall = [
  { cohort: 'C1', m1: -180, m2: 45, m3: 38, m4: 32, m5: 28, m6: 25, m7: 22, m8: 19, m9: 17, m10: 15, m11: 13, m12: 12, breakEvenMonth: 5 },
  { cohort: 'C2', m1: -195, m2: 48, m3: 41, m4: 35, m5: 30, m6: 27, m7: 24, m8: 21, m9: 18, m10: 16, m11: 14, m12: 0, breakEvenMonth: 5 },
  { cohort: 'C3', m1: -210, m2: 52, m3: 44, m4: 37, m5: 32, m6: 29, m7: 25, m8: 22, m9: 19, m10: 17, m11: 0, m12: 0, breakEvenMonth: 5 },
  { cohort: 'C4', m1: -227, m2: 56, m3: 47, m4: 40, m5: 35, m6: 31, m7: 27, m8: 24, m9: 21, m10: 0, m11: 0, m12: 0, breakEvenMonth: 6 },
  { cohort: 'C5', m1: -245, m2: 61, m3: 51, m4: 43, m5: 38, m6: 33, m7: 29, m8: 26, m9: 0, m10: 0, m11: 0, m12: 0, breakEvenMonth: 6 },
  { cohort: 'C6', m1: -265, m2: 66, m3: 55, m4: 47, m5: 41, m6: 36, m7: 32, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0, breakEvenMonth: 6 },
  { cohort: 'C7', m1: -286, m2: 71, m3: 60, m4: 51, m5: 44, m6: 39, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0, breakEvenMonth: 6 },
  { cohort: 'C8', m1: -309, m2: 77, m3: 65, m4: 55, m5: 48, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0, breakEvenMonth: 7 },
  { cohort: 'C9', m1: -334, m2: 83, m3: 70, m4: 59, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0, breakEvenMonth: 7 },
  { cohort: 'C10', m1: -360, m2: 90, m3: 76, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0, breakEvenMonth: 7 },
  { cohort: 'C11', m1: -389, m2: 97, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0, breakEvenMonth: 8 },
  { cohort: 'C12', m1: -420, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0, breakEvenMonth: 8 },
];

export const monthlySummary = [
  { month: 'M1', newCust: 445, acqSpend: 350000, repeatOrders: 0, totalRevenue: 890445, grossProfit: 623312, netCash: 273312, cumulative: 273312, ltvCac: 1.42 },
  { month: 'M2', newCust: 480, acqSpend: 378000, repeatOrders: 142, totalRevenue: 1098240, grossProfit: 768768, netCash: 390768, cumulative: 664080, ltvCac: 1.58 },
  { month: 'M3', newCust: 519, acqSpend: 408240, repeatOrders: 298, totalRevenue: 1335420, grossProfit: 934794, netCash: 526554, cumulative: 1190634, ltvCac: 1.75 },
  { month: 'M4', newCust: 560, acqSpend: 440899, repeatOrders: 425, totalRevenue: 1582560, grossProfit: 1107792, netCash: 666893, cumulative: 1857527, ltvCac: 1.89 },
  { month: 'M5', newCust: 605, acqSpend: 476171, repeatOrders: 538, totalRevenue: 1847505, grossProfit: 1293254, netCash: 817083, cumulative: 2674610, ltvCac: 2.05 },
  { month: 'M6', newCust: 653, acqSpend: 514265, repeatOrders: 642, totalRevenue: 2131653, grossProfit: 1492157, netCash: 977892, cumulative: 3652502, ltvCac: 2.22 },
  { month: 'M7', newCust: 706, acqSpend: 555406, repeatOrders: 735, totalRevenue: 2430706, grossProfit: 1701494, netCash: 1146088, cumulative: 4798590, ltvCac: 2.38 },
  { month: 'M8', newCust: 762, acqSpend: 599838, repeatOrders: 822, totalRevenue: 2751762, grossProfit: 1926233, netCash: 1326395, cumulative: 6124985, ltvCac: 2.55 },
  { month: 'M9', newCust: 823, acqSpend: 647825, repeatOrders: 901, totalRevenue: 3088823, grossProfit: 2162176, netCash: 1514351, cumulative: 7639336, ltvCac: 2.70 },
  { month: 'M10', newCust: 889, acqSpend: 699651, repeatOrders: 978, totalRevenue: 3449889, grossProfit: 2414922, netCash: 1715271, cumulative: 9354607, ltvCac: 2.85 },
  { month: 'M11', newCust: 960, acqSpend: 755623, repeatOrders: 1052, totalRevenue: 3838960, grossProfit: 2687272, netCash: 1931649, cumulative: 11286256, ltvCac: 3.01 },
  { month: 'M12', newCust: 1037, acqSpend: 816073, repeatOrders: 1122, totalRevenue: 4254037, grossProfit: 2977826, netCash: 2161753, cumulative: 13448009, ltvCac: 3.15 },
];

export const sensitivityCards = [
  { label: 'CPA −₱100', metric: 'Break-Even', current: 'Month 6', adjusted: 'Month 4', impact: '+₱420K cumulative' },
  { label: 'AOV +₱200', metric: 'Year-End Cash', current: '₱13.4M', adjusted: '₱15.1M', impact: '+12.7% improvement' },
  { label: 'Retention +5pts', metric: 'LTV:CAC', current: '3.15x', adjusted: '3.68x', impact: '+16.8% improvement' },
  { label: 'Margin +5pts', metric: 'CM3%', current: '27.8%', adjusted: '32.8%', impact: '+₱1.8M annual' },
];

// ─── Attribution ───
export const attributionSurvey = [
  { source: 'Facebook/Instagram Ad', pct: 35 },
  { source: 'TikTok', pct: 22 },
  { source: 'Google Search', pct: 18 },
  { source: 'Friend/Family Referral', pct: 12 },
  { source: 'YouTube', pct: 7 },
  { source: 'Other', pct: 6 },
];

export const trackingHealth = [
  { 
    system: 'Meta Pixel', 
    status: 'healthy' as const, 
    events: '14,230/day', 
    matchRate: '9.2/10',
    eventBreakdown: [
      { event: 'PageView', count: '8,450', matchRate: '9.5/10' },
      { event: 'AddToCart', count: '3,210', matchRate: '9.1/10' },
      { event: 'InitiateCheckout', count: '1,820', matchRate: '8.9/10' },
      { event: 'Purchase', count: '750', matchRate: '9.4/10' }
    ]
  },
  { 
    system: 'Meta CAPI', 
    status: 'healthy' as const, 
    events: '13,850/day', 
    matchRate: '8.9/10',
    eventBreakdown: [
      { event: 'PageView', count: '8,100', matchRate: '9.2/10' },
      { event: 'AddToCart', count: '3,050', matchRate: '8.7/10' },
      { event: 'InitiateCheckout', count: '1,750', matchRate: '8.5/10' },
      { event: 'Purchase', count: '950', matchRate: '9.1/10' }
    ]
  },
  { 
    system: 'Google Ads Tag', 
    status: 'healthy' as const, 
    events: '8,920/day', 
    matchRate: '9.4/10',
    eventBreakdown: [
      { event: 'page_view', count: '5,200', matchRate: '9.6/10' },
      { event: 'add_to_cart', count: '1,870', matchRate: '9.3/10' },
      { event: 'begin_checkout', count: '1,120', matchRate: '9.2/10' },
      { event: 'purchase', count: '730', matchRate: '9.7/10' }
    ]
  },
  { 
    system: 'TikTok Pixel', 
    status: 'warning' as const, 
    events: '5,100/day', 
    matchRate: '7.1/10',
    eventBreakdown: [
      { event: 'ViewContent', count: '3,200', matchRate: '7.3/10' },
      { event: 'AddToCart', count: '1,250', matchRate: '6.8/10' },
      { event: 'InitiateCheckout', count: '520', matchRate: '6.9/10' },
      { event: 'CompletePayment', count: '130', matchRate: '7.5/10' }
    ]
  },
  { 
    system: 'GA4', 
    status: 'healthy' as const, 
    events: '22,400/day', 
    matchRate: 'N/A',
    eventBreakdown: [
      { event: 'page_view', count: '15,400', matchRate: 'N/A' },
      { event: 'add_to_cart', count: '3,800', matchRate: 'N/A' },
      { event: 'begin_checkout', count: '2,200', matchRate: 'N/A' },
      { event: 'purchase', count: '1,000', matchRate: 'N/A' }
    ]
  },
  { 
    system: 'Server-side GTM', 
    status: 'error' as const, 
    events: '0/day', 
    matchRate: '0/10',
    eventBreakdown: [
      { event: 'page_view', count: '0', matchRate: '0/10' },
      { event: 'add_to_cart', count: '0', matchRate: '0/10' },
      { event: 'begin_checkout', count: '0', matchRate: '0/10' },
      { event: 'purchase', count: '0', matchRate: '0/10' }
    ]
  },
];

export const adScatterData = [
  { name: 'GLP-1 Testimonial V3', spend: 45000, cpa: 650, platform: 'Meta' },
  { name: 'Hair Before/After', spend: 38000, cpa: 580, platform: 'Meta' },
  { name: 'Doc Consultation UGC', spend: 32000, cpa: 720, platform: 'Meta' },
  { name: 'Weight Loss Journey', spend: 28000, cpa: 690, platform: 'TikTok' },
  { name: 'Generic Brand Search', spend: 52000, cpa: 420, platform: 'Google' },
  { name: 'Competitor KW Pack', spend: 35000, cpa: 890, platform: 'Google' },
  { name: 'Hair Regrowth Demo', spend: 22000, cpa: 610, platform: 'TikTok' },
  { name: 'Mens Health Awareness', spend: 18000, cpa: 950, platform: 'Meta' },
  { name: 'Semaglutide Explainer', spend: 41000, cpa: 670, platform: 'Meta' },
  { name: 'Promo Code Push', spend: 15000, cpa: 520, platform: 'Meta' },
];

// ─── Creative & MTA ───
export const creativePerformance = [
  { name: 'GLP-1 Testimonial V3', platform: 'Meta', spend: 45200, impressions: 892000, clicks: 12480, ctr: 1.40, cpc: 3.62, conversions: 69, cpa: 655, roas: 3.05, status: 'Active', campaign: 'scale' },
  { name: 'Hair Before/After Carousel', platform: 'Meta', spend: 38100, impressions: 756000, clicks: 10584, ctr: 1.40, cpc: 3.60, conversions: 66, cpa: 577, roas: 3.47, status: 'Active', campaign: 'scale' },
  { name: 'Doc Consultation UGC', platform: 'Meta', spend: 32400, impressions: 645000, clicks: 8385, ctr: 1.30, cpc: 3.86, conversions: 45, cpa: 720, roas: 2.78, status: 'Active', campaign: 'test' },
  { name: 'Weight Loss Journey TikTok', platform: 'TikTok', spend: 28300, impressions: 1250000, clicks: 18750, ctr: 1.50, cpc: 1.51, conversions: 41, cpa: 690, roas: 2.90, status: 'Active', campaign: 'scale' },
  { name: 'Brand Search Exact', platform: 'Google', spend: 52100, impressions: 125000, clicks: 31250, ctr: 25.0, cpc: 1.67, conversions: 124, cpa: 420, roas: 4.76, status: 'Active', campaign: 'scale' },
  { name: 'Competitor Keywords', platform: 'Google', spend: 35200, impressions: 98000, clicks: 5880, ctr: 6.0, cpc: 5.99, conversions: 40, cpa: 880, roas: 2.27, status: 'Under Review', campaign: 'kill' },
  { name: 'Hair Regrowth Demo', platform: 'TikTok', spend: 22100, impressions: 980000, clicks: 14700, ctr: 1.50, cpc: 1.50, conversions: 36, cpa: 614, roas: 3.26, status: 'Active', campaign: 'test' },
  { name: 'Semaglutide Explainer', platform: 'Meta', spend: 41500, impressions: 820000, clicks: 10660, ctr: 1.30, cpc: 3.89, conversions: 62, cpa: 669, roas: 2.99, status: 'Active', campaign: 'learn' },
];

// ─── Account Control Scatter Data ───
export const accountControlData = [
  // Scaling zone (high spend, low CPA) - green
  { name: 'Hair Before/After Carousel', spend: 38100, cpa: 577, platform: 'Meta', zone: 'scaling', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=456' },
  { name: 'Brand Search Exact', spend: 52100, cpa: 420, platform: 'Google', zone: 'scaling', previewUrl: 'https://ads.google.com/nav/ads?subid=gb-en-ha-aw-bk-c-bau&adsid=123' },
  { name: 'GLP-1 Testimonial V3', spend: 45200, cpa: 655, platform: 'Meta', zone: 'scaling', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=457' },
  { name: 'Semaglutide Explainer', spend: 41500, cpa: 669, platform: 'Meta', zone: 'scaling', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=458' },
  { name: 'Hair Regrowth Demo', spend: 22100, cpa: 614, platform: 'TikTok', zone: 'scaling', previewUrl: 'https://ads.tiktok.com/i18n/ads_manager/ads_edit?auid=789' /* just above threshold but good CPA */ },
  { name: 'Weight Loss Journey', spend: 28300, cpa: 690, platform: 'TikTok', zone: 'scaling', previewUrl: 'https://ads.tiktok.com/i18n/ads_manager/ads_edit?auid=790' },
  // Zombies (high spend, high CPA) - red
  { name: 'Competitor Keywords', spend: 35200, cpa: 880, platform: 'Google', zone: 'zombie', previewUrl: 'https://ads.google.com/nav/ads?subid=gb-en-ha-aw-bk-c-bau&adsid=124' },
  { name: 'Generic Awareness V2', spend: 31500, cpa: 1120, platform: 'Meta', zone: 'zombie', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=459' },
  { name: 'Broad Match Hair', spend: 28800, cpa: 950, platform: 'Google', zone: 'zombie', previewUrl: 'https://ads.google.com/nav/ads?subid=gb-en-ha-aw-bk-c-bau&adsid=125' },
  // Testing zone (low spend, mixed CPA) - blue
  { name: 'New Hook Test A', spend: 5200, cpa: 520, platform: 'Meta', zone: 'testing', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=460' },
  { name: 'New Hook Test B', spend: 4800, cpa: 780, platform: 'Meta', zone: 'testing', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=461' },
  { name: 'Skincare UGC Draft', spend: 3100, cpa: 650, platform: 'TikTok', zone: 'testing', previewUrl: 'https://ads.tiktok.com/i18n/ads_manager/ads_edit?auid=791' },
  { name: 'Doc Authority V2', spend: 7500, cpa: 710, platform: 'Meta', zone: 'testing', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=462' },
  { name: 'Reddit Test 1', spend: 2200, cpa: 920, platform: 'Reddit', zone: 'testing', previewUrl: 'https://ads.reddit.com/ad/123456/preview' },
  { name: 'GLP-1 New Angle', spend: 6800, cpa: 590, platform: 'Meta', zone: 'testing', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=463' },
  { name: 'TikTok Trend Hook', spend: 4500, cpa: 480, platform: 'TikTok', zone: 'testing', previewUrl: 'https://ads.tiktok.com/i18n/ads_manager/ads_edit?auid=792' },
  // Untapped winners (low spend, low CPA) - gold
  { name: 'Sleep Aid Testimonial', spend: 3800, cpa: 410, platform: 'Meta', zone: 'untapped', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=464' },
  { name: 'Quick Results Static', spend: 2900, cpa: 390, platform: 'Meta', zone: 'untapped', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=465' },
  { name: 'Before/After Static', spend: 5100, cpa: 450, platform: 'Meta', zone: 'untapped', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=466' },
  // High CPA testing - still learning
  { name: 'Reddit Awareness', spend: 1800, cpa: 1350, platform: 'Reddit', zone: 'testing', previewUrl: 'https://ads.reddit.com/ad/123457/preview' },
  { name: 'YouTube Pre-roll', spend: 8200, cpa: 1050, platform: 'Google', zone: 'testing', previewUrl: 'https://ads.google.com/nav/ads?subid=gb-en-ha-aw-bk-c-bau&adsid=126' },
  { name: 'Podcast Style Ad', spend: 2500, cpa: 1100, platform: 'Meta', zone: 'testing', previewUrl: 'https://adsmanager.facebook.com/ads_manager/preview?act=123&id=467' },
];

// ─── Ad Churn / Retesting Control (Stacked by creative age) ───
export const adChurnData = [
  { month: 'Oct', d7: 18500, d14: 12200, d30: 22800, d90: 28500, d180: 15200, dOld: 8800 },
  { month: 'Nov', d7: 22100, d14: 14800, d30: 19500, d90: 31200, d180: 12800, dOld: 11600 },
  { month: 'Dec', d7: 19800, d14: 16200, d30: 24100, d90: 26800, d180: 18500, dOld: 9600 },
  { month: 'Jan', d7: 25200, d14: 18500, d30: 21200, d90: 24500, d180: 14200, dOld: 12400 },
  { month: 'Feb', d7: 28800, d14: 15800, d30: 26500, d90: 22100, d180: 16800, dOld: 8000 },
  { month: 'Mar', d7: 31200, d14: 19200, d30: 23800, d90: 25500, d180: 11200, dOld: 7100 },
];

// ─── Creative Churn by Cohort (Stacked Area) ───
export const creativeChurnCohorts = [
  { week: 'W1 Oct', oct: 42000, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0 },
  { week: 'W2 Oct', oct: 48000, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0 },
  { week: 'W3 Oct', oct: 52000, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0 },
  { week: 'W4 Oct', oct: 55000, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0 },
  { week: 'W1 Nov', oct: 48000, nov: 18000, dec: 0, jan: 0, feb: 0, mar: 0 },
  { week: 'W2 Nov', oct: 42000, nov: 28000, dec: 0, jan: 0, feb: 0, mar: 0 },
  { week: 'W3 Nov', oct: 38000, nov: 35000, dec: 0, jan: 0, feb: 0, mar: 0 },
  { week: 'W4 Nov', oct: 32000, nov: 41000, dec: 0, jan: 0, feb: 0, mar: 0 },
  { week: 'W1 Dec', oct: 25000, nov: 38000, dec: 15000, jan: 0, feb: 0, mar: 0 },
  { week: 'W2 Dec', oct: 20000, nov: 32000, dec: 28000, jan: 0, feb: 0, mar: 0 },
  { week: 'W3 Dec', oct: 15000, nov: 25000, dec: 38000, jan: 0, feb: 0, mar: 0 },
  { week: 'W4 Dec', oct: 10000, nov: 18000, dec: 45000, jan: 0, feb: 0, mar: 0 },
  { week: 'W1 Jan', oct: 6000, nov: 12000, dec: 40000, jan: 16000, feb: 0, mar: 0 },
  { week: 'W2 Jan', oct: 3000, nov: 8000, dec: 35000, jan: 28000, feb: 0, mar: 0 },
  { week: 'W3 Jan', oct: 1000, nov: 5000, dec: 28000, jan: 38000, feb: 0, mar: 0 },
  { week: 'W4 Jan', oct: 0, nov: 3000, dec: 22000, jan: 45000, feb: 0, mar: 0 },
  { week: 'W1 Feb', oct: 0, nov: 1000, dec: 15000, jan: 40000, feb: 18000, mar: 0 },
  { week: 'W2 Feb', oct: 0, nov: 0, dec: 10000, jan: 35000, feb: 30000, mar: 0 },
  { week: 'W3 Feb', oct: 0, nov: 0, dec: 6000, jan: 28000, feb: 42000, mar: 0 },
  { week: 'W4 Feb', oct: 0, nov: 0, dec: 3000, jan: 22000, feb: 48000, mar: 0 },
  { week: 'W1 Mar', oct: 0, nov: 0, dec: 1000, jan: 15000, feb: 42000, mar: 20000 },
  { week: 'W2 Mar', oct: 0, nov: 0, dec: 0, jan: 10000, feb: 38000, mar: 32000 },
  { week: 'W3 Mar', oct: 0, nov: 0, dec: 0, jan: 6000, feb: 30000, mar: 45000 },
  { week: 'W4 Mar', oct: 0, nov: 0, dec: 0, jan: 3000, feb: 25000, mar: 52000 },
];

// ─── Production & Slugging Rate ───
export const productionSlugging = [
  { month: 'Oct', launched: 12, hits: 3, hitRate: 25.0 },
  { month: 'Nov', launched: 18, hits: 5, hitRate: 27.8 },
  { month: 'Dec', launched: 15, hits: 4, hitRate: 26.7 },
  { month: 'Jan', launched: 22, hits: 7, hitRate: 31.8 },
  { month: 'Feb', launched: 25, hits: 6, hitRate: 24.0 },
  { month: 'Mar', launched: 20, hits: 8, hitRate: 40.0 },
];

// ─── Demographics / Gender+Age Analysis ───
export const demographicsAge = [
  { group: '18-24', spend: 42000, conversions: 58, cpa: 724, roas: 2.45, pctSpend: 9.1 },
  { group: '25-34', spend: 152000, conversions: 248, cpa: 613, roas: 3.52, pctSpend: 33.0 },
  { group: '35-44', spend: 128000, conversions: 195, cpa: 656, roas: 3.28, pctSpend: 27.8 },
  { group: '45-54', spend: 85000, conversions: 110, cpa: 773, roas: 2.89, pctSpend: 18.5 },
  { group: '55-64', spend: 38000, conversions: 42, cpa: 905, roas: 2.12, pctSpend: 8.3 },
  { group: '65+', spend: 15000, conversions: 12, cpa: 1250, roas: 1.45, pctSpend: 3.3 },
];

export const demographicsGender = [
  { gender: 'Female', spend: 275000, conversions: 412, cpa: 668, roas: 3.35, pctConversions: 61.9 },
  { gender: 'Male', spend: 168000, conversions: 235, cpa: 715, roas: 2.98, pctConversions: 35.3 },
  { gender: 'Other', spend: 17000, conversions: 18, cpa: 944, roas: 2.15, pctConversions: 2.7 },
];

export const demographicsGenderAge = [
  { week: 'W1 Feb', 'F 18-24': 3200, 'F 25-34': 12500, 'F 35-44': 10800, 'F 45-54': 7200, 'F 55+': 3800, 'M 18-24': 2100, 'M 25-34': 8500, 'M 35-44': 6200, 'M 45-54': 4100, 'M 55+': 2600 },
  { week: 'W2 Feb', 'F 18-24': 3400, 'F 25-34': 13200, 'F 35-44': 11200, 'F 45-54': 7500, 'F 55+': 3600, 'M 18-24': 2300, 'M 25-34': 8800, 'M 35-44': 6500, 'M 45-54': 4300, 'M 55+': 2500 },
  { week: 'W3 Feb', 'F 18-24': 3100, 'F 25-34': 13800, 'F 35-44': 11500, 'F 45-54': 7800, 'F 55+': 3400, 'M 18-24': 2000, 'M 25-34': 9200, 'M 35-44': 6800, 'M 45-54': 4500, 'M 55+': 2400 },
  { week: 'W4 Feb', 'F 18-24': 3500, 'F 25-34': 14200, 'F 35-44': 12000, 'F 45-54': 8000, 'F 55+': 3500, 'M 18-24': 2400, 'M 25-34': 9500, 'M 35-44': 7000, 'M 45-54': 4600, 'M 55+': 2300 },
  { week: 'W1 Mar', 'F 18-24': 3300, 'F 25-34': 14800, 'F 35-44': 12500, 'F 45-54': 8200, 'F 55+': 3200, 'M 18-24': 2200, 'M 25-34': 9800, 'M 35-44': 7200, 'M 45-54': 4800, 'M 55+': 2200 },
  { week: 'W2 Mar', 'F 18-24': 3600, 'F 25-34': 15200, 'F 35-44': 12800, 'F 45-54': 8500, 'F 55+': 3100, 'M 18-24': 2500, 'M 25-34': 10200, 'M 35-44': 7500, 'M 45-54': 5000, 'M 55+': 2100 },
];

export const cohortAISuggestions = [
  'Scale Meta spend +15%: Oct to Dec cohorts show consistently improving M1 retention (28.5% to 32.8%), suggesting recent targeting improvements are working.',
  'Maintain Google Brand: Lowest CAC channel with best LTV. Max out impression share before expanding elsewhere.',
  'Cap TikTok at current levels: March cohort has lowest first-order AOV (₱1,850 isn\'t bad but TikTok LTV:CAC needs monitoring before scaling).',
  'Jan 2026 cohort dipped: M1 retention dropped to 29.8% from Dec\'s 32.8%. Could be post-holiday buyer quality or seasonal effects. Monitor closely.',
  'GLP-1 is the retention engine: 51.8% 90-day repeat rate and 3.1 avg orders. Its recurring nature makes it the ideal subscription candidate.',
  'First-order AOV trending up: ₱1,580 (Sep) to ₱1,850 (Mar) = +17% improvement. Better targeting or product mix shift toward GLP-1.',
  'Launch subscription for GLP-1 (highest repeat rate product) and send targeted re-engagement to Nov cohort (highest 30d repeat potential).',
];

export const attributionAISuggestions = [
  'Overall attribution stack is functioning but incomplete. MER is healthy (3.67x), but flying partially blind with server-side GTM down and no MMM model.',
  'Meta drives lion\'s share of tracked conversions but survey data suggests TikTok is under-credited by platform reporting. Run geo-lift test to validate.',
  'nMER of 1.92x means heavy reliance on repeat purchases. Fine if retention holds, but risky if cohort quality drops.',
  'Brand Search is most efficient channel at ₱420 CPA. Ensure maxing out impression share before increasing spend elsewhere.',
  'Fix server-side GTM before major budget reallocation. Missing ~15% of conversion data, which skews all analysis.',
  'Consider building simple MMM model using past 6 months of spend + revenue data for second opinion on channel allocation beyond surveys.',
  'Set channel-specific CPA ceilings: Meta ₱850, Google ₱500, TikTok ₱600. Review weekly and pause anything consistently above ceiling.',
];

export const creativeAISuggestions = [
  'Hair Before/After Carousel has the best ROAS at 3.47x with a low CPA of ₱577. Scale spend by 30% this week.',
  'Competitor Keywords campaign has ₱880 CPA, well above the ₱787 target. Pause low-performing ad groups and reallocate to Brand Search.',
  '"Doc Consultation UGC" CTR dropped from 1.8% to 1.3% over 2 weeks. Creative fatigue likely, queue replacement creative.',
  'TikTok CPCs are 60% lower than Meta (₱1.50 vs ₱3.75). Test moving top Meta concepts to TikTok format for cheaper reach.',
  'Top 3 creatives drive 48% of total conversions (Pareto effect). Diversify creative pipeline to reduce concentration risk.',
];

// ─── Cohort Analysis ───
export const cohortRetention = [
  { cohort: 'Sep 2025', customers: 380, cac: 820, firstOrder: 1580, periods: [100, 28.5, 22.1, 18.4, 15.8, 13.2, 11.5] },
  { cohort: 'Oct 2025', customers: 420, cac: 795, firstOrder: 1620, periods: [100, 30.2, 23.8, 19.5, 16.8, 14.1, 0] },
  { cohort: 'Nov 2025', customers: 465, cac: 780, firstOrder: 1685, periods: [100, 31.5, 24.7, 20.2, 17.1, 0, 0] },
  { cohort: 'Dec 2025', customers: 510, cac: 770, firstOrder: 1710, periods: [100, 32.8, 25.9, 21.0, 0, 0, 0] },
  { cohort: 'Jan 2026', customers: 545, cac: 800, firstOrder: 1750, periods: [100, 29.8, 23.5, 0, 0, 0, 0] },
  { cohort: 'Feb 2026', customers: 590, cac: 790, firstOrder: 1820, periods: [100, 31.2, 0, 0, 0, 0, 0] },
  { cohort: 'Mar 2026', customers: 635, cac: 787, firstOrder: 1850, periods: [100, 0, 0, 0, 0, 0, 0] },
];

export const clvExtension = [
  { product: 'GLP-1 Weight Loss', firstOrder: 2999, clr90: 4850, clr365: 9200, beyond365: 2100 },
  { product: 'Hair Regrowth Kit', firstOrder: 1499, clr90: 2450, clr365: 5800, beyond365: 1800 },
  { product: "Men's Health Pack", firstOrder: 1799, clr90: 2800, clr365: 5200, beyond365: 1200 },
  { product: 'Skin Care Bundle', firstOrder: 1299, clr90: 1950, clr365: 3800, beyond365: 900 },
  { product: 'Sleep & Stress', firstOrder: 999, clr90: 1500, clr365: 2800, beyond365: 600 },
];

export const productComparison = [
  { product: 'GLP-1 Weight Loss', customers: 1850, daysSinceFirst: 185, lag2nd: 32, lag3rd: 68, lag4th: 110, avgOrders: 3.1, r30: 28.5, r60: 42.1, r90: 51.8, r180: 62.3, r365: 71.2 },
  { product: 'Hair Regrowth Kit', customers: 2340, daysSinceFirst: 210, lag2nd: 45, lag3rd: 95, lag4th: 150, avgOrders: 2.8, r30: 22.1, r60: 35.8, r90: 45.2, r180: 55.8, r365: 64.5 },
  { product: "Men's Health Pack", customers: 1420, daysSinceFirst: 175, lag2nd: 38, lag3rd: 82, lag4th: 130, avgOrders: 2.5, r30: 20.5, r60: 33.2, r90: 42.8, r180: 52.1, r365: 60.8 },
  { product: 'Skin Care Bundle', customers: 980, daysSinceFirst: 160, lag2nd: 52, lag3rd: 110, lag4th: 170, avgOrders: 2.2, r30: 18.2, r60: 28.5, r90: 36.4, r180: 45.2, r365: 53.1 },
  { product: 'Sleep & Stress', customers: 520, daysSinceFirst: 120, lag2nd: 58, lag3rd: 120, lag4th: 185, avgOrders: 1.9, r30: 15.8, r60: 24.2, r90: 31.5, r180: 39.8, r365: 46.2 },
];

// ─── Targets & Goals ───
export const targets = [
  { metric: 'Net Revenue', target: 2500000, actual: 2253000, unit: '₱' },
  { metric: 'MER', target: 4.0, actual: 3.67, unit: 'x' },
  { metric: 'aMER', target: 4.5, actual: 4.22, unit: 'x' },
  { metric: 'nMER', target: 2.2, actual: 1.92, unit: 'x' },
  { metric: 'New Customers', target: 850, actual: 779, unit: '#' },
  { metric: 'CAC', target: 500, actual: 544, unit: '₱', inverse: true },
  { metric: 'nCAC', target: 750, actual: 787, unit: '₱', inverse: true },
  { metric: 'CM3', target: 700000, actual: 626150, unit: '₱' },
  { metric: 'CM3%', target: 30, actual: 27.8, unit: '%' },
  { metric: 'Repeat Rate (30d)', target: 30, actual: 28.5, unit: '%' },
  { metric: 'Net Orders', target: 1200, actual: 1126, unit: '#' },
  { metric: 'AOV', target: 2100, actual: 2001, unit: '₱' },
];

export const targetTrend = [
  { month: 'Oct', revenue: 1600000, target: 1800000, cm3: 380000, cm3Target: 450000 },
  { month: 'Nov', revenue: 1760000, target: 1900000, cm3: 430000, cm3Target: 480000 },
  { month: 'Dec', revenue: 2010000, target: 2100000, cm3: 510000, cm3Target: 550000 },
  { month: 'Jan', revenue: 2000000, target: 2200000, cm3: 490000, cm3Target: 600000 },
  { month: 'Feb', revenue: 2150000, target: 2350000, cm3: 560000, cm3Target: 650000 },
  { month: 'Mar', revenue: 2253000, target: 2500000, cm3: 626150, cm3Target: 700000 },
];

export const targetAISuggestions = [
  'Revenue is at 90.1% of target with 2 weeks remaining. Need ₱247K more, achievable if you maintain current daily run rate of ₱322K.',
  'nCAC at ₱787 is 5% above the ₱750 target. TikTok CPA is dragging the average up. Tighten TikTok bid caps or shift budget to Meta.',
  'CM3% at 27.8% vs 30% target. The gap is primarily driven by high discount code usage (9%). Consider reducing promo frequency.',
  'New Customer acquisition pace suggests 850 target is reachable if you increase spend by 8% in the final 2 weeks.',
  'Repeat Rate (28.5% vs 30%) is close. Send a targeted re-engagement email to November cohort since they have the highest 30d repeat potential.',
];
