/**
 * Utility functions for data source styling and indicators
 */

export type DataSource = 'Triple Whale' | 'Google Analytics' | 'Google Sheets' | 'GA4' | 'Meta';

export function getDataSourceClass(source: string): string {
  const normalized = source.toLowerCase();
  
  if (normalized.includes('triple whale')) {
    return 'data-source-triplewhale';
  }
  if (normalized.includes('meta') || normalized.includes('facebook')) {
    return 'data-source-meta';
  }
  if (normalized.includes('google sheets') || normalized.includes('sheets')) {
    return 'data-source-sheets';
  }
  if (normalized.includes('ga4')) {
    return 'data-source-ga4';
  }
  if (normalized.includes('google analytics')) {
    return 'data-source-ga4'; // Use same as GA4
  }
  
  return 'data-source-triplewhale'; // default
}

export function getDataSourceIcon(source: string): string {
  const normalized = source.toLowerCase();
  
  if (normalized.includes('triple whale')) {
    return '🐳'; // whale emoji for Triple Whale
  }
  if (normalized.includes('meta') || normalized.includes('facebook')) {
    return '📘'; // blue book emoji for Meta/Facebook
  }
  if (normalized.includes('google sheets') || normalized.includes('sheets')) {
    return '📊'; // sheet emoji for Google Sheets
  }
  if (normalized.includes('ga4') || normalized.includes('google analytics')) {
    return '📈'; // chart emoji for GA4
  }
  
  return '📊'; // default
}

export function getDataSourceColor(source: string, isDark: boolean = false): string {
  const normalized = source.toLowerCase();
  
  if (normalized.includes('triple whale')) {
    return '#1A73E8'; // TripleWhale brand color
  }
  if (normalized.includes('meta') || normalized.includes('facebook')) {
    return '#0668E1'; // Meta brand color
  }
  if (normalized.includes('google sheets') || normalized.includes('sheets')) {
    return '#0F9D58'; // Google Sheets brand color
  }
  if (normalized.includes('ga4') || normalized.includes('google analytics')) {
    return '#F9AB00'; // GA4 brand color
  }
  
  return '#1A73E8'; // default to TripleWhale
}