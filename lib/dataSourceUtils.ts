/**
 * Utility functions for data source styling and indicators
 */

export type DataSource = 'Triple Whale' | 'Google Analytics' | 'Google Sheets' | 'GA4';

export function getDataSourceClass(source: string): string {
  const normalized = source.toLowerCase();
  
  if (normalized.includes('triple whale')) {
    return 'data-source-triplewhale';
  }
  if (normalized.includes('google analytics') || normalized.includes('ga4')) {
    return 'data-source-google';
  }
  if (normalized.includes('google sheets') || normalized.includes('sheets')) {
    return 'data-source-sheets';
  }
  
  return 'data-source-triplewhale'; // default
}

export function getDataSourceIcon(source: string): string {
  const normalized = source.toLowerCase();
  
  if (normalized.includes('triple whale')) {
    return '🐳'; // whale emoji for Triple Whale
  }
  if (normalized.includes('google analytics') || normalized.includes('ga4')) {
    return '📊'; // chart emoji for Google Analytics
  }
  if (normalized.includes('google sheets') || normalized.includes('sheets')) {
    return '📈'; // sheet emoji for Google Sheets
  }
  
  return '📊'; // default
}

export function getDataSourceColor(source: string, isDark: boolean = false): string {
  const normalized = source.toLowerCase();
  
  if (normalized.includes('triple whale')) {
    return isDark ? '#4A6BD6' : '#334FB4';
  }
  if (normalized.includes('google analytics') || normalized.includes('ga4')) {
    return isDark ? '#34D399' : '#059669';
  }
  if (normalized.includes('google sheets') || normalized.includes('sheets')) {
    return isDark ? '#EDBF63' : '#D97706';
  }
  
  return isDark ? '#4A6BD6' : '#334FB4'; // default
}