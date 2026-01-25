/**
 * myRA Usage Parser
 * Parses free-form text from myRA AI admin panel to extract usage data
 *
 * Expected format:
 * Conversation Title
 * myRA AI
 * [Optional: Sub-title]
 * User Name
 * Date, Time
 * $Cost
 *
 * Example:
 * European Specialty Fats
 * myRA AI
 * Oli vegetali (applicazione)
 * Lucia Campesan
 * Jan 23, Fri, 09:09 PM
 * $24.55
 */

export interface ParsedUsageEntry {
  conversation_title: string;
  subtitle: string | null;
  user_name: string;
  timestamp: Date;
  cost: number;
  raw_text: string;
}

export interface ParseResult {
  entries: ParsedUsageEntry[];
  errors: string[];
  summary: {
    totalParsed: number;
    totalCost: number;
    uniqueUsers: number;
    dateRange: {
      earliest: Date | null;
      latest: Date | null;
    };
  };
}

/**
 * Parse the cost string (e.g., "$24.55")
 */
function parseCost(costStr: string): number | null {
  const match = costStr.match(/\$?([\d,]+\.?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(',', ''));
  }
  return null;
}

/**
 * Parse date/time string (e.g., "Jan 23, Fri, 09:09 PM")
 */
function parseDateTime(dateStr: string): Date | null {
  // Try "Jan 23, Fri, 09:09 PM" format
  const match = dateStr.match(
    /(\w{3})\s+(\d{1,2}),?\s*(?:\w{3},?)?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i
  );

  if (match) {
    const [, month, day, hours, minutes, period] = match;
    const year = new Date().getFullYear();

    // Convert month abbreviation to number
    const monthMap: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };

    const monthNum = monthMap[month];
    if (monthNum === undefined) return null;

    let hour = parseInt(hours, 10);
    if (period) {
      if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
    }

    const date = new Date(year, monthNum, parseInt(day, 10), hour, parseInt(minutes, 10));

    // If the date is in the future, assume it's from last year
    if (date > new Date()) {
      date.setFullYear(year - 1);
    }

    return date;
  }

  return null;
}

/**
 * Check if a line looks like a cost line
 */
function isCostLine(line: string): boolean {
  return /^\$[\d,]+\.?\d*$/.test(line.trim());
}

/**
 * Check if a line looks like a date/time line
 */
function isDateLine(line: string): boolean {
  return /\w{3}\s+\d{1,2}.*\d{1,2}:\d{2}/.test(line);
}

/**
 * Check if a line is the "myRA AI" marker
 */
function isMyraMarker(line: string): boolean {
  return line.trim().toLowerCase() === 'myra ai';
}

/**
 * Parse the raw text input into usage entries
 */
export function parseMyraUsageText(text: string): ParseResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const entries: ParsedUsageEntry[] = [];
  const errors: string[] = [];

  let i = 0;

  while (i < lines.length) {
    // Look for a conversation block pattern
    // Title → "myRA AI" → [Optional subtitle] → User Name → Date → Cost

    const startIndex = i;
    let title = '';
    let subtitle: string | null = null;
    let userName = '';
    let dateStr = '';
    let costStr = '';

    // First line should be the title
    if (isMyraMarker(lines[i]) || isDateLine(lines[i]) || isCostLine(lines[i])) {
      i++;
      continue; // Skip orphan markers
    }

    title = lines[i];
    i++;

    // Look for "myRA AI" marker
    if (i < lines.length && isMyraMarker(lines[i])) {
      i++;
    }

    // Check if next line is another title/subtitle (not date, not cost)
    if (
      i < lines.length &&
      !isDateLine(lines[i]) &&
      !isCostLine(lines[i]) &&
      !isMyraMarker(lines[i])
    ) {
      // Could be subtitle or user name
      // Look ahead to determine
      let lookAhead = i + 1;
      while (
        lookAhead < lines.length &&
        !isDateLine(lines[lookAhead]) &&
        !isCostLine(lines[lookAhead]) &&
        !isMyraMarker(lines[lookAhead])
      ) {
        lookAhead++;
      }

      // If we have 2+ non-special lines before the date, first is subtitle
      const nonSpecialCount = lookAhead - i;
      if (nonSpecialCount >= 2) {
        subtitle = lines[i];
        i++;
        userName = lines[i];
        i++;
      } else if (nonSpecialCount === 1) {
        userName = lines[i];
        i++;
      }
    }

    // Look for date line
    if (i < lines.length && isDateLine(lines[i])) {
      dateStr = lines[i];
      i++;
    }

    // Look for cost line
    if (i < lines.length && isCostLine(lines[i])) {
      costStr = lines[i];
      i++;
    }

    // Validate we have minimum required fields
    if (title && userName && (dateStr || costStr)) {
      const parsedDate = parseDateTime(dateStr);
      const parsedCost = parseCost(costStr);

      if (parsedDate && parsedCost !== null) {
        entries.push({
          conversation_title: title,
          subtitle,
          user_name: userName,
          timestamp: parsedDate,
          cost: parsedCost,
          raw_text: lines.slice(startIndex, i).join('\n'),
        });
      } else {
        if (!parsedDate && dateStr) {
          errors.push(`Failed to parse date "${dateStr}" for "${title}"`);
        }
        if (parsedCost === null && costStr) {
          errors.push(`Failed to parse cost "${costStr}" for "${title}"`);
        }
      }
    }
  }

  // Calculate summary
  const uniqueUsers = new Set(entries.map((e) => e.user_name)).size;
  const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
  const timestamps = entries.map((e) => e.timestamp.getTime());

  return {
    entries,
    errors,
    summary: {
      totalParsed: entries.length,
      totalCost,
      uniqueUsers,
      dateRange: {
        earliest: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
        latest: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
      },
    },
  };
}

/**
 * Fuzzy match a user name against a list of known users
 */
export function fuzzyMatchUser(
  userName: string,
  knownUsers: Array<{ id: string; name: string; org_id: string; org_name: string }>
): {
  match: typeof knownUsers[0] | null;
  confidence: 'high' | 'low' | 'none';
} {
  const normalizedInput = userName.toLowerCase().trim();

  // Try exact match first
  const exactMatch = knownUsers.find(
    (u) => u.name.toLowerCase().trim() === normalizedInput
  );
  if (exactMatch) {
    return { match: exactMatch, confidence: 'high' };
  }

  // Try partial match (first name or last name)
  const inputParts = normalizedInput.split(/\s+/);
  const partialMatches = knownUsers.filter((u) => {
    const nameParts = u.name.toLowerCase().split(/\s+/);
    return inputParts.some((ip) =>
      nameParts.some((np) => np === ip || np.startsWith(ip) || ip.startsWith(np))
    );
  });

  if (partialMatches.length === 1) {
    return { match: partialMatches[0], confidence: 'low' };
  }

  return { match: null, confidence: 'none' };
}

/**
 * Aggregate usage entries by user
 */
export function aggregateByUser(entries: ParsedUsageEntry[]): Array<{
  user_name: string;
  conversation_count: number;
  total_cost: number;
  first_usage: Date;
  last_usage: Date;
}> {
  const byUser = new Map<
    string,
    { count: number; cost: number; dates: Date[] }
  >();

  entries.forEach((entry) => {
    const existing = byUser.get(entry.user_name) || {
      count: 0,
      cost: 0,
      dates: [],
    };
    existing.count++;
    existing.cost += entry.cost;
    existing.dates.push(entry.timestamp);
    byUser.set(entry.user_name, existing);
  });

  return Array.from(byUser.entries()).map(([user_name, data]) => ({
    user_name,
    conversation_count: data.count,
    total_cost: data.cost,
    first_usage: new Date(Math.min(...data.dates.map((d) => d.getTime()))),
    last_usage: new Date(Math.max(...data.dates.map((d) => d.getTime()))),
  }));
}

/**
 * Aggregate usage entries by date
 */
export function aggregateByDate(entries: ParsedUsageEntry[]): Array<{
  date: string;
  conversation_count: number;
  total_cost: number;
  unique_users: number;
}> {
  const byDate = new Map<
    string,
    { count: number; cost: number; users: Set<string> }
  >();

  entries.forEach((entry) => {
    const dateKey = entry.timestamp.toISOString().split('T')[0];
    const existing = byDate.get(dateKey) || {
      count: 0,
      cost: 0,
      users: new Set(),
    };
    existing.count++;
    existing.cost += entry.cost;
    existing.users.add(entry.user_name);
    byDate.set(dateKey, existing);
  });

  return Array.from(byDate.entries())
    .map(([date, data]) => ({
      date,
      conversation_count: data.count,
      total_cost: data.cost,
      unique_users: data.users.size,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
