/**
 * Date Utilities for Actions
 * Shared date parsing functions without external dependencies
 */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Parse relative date strings into ISO format
 * Supports past: "today", "yesterday", "last week", "2 days ago"
 * Supports future: "tomorrow", "next week", "next Tuesday", "in 2 days", "Friday"
 */
export function parseRelativeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  const now = new Date();
  const lower = dateStr.toLowerCase().trim();

  // === TODAY / NOW ===
  if (lower === 'today' || lower === 'now') {
    return now.toISOString();
  }

  // === PAST DATES ===
  if (lower === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString();
  }

  if (lower === 'last week') {
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return lastWeek.toISOString();
  }

  // Match patterns like "2 days ago", "3 weeks ago"
  const agoMatch = lower.match(/(\d+)\s*(day|week|month)s?\s*ago/);
  if (agoMatch) {
    const num = parseInt(agoMatch[1], 10);
    const unit = agoMatch[2];
    const result = new Date(now);

    if (unit === 'day') result.setDate(result.getDate() - num);
    else if (unit === 'week') result.setDate(result.getDate() - num * 7);
    else if (unit === 'month') result.setMonth(result.getMonth() - num);

    return result.toISOString();
  }

  // === FUTURE DATES ===
  if (lower === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString();
  }

  if (lower === 'next week') {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString();
  }

  // Match "in X days/weeks/months"
  const inMatch = lower.match(/in\s+(\d+)\s*(day|week|month)s?/);
  if (inMatch) {
    const num = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    const result = new Date(now);

    if (unit === 'day') result.setDate(result.getDate() + num);
    else if (unit === 'week') result.setDate(result.getDate() + num * 7);
    else if (unit === 'month') result.setMonth(result.getMonth() + num);

    return result.toISOString();
  }

  // Match "next [day name]" e.g., "next Tuesday"
  const nextDayMatch = lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (nextDayMatch) {
    const targetDay = DAY_NAMES.indexOf(nextDayMatch[1]);
    const result = getNextWeekday(now, targetDay, true);
    return result.toISOString();
  }

  // Match bare day name e.g., "Tuesday", "Friday"
  const dayIndex = DAY_NAMES.indexOf(lower);
  if (dayIndex !== -1) {
    const result = getNextWeekday(now, dayIndex, false);
    return result.toISOString();
  }

  // Match "end of week/month"
  if (lower === 'end of week' || lower === 'eow') {
    const result = new Date(now);
    const daysUntilFriday = (5 - result.getDay() + 7) % 7 || 7;
    result.setDate(result.getDate() + daysUntilFriday);
    return result.toISOString();
  }

  if (lower === 'end of month' || lower === 'eom') {
    const result = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return result.toISOString();
  }

  // Try to parse as ISO date or natural date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return dateStr; // Return as-is if can't parse
}

/**
 * Get the next occurrence of a specific weekday
 * @param from Starting date
 * @param targetDay Day of week (0=Sunday, 6=Saturday)
 * @param forceNextWeek If true, always go to next week even if today is the target day
 */
function getNextWeekday(from: Date, targetDay: number, forceNextWeek: boolean): Date {
  const result = new Date(from);
  const currentDay = result.getDay();
  let daysToAdd = (targetDay - currentDay + 7) % 7;

  // If it's the same day and not forcing next week, use today's date only if there's time left
  // For follow-ups, we usually want at least the next occurrence
  if (daysToAdd === 0) {
    daysToAdd = forceNextWeek ? 7 : 7; // Default to next week for same day
  }

  result.setDate(result.getDate() + daysToAdd);
  return result;
}

/**
 * Format a date as YYYY-MM-DD for database storage
 */
export function formatDateOnly(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Check if a date string represents a future date
 */
export function isFutureDate(dateStr: string): boolean {
  const parsed = new Date(dateStr);
  const now = new Date();
  return parsed > now;
}
