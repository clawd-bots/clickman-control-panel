export interface FinalItem {
  id: string;
  title: string;
  description: string;
  owner: 'jordan' | 'alfred' | 'both';
  status: 'pending' | 'in-progress' | 'done';
  category: 'data' | 'integration' | 'config' | 'access';
}

export const finalItems: FinalItem[] = [
  // Data connections
  {
    id: 'fi-1',
    title: 'Connect BigQuery to Dashboard',
    description: 'Replace sample data with live BigQuery queries for revenue, orders, and customer metrics.',
    owner: 'both',
    status: 'pending',
    category: 'data',
  },
  {
    id: 'fi-2',
    title: 'Triple Whale API Integration',
    description: 'Pull attribution data, MER, nCAC, and channel-level metrics from Triple Whale into dashboard and attribution tree.',
    owner: 'alfred',
    status: 'pending',
    category: 'integration',
  },
  {
    id: 'fi-3',
    title: 'Company Actual P&L Sheet',
    description: 'Jordan to provide the actual P&L spreadsheet (not just the first-time customer P&L). Needed for Profit & Loss page.',
    owner: 'jordan',
    status: 'pending',
    category: 'data',
  },
  {
    id: 'fi-4',
    title: 'Meta Ads API Connection',
    description: 'Connect Meta Ads data for creative analysis, MTA segmentation, and attribution. Replace sample creative data.',
    owner: 'alfred',
    status: 'pending',
    category: 'integration',
  },
  {
    id: 'fi-5',
    title: 'Google Ads API Connection',
    description: 'Connect Google Ads for spend, CPC, CTR, and conversion data across creative and attribution pages.',
    owner: 'alfred',
    status: 'pending',
    category: 'integration',
  },
  {
    id: 'fi-6',
    title: 'TikTok Ads API Connection',
    description: 'Connect TikTok Ads data for creative analysis and attribution tree.',
    owner: 'alfred',
    status: 'pending',
    category: 'integration',
  },
  {
    id: 'fi-7',
    title: 'Reddit Ads API Connection',
    description: 'Connect Reddit Ads data for creative analysis panel.',
    owner: 'alfred',
    status: 'pending',
    category: 'integration',
  },
  {
    id: 'fi-8',
    title: 'Post-Purchase Survey Data',
    description: 'Integrate post-purchase survey responses from Triple Whale for attribution tree (channel allocation layer).',
    owner: 'alfred',
    status: 'pending',
    category: 'integration',
  },
  {
    id: 'fi-9',
    title: 'Google Sheets P&L Sync',
    description: 'Connect the First Time Customer P&L sheet for cashflow projections and cohort analysis.',
    owner: 'alfred',
    status: 'pending',
    category: 'data',
  },
  {
    id: 'fi-10',
    title: 'Creative Analysis Sheet Migration',
    description: 'Migrate existing Dataslayer creative analysis from Google Sheets into the Creative & MTA page.',
    owner: 'alfred',
    status: 'pending',
    category: 'data',
  },
  // Config & access
  {
    id: 'fi-11',
    title: 'Deploy to Vercel',
    description: 'Set up Vercel project, configure environment variables, and deploy for production access.',
    owner: 'both',
    status: 'pending',
    category: 'config',
  },
  {
    id: 'fi-12',
    title: 'Set Real Monthly Targets',
    description: 'Jordan to input actual monthly targets (MER, aMER, revenue, CM3, nCAC, etc.) to replace placeholder values.',
    owner: 'jordan',
    status: 'pending',
    category: 'config',
  },
  {
    id: 'fi-13',
    title: 'GA4 Integration',
    description: 'Connect GA4 for session data, traffic sources, and supporting attribution infrastructure.',
    owner: 'alfred',
    status: 'pending',
    category: 'integration',
  },
  {
    id: 'fi-14',
    title: 'Email & SMS Channel Data',
    description: 'Connect email and SMS platform data for attribution tree ad-level optimization layer.',
    owner: 'both',
    status: 'pending',
    category: 'integration',
  },
  {
    id: 'fi-15',
    title: 'Geo-Lift / Holdout Test Framework',
    description: 'Build placeholder infrastructure for geo-lift testing by Philippine island and holdout tests.',
    owner: 'alfred',
    status: 'pending',
    category: 'config',
  },
];

export function getAllDone(items: FinalItem[]): boolean {
  return items.every(item => item.status === 'done');
}

export function getPendingCount(items: FinalItem[]): number {
  return items.filter(item => item.status !== 'done').length;
}

export function getByOwner(items: FinalItem[], owner: FinalItem['owner']): FinalItem[] {
  return items.filter(item => item.owner === owner && item.status !== 'done');
}
