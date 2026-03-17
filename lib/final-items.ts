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
    why: 'The Profit & Loss and Cash Flow pages need your real P&L data. Temporary link provided but will change - need permanent read-only access.',
    owner: 'jordan',
    status: 'pending',
    category: 'data',
    pages: ['P&L', 'Cash Flow'],
    actions: [
      {
        label: 'Provide live read-only P&L link',
        steps: [
          'Create a permanent, live-updating P&L view in Google Sheets',
          'Share with read-only access to alfred@mail.andyou.ph',
          'Ensure link won\'t change so dashboard can auto-refresh data',
          'Current temporary link will be replaced with live connection',
        ],
      },
    ],
  },
  {
    id: 'fi-4',
    title: 'Meta Ads API Access',
    why: 'Creative analysis, MTA segmentation, and attribution all need Meta ad-level data. Jordan chose Option A but needs system user token for automated data flow (not manual pulls).',
    owner: 'jordan',
    status: 'pending',
    category: 'integration',
    pages: ['Creative & MTA', 'Attribution Tree'],
    actions: [
      {
        label: 'Complete Option A setup - System User Token needed',
        steps: [
          'Add alfred@mail.andyou.ph to Business Manager with Analyst access (if not done)',
          'Create a System User in Business Manager → Business Settings → System Users',
          'Generate system user access token with ads_read permissions',
          'Provide token for automated data collection (no manual pulls)',
          'FOLLOW UP: Jordan to complete system user token setup',
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
        label: 'Credentials provided - ready for integration',
        steps: [
          'Developer Token: _FZikLNlOp4DxGZvkKGbBQ (provided)',
          'Account ID: 281-311-3792 (provided)',
          'Read-only access confirmed',
          'Ready for Google Ads API integration',
        ],
      },
    ],
  },
  {
    id: 'fi-6',
    title: 'TikTok Data Integration',
    why: 'TikTok performance data is already available via TripleWhale (both TW data and platform data). TikTok Events API token provided for event quality match scores only.',
    owner: 'alfred',
    status: 'in-progress',
    category: 'integration',
    pages: ['Creative & MTA', 'Attribution Tree'],
    actions: [
      {
        label: 'Use TripleWhale data + Events API token',
        steps: [
          'TikTok ads data: Use existing TripleWhale integration (all data available)',
          'TikTok Events API token: 7232ce44844de36c79b812ed901ce7bf04c3fe03 (for event quality match scores)',
          'No separate TikTok ad account access needed',
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
    why: 'Customer.io powers your email & SMS. Attribution tree needs this channel data for the full picture. Credentials provided - data must flow via API automatically (not manual pulls).',
    owner: 'alfred',
    status: 'in-progress',
    category: 'integration',
    pages: ['Attribution Tree'],
    actions: [
      {
        label: 'Implement API integration with provided credentials',
        steps: [
          'Site ID: deb7a9d23d995e204213 (provided)',
          'API Key: f5f552bd60a11b6cc75a (provided)',
          'Integrate Customer.io Tracking API for automated data flow',
          'No manual data pulls - must be fully automated',
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
