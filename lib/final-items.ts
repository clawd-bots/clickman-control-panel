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
  pages: string[]; // which dashboard pages this unlocks
}

export const finalItems: FinalItem[] = [
  {
    id: 'fi-1',
    title: 'BigQuery Access',
    why: 'Powers the Dashboard, Cohorts, and P&L pages with live revenue, orders, and customer data.',
    owner: 'jordan',
    status: 'pending',
    category: 'data',
    pages: ['Dashboard', 'Cohorts', 'P&L'],
    actions: [
      {
        label: 'Option A: Share a Service Account key',
        steps: [
          'Go to console.cloud.google.com → IAM → Service Accounts',
          'Create a service account (e.g. "clickman-read")',
          'Grant BigQuery Data Viewer + BigQuery Job User roles',
          'Create a JSON key and send it to Alfred via WhatsApp',
        ],
      },
      {
        label: 'Option B: Invite Alfred\'s Google account',
        steps: [
          'Go to console.cloud.google.com → IAM',
          'Click "Grant Access"',
          'Add alfred@mail.andyou.ph with BigQuery Data Viewer role',
          'Tell Alfred the project ID and dataset name',
        ],
      },
    ],
  },
  {
    id: 'fi-2',
    title: 'Triple Whale API Key',
    why: 'Feeds attribution data, MER, nCAC, channel metrics, and post-purchase survey responses into the Attribution Tree and Dashboard.',
    owner: 'jordan',
    status: 'done',
    category: 'integration',
    pages: ['Dashboard', 'Attribution Tree'],
    actions: [
      {
        label: 'Generate an API key',
        steps: [
          'Log in to Triple Whale → Settings → API',
          'Create a new API key with read access',
          'Send the key to Alfred via WhatsApp',
        ],
      },
    ],
  },
  {
    id: 'fi-3',
    title: 'Company Actual P&L Spreadsheet',
    why: 'The Profit & Loss and Cash Flow pages need your real P&L data. Current link will change and needs to be replaced with a live read-only connection.',
    owner: 'jordan',
    status: 'pending',
    category: 'data',
    pages: ['P&L', 'Cash Flow'],
    actions: [
      {
        label: 'Provide live read-only P&L link',
        steps: [
          'Current temp link: https://docs.google.com/spreadsheets/d/1Qkj7nRqwLY75qdFNcSZyhgJ9VrOmz3KX/edit',
          'This link will change - create a permanent, live-updating P&L view',
          'Share final link with read-only access to alfred@mail.andyou.ph',
          'Dashboard needs stable link for automated data refresh',
        ],
      },
    ],
  },
  {
    id: 'fi-4',
    title: 'Meta Ads API Access',
    why: 'Creative analysis, MTA segmentation, and attribution all need Meta ad-level data. Jordan chose Option A but needs to provide system user token for automated data flow.',
    owner: 'jordan',
    status: 'pending',
    category: 'integration',
    pages: ['Creative & MTA', 'Attribution Tree'],
    actions: [
      {
        label: 'System User Token Required (not manual pulls)',
        steps: [
          'Create System User in Business Manager → Business Settings → System Users',
          'Generate system user access token with ads_read permissions',
          'Send token to Alfred for automated data collection',
          'Manual data pulls not acceptable - needs API automation',
          'Alfred has Business Manager access already',
        ],
      },
    ],
  },
  {
    id: 'fi-5',
    title: 'Google Ads API Access',
    why: 'Needed for spend, CPC, CTR, and conversion data in Creative & MTA and Attribution Tree. Developer token and account ID provided.',
    owner: 'alfred',
    status: 'done',
    category: 'integration',
    pages: ['Creative & MTA', 'Attribution Tree'],
    actions: [
      {
        label: 'All credentials provided - integration ready',
        steps: [
          'Developer Token: _FZikLNlOp4DxGZvkKGbBQ (provided by Jordan)',
          'Account ID: 281-311-3792 (provided)',
          'Read-only access level confirmed',
          'Ready for Google Ads API integration implementation',
        ],
      },
    ],
  },
  {
        id: 'fi-6',
    title: 'TikTok Data Integration',
    why: 'TripleWhale already provides all TikTok performance data needed. TikTok Events API token provided for event quality match scores review.',
    owner: 'alfred',
    status: 'in-progress',
    category: 'integration',
    pages: ['Creative & MTA', 'Attribution Tree'],
    actions: [
      {
        label: 'TripleWhale has all TikTok data + Events API for quality scores',
        steps: [
          'TikTok advertising data: Available through existing TripleWhale integration',
          'TripleWhale provides both TripleWhale data and platform data for TikTok',
          'TikTok Events API Token: 7232ce44844de36c79b812ed901ce7bf04c3fe03',
          'Use Events API token only for event quality match score reviews',
          'No direct TikTok ad account access required',
        ],
      },
    ],
  },
  {
    id: 'fi-7',
    title: 'Reddit Ads API Access',
    why: 'Reddit ad data for the Creative & MTA panel.',
    owner: 'jordan',
    status: 'pending',
    category: 'integration',
    pages: ['Creative & MTA'],
    actions: [
      {
        label: 'Create a Reddit "script" app',
        steps: [
          'Go to reddit.com/prefs/apps',
          'Click "create another app" at the bottom',
          'Select "script" as the app type',
          'Name: alfred_clickman_control (or similar)',
          'Description: clickman control panel for Alfred',
          'Redirect URI: http://localhost:8080 (required field, but not used for script apps)',
          'Click "create app"',
          'Copy the client ID (shown under the app name) and the client secret',
          'Send both + your Reddit Ads account ID to Alfred via WhatsApp',
        ],
      },
    ],
  },
  {
    id: 'fi-8',
    title: 'GA4 Access',
    why: 'Session data, traffic sources, and supporting attribution infrastructure.',
    owner: 'jordan',
    status: 'done',
    category: 'integration',
    pages: ['Dashboard', 'Attribution Tree'],
    actions: [
      {
        label: 'Option A: Share via existing OAuth',
        steps: [
          'Alfred already has Google OAuth',
          'Just share your GA4 Property ID (9-digit number from GA4 → Admin → Property Settings)',
          'Alfred will request the analytics.readonly scope',
        ],
      },
      {
        label: 'Option B: Add Alfred as a viewer',
        steps: [
          'Go to GA4 → Admin → Property Access Management',
          'Add alfred@mail.andyou.ph with Viewer role',
          'Share the Property ID with Alfred',
        ],
      },
    ],
  },
  {
    id: 'fi-9',
    title: 'Customer.io API Integration',
    why: 'Customer.io powers your email & SMS. Attribution tree needs this channel data for the full picture. Workspace: Rx Ventures Pte. Ltd. Data must flow via API automatically.',
    owner: 'alfred',
    status: 'in-progress',
    category: 'integration',
    pages: ['Attribution Tree'],
    actions: [
      {
        label: 'Implement API integration with all credentials provided',
        steps: [
          'Workspace: Rx Ventures Pte. Ltd.',
          'Site ID: deb7a9d23d995e204213',
          'API Key: f5f552bd60a11b6cc75a',
          'API Key Name: Alfred Clickman DB',
          'Jordan has view-only access via alfred@mail.andyou.ph',
          'Integrate Customer.io Tracking API for automated data flow (no manual pulls)',
        ],
      },
    ],
  },
  {
    id: 'fi-10',
    title: 'Inventory API Key Request',
    why: 'Product KPIs table currently shows "Pending API" for inventory data. We need API access to display real-time inventory levels for each product.',
    owner: 'jordan',
    status: 'pending',
    category: 'integration', 
    pages: ['Dashboard'],
    actions: [
      {
        label: 'Provide inventory system API access',
        steps: [
          'Identify which system manages product inventory (Shopify, WooCommerce, custom system, etc.)',
          'Generate API key/token with read-only access to inventory data',
          'Provide API endpoint URLs for product inventory queries',
          'Send API credentials and documentation to Alfred via WhatsApp',
          'Include product SKU mapping if different from dashboard product names',
        ],
      },
    ],
  },
  {
    id: 'fi-12',
    title: 'Medusa API Key',
    why: 'Medusa is the commerce backend powering AndYou. API access is needed to pull live COGS, unit sales, revenue, product data, and order-level details directly into the dashboard and P&L.',
    owner: 'jordan',
    status: 'pending',
    category: 'integration',
    pages: ['Dashboard', 'P&L', 'Cash Flow'],
    actions: [
      {
        label: 'Generate a Medusa API key',
        steps: [
          'Log in to your Medusa admin panel',
          'Go to Settings → API Key Management (or equivalent)',
          'Create a new API key with read-only access',
          'Ensure the key has access to: Products, Orders, Inventory, and Pricing',
          'Send the API key and your Medusa backend URL (e.g. https://api.andyou.ph) to Alfred via WhatsApp',
          'This will replace sample data with live COGS, unit sales, revenue, and product metrics',
        ],
      },
    ],
  },
  {
    id: 'fi-11',
    title: 'Anthropic API Key Request',
    why: 'AI Intelligence sections throughout the dashboard need Anthropic Claude API access to generate insights, analyze data, and provide strategic recommendations.',
    owner: 'jordan',
    status: 'pending',
    category: 'integration',
    pages: ['All Intelligence sections'],
    actions: [
      {
        label: 'Provide Anthropic Claude API key',
        steps: [
          'Go to console.anthropic.com and create an account if needed',
          'Navigate to API Keys section',
          'Generate a new API key for Claude access',
          'Set appropriate usage limits for the dashboard',
          'Send the API key to Alfred via WhatsApp',
          'This will enable AI-powered insights across all dashboard sections',
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
