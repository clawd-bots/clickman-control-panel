/**
 * GA4 Data API interprets `dateRanges` start/end as calendar days in the property's reporting timezone.
 * Use these helpers so "today" and labels match that zone (not UTC / not the model's assumed date).
 */

/** YYYY-MM-DD for `date` as seen in the given IANA timezone (e.g. property reporting zone from GA4 API). */
export function formatYyyyMmDdInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
