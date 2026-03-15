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
    why: 'The Profit & Loss and Cash Flow pages need your real P&L (not just the first-time customer sheet you already shared).',
    owner: 'jordan',
    status: 'pending',
    category: 'data',
    pages: ['P&L', 'Cash Flow'],
    actions: [
      {
        label: 'Option A: Share the Google Sheet',
        steps: [
          'Open the actual company P&L spreadsheet in Google Sheets',
          'Click Share → add alfred@mail.andyou.ph as Viewer',
          'Send Alfred the link',
        ],
      },
      {
        label: 'Option B: Export and send',
        steps: [
          'Download the P&L as .xlsx or .csv',
          'Send the file to Alfred via WhatsApp or email',
        ],
      },
    ],
  },
  {
    id: 'fi-4',
    title: 'Meta Ads API Access',
    why: 'Creative analysis, MTA segmentation, and attribution all need Meta ad-level data.',
    owner: 'jordan',
    status: 'pending',
    category: 'integration',
    pages: ['Creative & MTA', 'Attribution Tree'],
    actions: [
      {
        label: 'Option A: Add Alfred to Business Manager',
        steps: [
          'Go to business.facebook.com → Settings → People',
          'Invite alfred@mail.andyou.ph with Analyst access to the ad account',
          'Alfred will generate a system user token from there',
        ],
      },
      {
        label: 'Option B: Generate a token yourself',
        steps: [
          'Go to developers.facebook.com → Tools → Graph API Explorer',
          'Select your app and ad account',
          'Generate a long-lived token with ads_read permission',
          'Send the token + Ad Account ID to Alfred',
        ],
      },
    ],
  },
  {
    id: 'fi-5',
    title: 'Google Ads API Access',
    why: 'Needed for spend, CPC, CTR, and conversion data in Creative & MTA and Attribution Tree.',
    owner: 'jordan',
    status: 'done',
    category: 'integration',
    pages: ['Creative & MTA', 'Attribution Tree'],
    actions: [
      {
        label: 'Option A: Share via existing OAuth',
        steps: [
          'Alfred already has Google OAuth for Gmail',
          'Just share your Google Ads Customer ID (the 10-digit number in the top bar of Google Ads)',
          'Alfred will request the ads.readonly scope on the next OAuth refresh',
        ],
      },
      {
        label: 'Option B: Invite Alfred as read-only user',
        steps: [
          'Go to Google Ads → Admin → Access and Security',
          'Invite alfred@mail.andyou.ph with Read Only access',
          'Share the Customer ID with Alfred',
        ],
      },
    ],
  },
  {
    id: 'fi-6',
    title: 'TikTok Ads API Access',
    why: 'Feeds TikTok spend and performance data into Creative & MTA and Attribution Tree.',
    owner: 'jordan',
    status: 'pending',
    category: 'integration',
    pages: ['Creative & MTA', 'Attribution Tree'],
    actions: [
      {
        label: 'Generate an API token',
        steps: [
          'Go to TikTok Ads Manager → Assets → Developer Center',
          'Create an app and generate a long-lived access token',
          'Send the token + Advertiser ID to Alfred',
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
    title: 'Customer.io API Access',
    why: 'Customer.io powers your email & SMS. Attribution tree needs this channel data for the full picture.',
    owner: 'jordan',
    status: 'pending',
    category: 'integration',
    pages: ['Attribution Tree'],
    actions: [
      {
        label: 'Option A: Generate an API key',
        steps: [
          'Log in to Customer.io → Settings → API Credentials',
          'Create a new Tracking API key or App API key with read-only scope',
          'Send the Site ID + API key to Alfred via WhatsApp',
        ],
      },
      {
        label: 'Option B: Invite Alfred as a team member',
        steps: [
          'Go to Customer.io → Settings → Workspace → People',
          'Invite alfred@mail.andyou.ph with Viewer/Read-only role',
          'Alfred will pull the data from there',
        ],
      },
    ],
  },
  {
    id: 'fi-10',
    title: 'Set Real Monthly Targets',
    why: 'The Targets & Goals page currently shows placeholder values. Your real targets make gap analysis meaningful.',
    owner: 'jordan',
    status: 'pending',
    category: 'config',
    pages: ['Targets & Goals'],
    actions: [
      {
        label: 'Option A: Edit directly in the dashboard',
        steps: [
          'Go to Targets & Goals → Monthly Targets tab',
          'Click any target value to edit it inline',
          'Set your real MER, aMER, Revenue, CM3, nCAC, etc.',
        ],
      },
      {
        label: 'Option B: Send them to Alfred',
        steps: [
          'Send Alfred a list of your monthly targets via WhatsApp',
          'Format: metric = value (e.g. "MER = 3.5x, Revenue = ₱5M")',
          'Alfred will update them in the code',
        ],
      },
    ],
  },
  {
    id: 'fi-11',
    title: 'Deploy to Vercel',
    why: 'Makes the dashboard accessible from any device, not just Alfred\'s Mac.',
    owner: 'both',
    status: 'pending',
    category: 'config',
    pages: ['All pages'],
    actions: [
      {
        label: 'Option A: Alfred handles it (needs a Vercel account)',
        steps: [
          'Tell Alfred "deploy it" and he\'ll set up the Vercel project',
          'You\'ll get a URL like clickman.vercel.app',
          'Alfred will need any API keys/env vars by then',
        ],
      },
      {
        label: 'Option B: Use your own Vercel account',
        steps: [
          'Go to vercel.com and create a project',
          'Connect the GitHub repo (or Alfred pushes to yours)',
          'Alfred will configure the env vars',
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
