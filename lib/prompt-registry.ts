export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  lastModified: string;
}

// Centralized prompt registry with all Intelligence sections
export const promptRegistry: Record<string, PromptTemplate> = {
  'target-intelligence': {
    id: 'target-intelligence',
    name: 'Target Intelligence Analysis',
    description: 'Analyzes target performance and provides strategic recommendations',
    prompt: 'Based on 30-day trend: Current revenue run rate suggests targeting adjustments. Historical seasonality shows Q4 typically sees 15-20% lift. 90-day moving average shows nCAC improving 8% MoM. Set progressive reduction targets. 365-day cohort data indicates seasonal performance patterns. Year-over-year comparison shows growth opportunities.',
    category: 'Targets & Goals',
    lastModified: new Date().toISOString().split('T')[0]
  },
  'dashboard-intelligence': {
    id: 'dashboard-intelligence', 
    name: 'Dashboard Intelligence Analysis',
    description: 'Comprehensive dashboard performance analysis',
    prompt: 'Analyze current dashboard KPIs focusing on: 1) Revenue trends and growth patterns, 2) Marketing efficiency metrics (MER, aMER), 3) Customer acquisition costs and trends, 4) Order volume and new customer patterns, 5) Key performance indicators requiring immediate attention.',
    category: 'Dashboard',
    lastModified: new Date().toISOString().split('T')[0]
  },
  'attribution-intelligence': {
    id: 'attribution-intelligence',
    name: 'Attribution Intelligence Analysis', 
    description: 'Multi-touch attribution and channel performance analysis',
    prompt: 'Evaluate attribution model performance by analyzing: 1) Channel interaction effects and assist rates, 2) Multi-touch conversion paths and credit distribution, 3) Attribution model comparison (first-click vs last-click vs linear), 4) Budget allocation optimization based on attribution insights, 5) True incrementality assessment across touchpoints.',
    category: 'Attribution',
    lastModified: new Date().toISOString().split('T')[0]
  },
  'creative-intelligence': {
    id: 'creative-intelligence',
    name: 'Creative Intelligence Analysis',
    description: 'Ad creative performance and optimization analysis',
    prompt: 'Analyze creative performance data focusing on: 1) Scaling creative identification (high spend, low CPA), 2) Creative fatigue indicators and refresh recommendations, 3) Platform-specific creative insights (Meta vs TikTok vs Google), 4) Budget reallocation from underperformers to winners, 5) Creative testing velocity and hit rate analysis.',
    category: 'Creative Analysis',
    lastModified: new Date().toISOString().split('T')[0]
  },
  'cohorts-intelligence': {
    id: 'cohorts-intelligence',
    name: 'Cohorts Intelligence Analysis',
    description: 'Customer cohort behavior and LTV analysis',
    prompt: 'Examine cohort performance patterns by analyzing: 1) Customer lifetime value trends by acquisition cohort, 2) Retention rates and churn patterns over time, 3) Revenue per cohort and monetization effectiveness, 4) Acquisition channel quality by cohort performance, 5) Seasonal cohort behavior and optimization opportunities.',
    category: 'Cohort Analysis',
    lastModified: new Date().toISOString().split('T')[0]
  },
  'pnl-intelligence': {
    id: 'pnl-intelligence',
    name: 'P&L Intelligence Analysis',
    description: 'Profit and loss statement analysis and insights',
    prompt: 'Analyze P&L performance focusing on: 1) Revenue streams and profitability trends, 2) Cost structure optimization opportunities, 3) Margin analysis and improvement potential, 4) Operating expense efficiency, 5) Bottom-line performance and financial health indicators.',
    category: 'Financial Analysis',
    lastModified: new Date().toISOString().split('T')[0]
  },
  'cashflow-intelligence': {
    id: 'cashflow-intelligence',
    name: 'Cashflow Intelligence Analysis',
    description: 'Cash flow patterns and liquidity analysis',
    prompt: 'Evaluate cash flow dynamics by examining: 1) Inflow and outflow patterns and timing, 2) Working capital requirements and optimization, 3) Seasonal cash flow variations, 4) Liquidity position and runway analysis, 5) Cash conversion cycle efficiency and improvement opportunities.',
    category: 'Financial Analysis', 
    lastModified: new Date().toISOString().split('T')[0]
  },
  'market-intelligence': {
    id: 'market-intelligence',
    name: 'Market Intelligence Analysis',
    description: 'Market trends and competitive landscape analysis',
    prompt: 'Assess market dynamics through: 1) Competitive positioning and market share trends, 2) Consumer behavior shifts and opportunities, 3) Market saturation indicators and expansion potential, 4) Pricing strategy effectiveness vs competition, 5) Emerging market trends and strategic implications.',
    category: 'Market Analysis',
    lastModified: new Date().toISOString().split('T')[0]
  },
  'performance-intelligence': {
    id: 'performance-intelligence', 
    name: 'Performance Intelligence Analysis',
    description: 'Overall business performance and KPI analysis',
    prompt: 'Analyze comprehensive performance metrics: 1) Key performance indicators trending and benchmarking, 2) Goal achievement vs targets across all metrics, 3) Performance correlation analysis between different KPIs, 4) Bottleneck identification and optimization priorities, 5) Performance forecasting and strategic recommendations.',
    category: 'Performance Analysis',
    lastModified: new Date().toISOString().split('T')[0]
  },
  'channel-intelligence': {
    id: 'channel-intelligence',
    name: 'Channel Intelligence Analysis',
    description: 'Marketing channel performance and optimization',
    prompt: 'Evaluate channel performance through: 1) Channel-specific ROI and efficiency metrics, 2) Cross-channel attribution and interaction effects, 3) Budget allocation optimization across channels, 4) Channel saturation indicators and scaling opportunities, 5) New channel testing and expansion recommendations.',
    category: 'Channel Analysis',
    lastModified: new Date().toISOString().split('T')[0]
  },
  'customer-intelligence': {
    id: 'customer-intelligence',
    name: 'Customer Intelligence Analysis', 
    description: 'Customer behavior and segmentation analysis',
    prompt: 'Analyze customer insights focusing on: 1) Customer segmentation and behavior patterns, 2) Purchase journey analysis and optimization points, 3) Customer lifetime value drivers and enhancement opportunities, 4) Retention strategy effectiveness and improvement areas, 5) Customer satisfaction indicators and experience optimization.',
    category: 'Customer Analysis',
    lastModified: new Date().toISOString().split('T')[0]
  },
  'operations-intelligence': {
    id: 'operations-intelligence',
    name: 'Operations Intelligence Analysis',
    description: 'Operational efficiency and process optimization',
    prompt: 'Examine operational performance through: 1) Process efficiency metrics and bottleneck identification, 2) Resource utilization and optimization opportunities, 3) Quality metrics and improvement initiatives, 4) Scalability assessment and infrastructure needs, 5) Automation opportunities and cost reduction potential.',
    category: 'Operations Analysis', 
    lastModified: new Date().toISOString().split('T')[0]
  }
};

// Helper functions for prompt management
export const getPromptById = (id: string): PromptTemplate | undefined => {
  return promptRegistry[id];
};

export const updatePrompt = (id: string, updates: Partial<PromptTemplate>): void => {
  if (promptRegistry[id]) {
    promptRegistry[id] = {
      ...promptRegistry[id],
      ...updates,
      lastModified: new Date().toISOString().split('T')[0]
    };
  }
};

export const getAllPrompts = (): PromptTemplate[] => {
  return Object.values(promptRegistry);
};

export const getPromptsByCategory = (category: string): PromptTemplate[] => {
  return Object.values(promptRegistry).filter(prompt => prompt.category === category);
};

// Two-way sync: when prompt is updated in templates OR intelligence sections
export const syncPromptChanges = (id: string, newPrompt: string): void => {
  updatePrompt(id, { prompt: newPrompt });
  
  // Trigger update in any Intelligence sections that use this prompt
  // This would need to be implemented per section that uses prompts
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('promptUpdated', { 
      detail: { id, prompt: newPrompt } 
    }));
  }
};