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

// ============================================
// Natural Language Date Parsing
// ============================================

export interface ParsedDate {
  date: Date;
  confidence: 'exact' | 'inferred' | 'default';
  originalText: string;
}

const DAYS_OF_WEEK = [
  'sunday', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday'
];

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

/**
 * Parse natural language date expressions like "tomorrow", "next Tuesday", "in 2 weeks"
 * @param text - Natural language date text
 * @param baseDate - Base date for relative calculations (default: now)
 * @returns ParsedDate object with date, confidence level, and original text
 */
export function parseNaturalDate(text: string, baseDate: Date = new Date()): ParsedDate | null {
  if (!text) return null;

  const normalizedText = text.toLowerCase().trim();
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);

  // Try each parser in order of specificity
  const parsers = [
    parseExplicitDate,
    parseRelativeDay,
    parseNextDayOfWeek,
    parseThisDayOfWeek,
    parseRelativeWeeks,
    parseRelativeMonths,
    parseEndOfPeriod,
    parseMonthDay,
  ];

  for (const parser of parsers) {
    const result = parser(normalizedText, today);
    if (result) {
      return { ...result, originalText: text };
    }
  }

  return null;
}

// Parse explicit dates like "12/25", "Dec 25", "December 25"
function parseExplicitDate(text: string, today: Date): Omit<ParsedDate, 'originalText'> | null {
  // MM/DD format
  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10) - 1;
    const day = parseInt(slashMatch[2], 10);
    let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : today.getFullYear();
    if (year < 100) year += 2000;

    const date = new Date(year, month, day);
    if (isValidDate(date)) {
      return { date, confidence: 'exact' };
    }
  }

  // Month DD format (Dec 25, December 25)
  for (let i = 0; i < MONTHS.length; i++) {
    const monthShort = MONTHS[i].substring(0, 3);
    const monthPattern = new RegExp(`^(?:${MONTHS[i]}|${monthShort})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?$`);
    const match = text.match(monthPattern);
    if (match) {
      const day = parseInt(match[1], 10);
      const year = match[2] ? parseInt(match[2], 10) : today.getFullYear();
      const date = new Date(year, i, day);
      if (isValidDate(date)) {
        // If date is in past without year, assume next year
        if (date < today && !match[2]) {
          date.setFullYear(date.getFullYear() + 1);
        }
        return { date, confidence: 'exact' };
      }
    }
  }

  return null;
}

// Parse "today", "tomorrow", "day after tomorrow"
function parseRelativeDay(text: string, today: Date): Omit<ParsedDate, 'originalText'> | null {
  if (text === 'today') {
    return { date: new Date(today), confidence: 'exact' };
  }

  if (text === 'tomorrow' || text === 'tmrw' || text === 'tmw') {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    return { date, confidence: 'exact' };
  }

  if (text === 'day after tomorrow') {
    const date = new Date(today);
    date.setDate(date.getDate() + 2);
    return { date, confidence: 'exact' };
  }

  return null;
}

// Parse "next Monday", "next Tuesday", etc.
function parseNextDayOfWeek(text: string, today: Date): Omit<ParsedDate, 'originalText'> | null {
  const match = text.match(/^next\s+(\w+)$/);
  if (!match) return null;

  const dayName = match[1];
  const targetDay = DAYS_OF_WEEK.indexOf(dayName);
  if (targetDay === -1) return null;

  const currentDay = today.getDay();
  let daysUntil = targetDay - currentDay;

  // "next X" always means the X in the coming week (at least 7 days)
  if (daysUntil <= 0) {
    daysUntil += 7;
  }
  // If it's this week, add 7 more to get to next week
  daysUntil += 7;

  const date = new Date(today);
  date.setDate(date.getDate() + daysUntil);
  return { date, confidence: 'exact' };
}

// Parse "this Monday", "Tuesday" (without next)
function parseThisDayOfWeek(text: string, today: Date): Omit<ParsedDate, 'originalText'> | null {
  const match = text.match(/^(?:this\s+)?(\w+)$/);
  if (!match) return null;

  const dayName = match[1];
  const targetDay = DAYS_OF_WEEK.indexOf(dayName);
  if (targetDay === -1) return null;

  const currentDay = today.getDay();
  let daysUntil = targetDay - currentDay;

  // If today or past, go to next week
  if (daysUntil <= 0) {
    daysUntil += 7;
  }

  const date = new Date(today);
  date.setDate(date.getDate() + daysUntil);
  return { date, confidence: 'inferred' };
}

// Parse "in 2 weeks", "in a week", "in 3 days"
function parseRelativeWeeks(text: string, today: Date): Omit<ParsedDate, 'originalText'> | null {
  // "in X weeks/days"
  const match = text.match(/^in\s+(?:a\s+|an\s+|(\d+)\s+)(week|day|wk)s?$/);
  if (!match) return null;

  const count = match[1] ? parseInt(match[1], 10) : 1;
  const unit = match[2];

  const date = new Date(today);
  if (unit === 'week' || unit === 'wk') {
    date.setDate(date.getDate() + (count * 7));
  } else {
    date.setDate(date.getDate() + count);
  }

  return { date, confidence: 'exact' };
}

// Parse "in 2 months", "next month"
function parseRelativeMonths(text: string, today: Date): Omit<ParsedDate, 'originalText'> | null {
  if (text === 'next month') {
    const date = new Date(today);
    date.setMonth(date.getMonth() + 1);
    return { date, confidence: 'inferred' };
  }

  const match = text.match(/^in\s+(?:a\s+|(\d+)\s+)months?$/);
  if (!match) return null;

  const count = match[1] ? parseInt(match[1], 10) : 1;
  const date = new Date(today);
  date.setMonth(date.getMonth() + count);

  return { date, confidence: 'inferred' };
}

// Parse "end of week", "end of month", "eow", "eom"
function parseEndOfPeriod(text: string, today: Date): Omit<ParsedDate, 'originalText'> | null {
  if (text === 'end of week' || text === 'eow') {
    const date = new Date(today);
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    date.setDate(date.getDate() + (daysUntilFriday || 7)); // If already Friday, next Friday
    return { date, confidence: 'inferred' };
  }

  if (text === 'end of month' || text === 'eom') {
    const date = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { date, confidence: 'inferred' };
  }

  if (text === 'end of quarter' || text === 'eoq') {
    const currentQuarter = Math.floor(today.getMonth() / 3);
    const lastMonthOfQuarter = (currentQuarter + 1) * 3;
    const date = new Date(today.getFullYear(), lastMonthOfQuarter, 0);
    return { date, confidence: 'inferred' };
  }

  return null;
}

// Parse "January 15", "Jan 15"
function parseMonthDay(text: string, today: Date): Omit<ParsedDate, 'originalText'> | null {
  for (let i = 0; i < MONTHS.length; i++) {
    const monthShort = MONTHS[i].substring(0, 3);
    const pattern = new RegExp(`^(${MONTHS[i]}|${monthShort})\\s+(\\d{1,2})(?:st|nd|rd|th)?$`, 'i');
    const match = text.match(pattern);
    if (match) {
      const day = parseInt(match[2], 10);
      let year = today.getFullYear();
      let date = new Date(year, i, day);

      // If date is in past, assume next year
      if (date < today) {
        year++;
        date = new Date(year, i, day);
      }

      if (isValidDate(date)) {
        return { date, confidence: 'exact' };
      }
    }
  }
  return null;
}

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Extract all date references from a text string
 * @param text - Text that may contain multiple date references
 * @returns Array of ParsedDate objects
 */
export function extractDatesFromText(text: string): ParsedDate[] {
  const results: ParsedDate[] = [];

  // Patterns to look for dates after
  const dateContextPatterns = [
    /(?:by|on|before|until|due|follow.?up|call back|check in|reach out)\s+([^,.!?]+)/gi,
    /(?:next|this)\s+\w+/gi,
    /(?:in\s+\d+\s+(?:days?|weeks?|months?))/gi,
    /(?:tomorrow|today|end of (?:week|month|quarter)|eow|eom)/gi,
    /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/g,
  ];

  for (const pattern of dateContextPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const potentialDate = match[1] || match[0];
      const parsed = parseNaturalDate(potentialDate.trim());
      if (parsed) {
        results.push(parsed);
      }
    }
  }

  return results;
}

/**
 * Format a parsed date for display with the original text
 * @param parsed - ParsedDate object
 * @returns String like "Dec 15, 2024 (next Tuesday)"
 */
export function formatParsedDate(parsed: ParsedDate): string {
  const formatted = formatTimestamp(parsed.date, false);
  if (parsed.confidence !== 'exact') {
    return `${formatted} (interpreted from "${parsed.originalText}")`;
  }
  return formatted;
}
