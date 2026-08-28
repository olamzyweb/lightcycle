/**
 * Date utility module for offline-safe calendar date calculations.
 * Avoids browser timezone offsets by using UTC internally and YYYY-MM-DD strings.
 */

/**
 * Parses a YYYY-MM-DD string into a UTC Date object (set to UTC midnight).
 */
export function toUTCDate(dateStr: string): Date {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed
  const day = parseInt(match[3], 10);
  
  const date = new Date(Date.UTC(year, month, day));
  // Validate that the date components match the input (handles leap year validation, e.g., Feb 30)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    throw new Error(`Invalid calendar date: ${dateStr}`);
  }
  return date;
}

/**
 * Formats a Date object as YYYY-MM-DD in UTC.
 */
export function fromUTCDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's local timezone.
 */
export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculates the difference in days between startStr and endStr (end - start).
 * Returns positive if end is after start, negative if before.
 */
export function getDaysDifference(startStr: string, endStr: string): number {
  const start = toUTCDate(startStr);
  const end = toUTCDate(endStr);
  const msDiff = end.getTime() - start.getTime();
  return Math.round(msDiff / 86400000); // 1 day = 86,400,000 ms in UTC
}

/**
 * Adds or subtracts days to/from a YYYY-MM-DD date string.
 */
export function addDays(dateStr: string, days: number): string {
  const date = toUTCDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUTCDate(date);
}

/**
 * Verifies if a string is a valid YYYY-MM-DD calendar date.
 */
export function isValidDateString(dateStr: string): boolean {
  try {
    toUTCDate(dateStr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a YYYY-MM-DD string into a user-friendly display date.
 * Uses UTC timezone inside Intl to prevent shifting.
 */
export function formatDisplayDate(
  dateStr: string,
  style: 'long' | 'short' | 'weekday' | 'month-year' = 'long'
): string {
  const date = toUTCDate(dateStr);
  const options: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };

  switch (style) {
    case 'long':
      options.weekday = 'long';
      options.day = 'numeric';
      options.month = 'long';
      options.year = 'numeric';
      break;
    case 'short':
      options.day = 'numeric';
      options.month = 'short';
      options.year = 'numeric';
      break;
    case 'weekday':
      options.weekday = 'long';
      break;
    case 'month-year':
      options.month = 'long';
      options.year = 'numeric';
      break;
  }

  // Example long: Friday, August 28, 2026
  return new Intl.DateTimeFormat('en-US', options).format(date);
}
