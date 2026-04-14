/** Channel names hidden from Channel Attribution (Triple Whale SQL) in UI and exports. */
const EXCLUDED_ATTRIBUTION_CHANNEL_NAMES = new Set(
  ['chatgpt.com', 'shopify_email', 'th', 'customer.io', 'ortto'].map((s) => s.toLowerCase()),
);

export function isExcludedAttributionChannelName(channel: string): boolean {
  return EXCLUDED_ATTRIBUTION_CHANNEL_NAMES.has(channel.trim().toLowerCase());
}

export function filterAttributionChannelRows<T extends { channel?: string }>(rows: T[]): T[] {
  return rows.filter((row) => !isExcludedAttributionChannelName(String(row?.channel ?? '')));
}
