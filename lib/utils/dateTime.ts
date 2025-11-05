/**
 * Date and time formatting utilities for trial organization timestamps
 */

/**
 * Format a timestamp for display with date and time
 * @param timestamp - ISO 8601 timestamp or Date object
 * @param includeTime - Whether to include time component (default: true)
 * @returns Formatted string like "Jan 15, 2025 at 2:30 PM" or "Jan 15, 2025"
 */
export function formatTimestamp(
  timestamp: string | Date | null | undefined,
  includeTime: boolean = true
): string {
  if (!timestamp) return 'N/A';

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  if (isNaN(date.getTime())) return 'Invalid date';

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
    options.hour12 = true;
  }

  const formatted = new Intl.DateTimeFormat('en-US', options).format(date);

  return includeTime ? formatted.replace(',', ' at') : formatted;
}

/**
 * Format a timestamp relative to now (e.g., "2 hours ago", "3 days ago")
 * @param timestamp - ISO 8601 timestamp or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(
  timestamp: string | Date | null | undefined
): string {
  if (!timestamp) return 'N/A';

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  if (isNaN(date.getTime())) return 'Invalid date';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }

  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

/**
 * Format a timestamp with both absolute and relative time
 * @param timestamp - ISO 8601 timestamp or Date object
 * @returns String like "Jan 15, 2025 at 2:30 PM (2 hours ago)"
 */
export function formatTimestampWithRelative(
  timestamp: string | Date | null | undefined
): string {
  const absolute = formatTimestamp(timestamp);
  const relative = formatRelativeTime(timestamp);

  if (absolute === 'N/A' || absolute === 'Invalid date') return absolute;

  return `${absolute} (${relative})`;
}

/**
 * Calculate days remaining until a future date
 * @param endDate - Future date timestamp
 * @returns Number of days remaining (negative if past)
 */
export function daysRemaining(endDate: string | Date | null | undefined): number {
  if (!endDate) return 0;

  const date = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(date.getTime())) return 0;

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format days remaining as a user-friendly string
 * @param endDate - Future date timestamp
 * @returns String like "5 days left", "Expired 3 days ago", or "Expires today"
 */
export function formatDaysRemaining(endDate: string | Date | null | undefined): string {
  if (!endDate) return 'No expiration set';

  const days = daysRemaining(endDate);

  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day left';
  if (days > 1) return `${days} days left`;
  if (days === -1) return 'Expired yesterday';
  return `Expired ${Math.abs(days)} days ago`;
}

/**
 * Format a duration in milliseconds
 * @param durationMs - Duration in milliseconds
 * @returns Formatted string like "2h 15m"
 */
export function formatDuration(durationMs: number): string {
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;

  const seconds = Math.floor(durationMs / 1000);
  return `${seconds}s`;
}
