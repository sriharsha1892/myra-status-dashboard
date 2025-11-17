/**
 * Flexible date parser for platform queries
 * Handles multiple date formats including informal formats like "Nov 17, Mon"
 */

/**
 * Parse a flexible date string into ISO format
 * Supports:
 * - "Nov 17, Mon" → 2025-11-17
 * - "November 17" → 2025-11-17
 * - "11/17/2024" → 2024-11-17
 * - "2024-11-17" → 2024-11-17 (ISO dates pass through)
 *
 * @param dateStr - The date string to parse
 * @param currentYear - Optional year to use for dates without year (defaults to current year)
 * @returns ISO formatted date string (YYYY-MM-DD) or throws error if unparseable
 */
export function parseFlexibleDate(dateStr: string, currentYear?: number): string {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error('Invalid date string');
  }

  const trimmed = dateStr.trim();

  // If already in ISO format (YYYY-MM-DD), validate and return
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return trimmed;
    }
  }

  // If in ISO datetime format, extract date part
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const year = currentYear || new Date().getFullYear();

  // Handle "Nov 17, Mon" or "Nov 17" format
  // Examples: "Nov 17, Mon", "November 17", "Nov 17"
  const monthDayPattern = /^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun))?$/i;
  const monthDayMatch = trimmed.match(monthDayPattern);

  if (monthDayMatch) {
    const monthStr = monthDayMatch[1];
    const day = parseInt(monthDayMatch[2], 10);

    const month = parseMonth(monthStr);
    if (month !== null && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getDate() === day) {
        return formatISODate(date);
      }
    }
  }

  // Handle "11/17/2024" or "11/17/24" format (MM/DD/YYYY or MM/DD/YY)
  const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
  const slashMatch = trimmed.match(slashPattern);

  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10) - 1; // 0-indexed
    const day = parseInt(slashMatch[2], 10);
    let parsedYear = parseInt(slashMatch[3], 10);

    // Handle 2-digit year (assume 20xx for now)
    if (parsedYear < 100) {
      parsedYear += 2000;
    }

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(parsedYear, month, day);
      if (!isNaN(date.getTime()) && date.getDate() === day) {
        return formatISODate(date);
      }
    }
  }

  // Handle "17/11/2024" format (DD/MM/YYYY - European style)
  const euroSlashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
  const euroSlashMatch = trimmed.match(euroSlashPattern);

  if (euroSlashMatch) {
    const day = parseInt(euroSlashMatch[1], 10);
    const month = parseInt(euroSlashMatch[2], 10) - 1; // 0-indexed
    let parsedYear = parseInt(euroSlashMatch[3], 10);

    // Handle 2-digit year
    if (parsedYear < 100) {
      parsedYear += 2000;
    }

    // Try as DD/MM/YYYY if day > 12 (can't be month)
    if (day > 12 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(parsedYear, month, day);
      if (!isNaN(date.getTime()) && date.getDate() === day) {
        return formatISODate(date);
      }
    }
  }

  // Last resort: try native Date parsing
  try {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return formatISODate(date);
    }
  } catch (e) {
    // Fall through to error
  }

  throw new Error(`Unable to parse date: "${dateStr}"`);
}

/**
 * Parse month name to 0-indexed month number
 * Handles both full names and abbreviations
 */
function parseMonth(monthStr: string): number | null {
  const normalized = monthStr.toLowerCase().trim();

  const months: Record<string, number> = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11,
  };

  return months[normalized] ?? null;
}

/**
 * Format Date object as ISO date string (YYYY-MM-DD)
 */
function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate if a string is a valid date
 * Returns true if parseable, false otherwise
 */
export function isValidDate(dateStr: string): boolean {
  try {
    parseFlexibleDate(dateStr);
    return true;
  } catch {
    return false;
  }
}
