/**
 * CSV parser for platform queries
 * Handles both simple (Title,User,Date) and extended formats with auto-detection
 */

import { parseFlexibleDate } from './date-parser';

export interface ParsedQuery {
  query_topic: string;
  query_text: string;
  user_name: string;
  executed_at: string; // ISO date
  status?: 'success' | 'partial' | 'failed' | 'timeout';
  query_category?: string;
  observations?: string;
  confidence_score?: number;
  rawRow: string; // Original CSV row for debugging
  rowNumber: number; // Line number in CSV
}

export interface ParseResult {
  queries: ParsedQuery[];
  errors: Array<{ row: number; message: string; rawRow: string }>;
  format: 'simple' | 'extended' | 'unknown';
  totalRows: number;
  successfulRows: number;
}

/**
 * Detect CSV format based on headers or column count
 */
function detectFormat(firstRow: string[]): 'simple' | 'extended' | 'unknown' {
  if (firstRow.length === 0) return 'unknown';

  // Check for header row indicators
  const firstCell = firstRow[0].toLowerCase().trim();
  if (firstCell === 'title' || firstCell === 'query' || firstCell === 'topic') {
    // Has headers - detect based on column count
    if (firstRow.length === 3) return 'simple';
    if (firstRow.length >= 7) return 'extended';
    return 'unknown';
  }

  // No headers - detect based on column count and content
  if (firstRow.length === 3) {
    // Simple format: Title, User, Date
    return 'simple';
  } else if (firstRow.length >= 7) {
    // Extended format: Title, User, Date, Status, Category, Observations, Confidence
    return 'extended';
  }

  return 'unknown';
}

/**
 * Parse a CSV line respecting quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Check if a row is a header row
 */
function isHeaderRow(cells: string[]): boolean {
  if (cells.length === 0) return false;

  const firstCell = cells[0].toLowerCase().trim();
  const headerKeywords = ['title', 'topic', 'query', 'name', 'user'];

  return headerKeywords.some(keyword => firstCell.includes(keyword));
}

/**
 * Parse simple format CSV (Title, User, Date)
 */
function parseSimpleFormat(cells: string[], rowNumber: number, rawRow: string): ParsedQuery | { error: string } {
  if (cells.length < 3) {
    return { error: `Expected 3 columns (Title, User, Date), got ${cells.length}` };
  }

  const [title, user, date] = cells.map(c => c.trim());

  if (!title) {
    return { error: 'Title is required' };
  }

  if (!user) {
    return { error: 'User name is required' };
  }

  if (!date) {
    return { error: 'Date is required' };
  }

  try {
    const executedAt = parseFlexibleDate(date);

    return {
      query_topic: title,
      query_text: title, // Default: query_text = query_topic
      user_name: user,
      executed_at: executedAt,
      status: 'success', // Default status
      rawRow,
      rowNumber,
    };
  } catch (dateError) {
    return { error: `Invalid date "${date}": ${dateError instanceof Error ? dateError.message : String(dateError)}` };
  }
}

/**
 * Parse extended format CSV (Title, User, Date, Status, Category, Observations, Confidence)
 */
function parseExtendedFormat(cells: string[], rowNumber: number, rawRow: string): ParsedQuery | { error: string } {
  if (cells.length < 3) {
    return { error: `Expected at least 3 columns, got ${cells.length}` };
  }

  const [title, user, date, status, category, observations, confidenceStr] = cells.map(c => c.trim());

  if (!title) {
    return { error: 'Title is required' };
  }

  if (!user) {
    return { error: 'User name is required' };
  }

  if (!date) {
    return { error: 'Date is required' };
  }

  try {
    const executedAt = parseFlexibleDate(date);

    const query: ParsedQuery = {
      query_topic: title,
      query_text: title, // Default: query_text = query_topic
      user_name: user,
      executed_at: executedAt,
      rawRow,
      rowNumber,
    };

    // Optional: status
    if (status) {
      const normalizedStatus = status.toLowerCase();
      if (['success', 'partial', 'failed', 'timeout'].includes(normalizedStatus)) {
        query.status = normalizedStatus as ParsedQuery['status'];
      } else {
        return { error: `Invalid status "${status}". Must be: success, partial, failed, or timeout` };
      }
    } else {
      query.status = 'success'; // Default
    }

    // Optional: category
    if (category) {
      query.query_category = category;
    }

    // Optional: observations
    if (observations) {
      query.observations = observations;
    }

    // Optional: confidence score
    if (confidenceStr) {
      const confidence = parseFloat(confidenceStr);
      if (isNaN(confidence)) {
        return { error: `Invalid confidence score "${confidenceStr}". Must be a number between 0-100` };
      }
      if (confidence < 0 || confidence > 100) {
        return { error: `Confidence score must be between 0-100, got ${confidence}` };
      }
      query.confidence_score = confidence;
    }

    return query;
  } catch (dateError) {
    return { error: `Invalid date "${date}": ${dateError instanceof Error ? dateError.message : String(dateError)}` };
  }
}

/**
 * Main CSV parser for platform queries
 * Auto-detects format and parses accordingly
 *
 * @param csvText - Raw CSV text to parse
 * @returns ParseResult with parsed queries and any errors
 */
export function parseQueryCSV(csvText: string): ParseResult {
  const lines = csvText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return {
      queries: [],
      errors: [],
      format: 'unknown',
      totalRows: 0,
      successfulRows: 0,
    };
  }

  const queries: ParsedQuery[] = [];
  const errors: Array<{ row: number; message: string; rawRow: string }> = [];

  // Parse first line to detect format
  const firstLine = parseCSVLine(lines[0]);
  const format = detectFormat(firstLine);

  if (format === 'unknown') {
    return {
      queries: [],
      errors: [{
        row: 1,
        message: `Unable to detect CSV format. Expected 3 columns (Title,User,Date) or 7+ columns for extended format. Got ${firstLine.length} columns.`,
        rawRow: lines[0]
      }],
      format: 'unknown',
      totalRows: lines.length,
      successfulRows: 0,
    };
  }

  // Determine if first row is a header
  const hasHeader = isHeaderRow(firstLine);
  const startRow = hasHeader ? 1 : 0;

  // Parse data rows
  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i];
    const cells = parseCSVLine(line);
    const rowNumber = i + 1; // 1-indexed for user display

    // Skip empty rows
    if (cells.length === 1 && cells[0] === '') {
      continue;
    }

    let result;
    if (format === 'simple') {
      result = parseSimpleFormat(cells, rowNumber, line);
    } else {
      result = parseExtendedFormat(cells, rowNumber, line);
    }

    if ('error' in result) {
      errors.push({
        row: rowNumber,
        message: result.error,
        rawRow: line,
      });
    } else {
      queries.push(result);
    }
  }

  return {
    queries,
    errors,
    format,
    totalRows: lines.length - (hasHeader ? 1 : 0),
    successfulRows: queries.length,
  };
}

/**
 * Validate that a query has all required fields
 */
export function validateQuery(query: ParsedQuery): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!query.query_topic || query.query_topic.trim().length === 0) {
    errors.push('Query topic is required');
  }

  if (!query.query_text || query.query_text.trim().length === 0) {
    errors.push('Query text is required');
  }

  if (!query.user_name || query.user_name.trim().length === 0) {
    errors.push('User name is required');
  }

  if (!query.executed_at) {
    errors.push('Execution date is required');
  } else {
    // Validate ISO date format
    const date = new Date(query.executed_at);
    if (isNaN(date.getTime())) {
      errors.push('Invalid execution date format');
    }
  }

  if (query.status && !['success', 'partial', 'failed', 'timeout'].includes(query.status)) {
    errors.push('Invalid status value');
  }

  if (query.confidence_score !== undefined) {
    if (typeof query.confidence_score !== 'number' || query.confidence_score < 0 || query.confidence_score > 100) {
      errors.push('Confidence score must be between 0-100');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
