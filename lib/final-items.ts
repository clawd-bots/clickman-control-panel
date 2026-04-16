export interface ActionOption {
  label: string;
  steps: string[];
}

export interface FinalItem {
  id: string;
  title: string;
  why: string;
  owner: 'jordan' | 'alfred' | 'both';
  status: 'pending' | 'in-progress' | 'done';
  category: 'data' | 'integration' | 'config';
  actions: ActionOption[];
  pages: string[];
}

export const finalItems: FinalItem[] = [
  // ═══ COMPLETED ═══
  {
    id: 'fi-2',
    title: 'Triple Whale API Key',
    why: 'Feeds attribution data, MER, nCAC, channel metrics into Dashboard and Attribution Tree.',
    owner: 'jordan',
    status: 'done',
    category: 'integration',
    pages: ['Dashboard', 'Attribution Tree'],
    actions: [{ label: 'Completed', steps: ['API key provided and integrated. Dashboard KPIs, channel attribution, and Creative & MTA all pulling live TW data.'] }],
  },
  {
    id: 'fi-5',
    title: 'Google Ads API Access',
    why: 'Spend, CPC, CTR, and conversion data for Creative & MTA and Attribution Tree.',
    owner: 'alfred',
    status: 'done',
    category: 'integration',
    pages: ['Creative & MTA', 'Attribution Tree'],
    actions: [{ label: 'Completed', steps: ['Developer Token and Account ID provided. Google Ads data integrated into Dashboard and spend summaries.'] }],
  },
  {
    id: 'fi-8',
    title: 'GA4 Access',
    why: 'Session data, traffic sources, engagement metrics, and event tracking.',
    owner: 'jordan',
    status: 'done',
    category: 'integration',
    pages: ['Dashboard', 'Attribution Tree'],
    actions: [{ label: 'Completed', steps: ['GA4 service account connected. Unique Sessions chart on Dashboard, event tracking on Attribution Tracking Infra tab — all live.'] }],
  },
  {
    id: 'fi-3',
    title: 'Company P&L Spreadsheet',
    why: 'Profit & Loss page connected to Impremis MoM P&L Google Sheet.',
    owner: 'jordan',
    status: 'done',
    category: 'data',
    pages: ['P&L'],
    actions: [{ label: 'Completed', steps: ['Connected to Google Sheet (MoM P&L 25-26). Service account has read access. 15 months of data (Jan 2025 - Mar 2026) flowing into P&L page.'] }],
  },
  {
    id: 'fi-4',
    title: 'Meta Ads API Access',
    why: 'Creative analysis, ad performance data, and creative asset previews.',
    owner: 'jordan',
    status: 'done',
    category: 'integration',
    pages: ['Creative & MTA', 'Attribution Tree'],
    actions: [{ label: 'Completed', steps: ['Meta access token provided. Ad performance data, creative images, headlines, and CTAs all pulling live. Ad preview shows actual creative assets from Meta CDN.'] }],
  },
  {
    id: 'fi-6',
    title: 'TikTok Data Integration',
    why: 'TikTok ad performance data via direct API + Triple Whale.',
    owner: 'alfred',
    status: 'done',
    category: 'integration',
    pages: ['Creative & MTA', 'Attribution Tree'],
    actions: [{ label: 'Completed', steps: ['TikTok Ads API connected with access token. Ad data and creative thumbnails pulling live. Triple Whale also provides TikTok attribution data.'] }],
  },
  {
    id: 'fi-htpasswd',
    title: 'Basic Auth (htpasswd)',
    why: 'Password protection for Clickman dashboard.',
    owner: 'alfred',
    status: 'done',
    category: 'config',
    pages: ['All Pages'],
    actions: [{ label: 'Completed', steps: ['Basic auth middleware added. Username: clickman, Password: 1234.'] }],
  },
  {
    id: 'fi-targets-storage',
    title: 'Targets Server Storage',
    why: 'Targets now stored on server (Vercel Blob) instead of localStorage only.',
    owner: 'alfred',
    status: 'done',
    category: 'config',
    pages: ['Targets & Goals', 'Dashboard'],
    actions: [{ label: 'Completed', steps: ['Targets saved to Vercel Blob. Shared across users/devices. Dashboard KPI cards show targets when set, hidden when empty.'] }],
  },
  {
    id: 'fi-prompts-storage',
    title: 'Prompt Templates Server Storage',
    why: 'All 13 intelligence prompts now stored on server with version history.',
    owner: 'alfred',
    status: 'done',
    category: 'config',
    pages: ['Prompt Templates', 'All Intelligence Sections'],
    actions: [{ label: 'Completed', steps: ['Unified prompt registry backed by Vercel Blob. 13 prompts across Dashboard, Targets, Creative (4 tabs), Attribution (5 layers), Cohorts, P&L. History + restore works across sessions.'] }],
  },

  {
    id: 'fi-cohorts',
    title: 'Cohort Analysis (Triple Whale SQL)',
    why: 'Cohorts page powered by TW SQL API using orders_table with order_revenue (USD). Matches TW cohort display for M2-M12. M0/M1 have minor display-layer differences.',
    owner: 'alfred',
    status: 'done',
    category: 'data',
    pages: ['Cohorts'],
    actions: [{ label: 'Completed', steps: ['Cohort data pulled from TW orders_table via SQL API. LTV, RPR, NCPA, customer counts, retention — all live. Cumulative/non-cumulative toggle working. Values in USD (pre-converted by TW).'] }],
  },
  {
    id: 'fi-attribution-sql',
    title: 'Channel Attribution (Triple Whale SQL)',
    why: 'Channel Attribution table on Dashboard powered by TW pixel_joined_tvf table with attribution model tabs and window dropdown.',
    owner: 'alfred',
    status: 'done',
    category: 'integration',
    pages: ['Dashboard'],
    actions: [{ label: 'Completed', steps: ['Five attribution model tabs (Last Click, Linear, First Click, Linear Paid, Triple). Attribution window dropdown (1d, 7d, 14d, 28d, Lifetime). All columns: Spend, CPA, NC CPA, AOV, CV, Purchases, ROAS, NC ROAS, NCP, CR.'] }],
  },
  {
    id: 'fi-tracking-infra',
    title: 'Tracking Infrastructure Events',
    why: 'Attribution Tree Tracking Infra tab shows all platform events with live data from GA4 and Google Ads APIs.',
    owner: 'alfred',
    status: 'done',
    category: 'integration',
    pages: ['Attribution Tree'],
    actions: [{ label: 'Completed', steps: ['Meta Pixel event list from live Ads Insights (ad-level aggregate, includes custom pixel events). Google Ads Tag live, GA4 live from API, TikTok sample, Reddit Ads report-based conversions, Meta Pixel ID in UI. Pagination for long lists.'] }],
  },
  {
    id: 'fi-7',
    title: 'Reddit Ads API Access',
    why: 'Reddit ad spend and performance for Creative & MTA alongside other platforms.',
    owner: 'jordan',
    status: 'done',
    category: 'integration',
    pages: ['Creative & MTA'],
    actions: [
      {
        label: 'Completed',
        steps: [
          'Reddit Ads API connected. Reddit platform metrics and charts in Creative & MTA use live data (no longer sample-only for Reddit).',
        ],
      },
    ],
  },

  // ═══ PENDING ═══
  // {
  //   id: 'fi-11',
  //   title: 'Anthropic API Key',
  //   why: 'AI Intelligence sections need Claude API to generate real insights from live data instead of static analysis text.',
  //   owner: 'jordan',
  //   status: 'pending',
  //   category: 'integration',
  //   pages: ['All Intelligence Sections'],
  //   actions: [
  //     {
  //       label: 'Provide Anthropic Claude API key',
  //       steps: [
  //         'Go to console.anthropic.com',
  //         'Generate a new API key',
  //         'Set appropriate usage limits',
  //         'Send the API key to Alfred',
  //       ],
  //     },
  //   ],
  // },
  {
    id: 'fi-tw-survey',
    title: 'Triple Whale Post-Purchase Surveys',
    why: 'Surveys & MMM section on Attribution page needs survey data. Currently not available from TW API — needs to be enabled in Triple Whale.',
    owner: 'jordan',
    status: 'pending',
    category: 'config',
    pages: ['Attribution Tree'],
    actions: [
      {
        label: 'Enable post-purchase surveys in Triple Whale',
        steps: [
          'Log in to Triple Whale → Surveys',
          'Enable post-purchase survey widget on order confirmation page',
          'Configure "How did you hear about us?" question with channel options',
          'Once enabled and collecting data, Alfred will integrate the survey results into the pie chart',
        ],
      },
    ],
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
