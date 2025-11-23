// CSV Validation and Standardization
// Validates CSV rows and ensures data quality before AI processing

import {
  CSVRow,
  CSVParseError,
  ValidationResult,
  ValidationRule,
} from './types';

// ============================================================================
// VALIDATION RULES
// ============================================================================

const VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'org_name',
    required: true,
    validator: (value: string) => value && value.trim().length > 0,
    errorMessage: 'Organization name is required',
  },
  {
    field: 'user_email',
    required: true,
    validator: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    errorMessage: 'Valid email address is required',
  },
  {
    field: 'user_name',
    required: true,
    validator: (value: string) => value && value.trim().length > 0,
    errorMessage: 'User name is required',
  },
  {
    field: 'query_text',
    required: true,
    validator: (value: string) => value && value.trim().length >= 10,
    errorMessage: 'Query text must be at least 10 characters',
  },
  {
    field: 'executed_at',
    required: true,
    validator: (value: string) => {
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    errorMessage: 'Valid date is required (ISO format or common date formats)',
  },
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a single CSV row against all validation rules
 */
export function validateRow(row: CSVRow, rowNumber: number): CSVParseError[] {
  const errors: CSVParseError[] = [];

  for (const rule of VALIDATION_RULES) {
    const value = row[rule.field];

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        row: rowNumber,
        field: rule.field,
        message: rule.errorMessage,
        value: String(value || ''),
      });
      continue;
    }

    // Run custom validator if exists and field has value
    if (rule.validator && value !== undefined && value !== null && value !== '') {
      if (!rule.validator(value)) {
        errors.push({
          row: rowNumber,
          field: rule.field,
          message: rule.errorMessage,
          value: String(value),
        });
      }
    }
  }

  return errors;
}

/**
 * Validates all CSV rows
 */
export function validateCSV(rows: CSVRow[]): ValidationResult {
  const errors: CSVParseError[] = [];
  const warnings: CSVParseError[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1; // 1-based for user display
    const rowErrors = validateRow(row, rowNumber);
    errors.push(...rowErrors);

    // Check for warnings (optional fields that might benefit from AI)
    if (!row.category || row.category.trim() === '') {
      warnings.push({
        row: rowNumber,
        field: 'category',
        message: 'Category missing - will be auto-filled by AI',
      });
    }

    if (!row.query_topic || row.query_topic.trim() === '') {
      warnings.push({
        row: rowNumber,
        field: 'query_topic',
        message: 'Query topic missing - will be auto-filled by AI',
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// STANDARDIZATION FUNCTIONS
// ============================================================================

/**
 * Standardizes a CSV row by cleaning and formatting values
 */
export function standardizeRow(row: CSVRow): CSVRow {
  return {
    // Required fields - clean whitespace
    org_name: row.org_name?.trim() || '',
    user_email: row.user_email?.trim().toLowerCase() || '',
    user_name: row.user_name?.trim() || '',
    query_text: row.query_text?.trim() || '',
    executed_at: row.executed_at?.trim() || '',

    // Optional fields - preserve if exists, otherwise undefined
    category: row.category?.trim() || undefined,
    query_topic: row.query_topic?.trim() || undefined,
    cost_usd: standardizeCost(row.cost_usd),
    insight_title: row.insight_title?.trim() || undefined,
    status: row.status?.trim() || undefined,
  };
}

/**
 * Standardizes cost value to number
 */
function standardizeCost(cost: string | number | undefined): number | undefined {
  if (cost === undefined || cost === null || cost === '') {
    return undefined;
  }

  if (typeof cost === 'number') {
    return cost;
  }

  // Remove currency symbols and parse
  const cleaned = String(cost).replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Standardizes all CSV rows
 */
export function standardizeCSV(rows: CSVRow[]): CSVRow[] {
  return rows.map(standardizeRow);
}

// ============================================================================
// DATE PARSING HELPERS
// ============================================================================

/**
 * Parse various date formats into ISO string
 */
export function parseExecutedAt(dateStr: string): Date | null {
  // Try direct parsing first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try common formats
  const formats = [
    // MM/DD/YYYY HH:MM:SS
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD HH:MM:SS
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format.source.includes('YYYY-MM-DD')) {
        // ISO format
        date = new Date(dateStr);
      } else {
        // MM/DD/YYYY format
        const [, month, day, year, hour = '0', minute = '0', second = '0'] = match;
        date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      }

      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

/**
 * Remove duplicate rows based on query text and executed_at
 */
export function deduplicateRows(rows: CSVRow[]): {
  unique: CSVRow[];
  duplicates: Array<{ row: number; duplicate_of: number }>;
} {
  const seen = new Map<string, number>();
  const unique: CSVRow[] = [];
  const duplicates: Array<{ row: number; duplicate_of: number }> = [];

  rows.forEach((row, index) => {
    const key = `${row.user_email}|${row.query_text}|${row.executed_at}`;
    const existing = seen.get(key);

    if (existing !== undefined) {
      duplicates.push({
        row: index + 1,
        duplicate_of: existing + 1,
      });
    } else {
      seen.set(key, index);
      unique.push(row);
    }
  });

  return { unique, duplicates };
}

// ============================================================================
// CSV COLUMN MAPPING
// ============================================================================

/**
 * Maps various CSV column names to standard field names
 * Handles common variations in column naming
 */
export function mapColumnNames(headers: string[]): Map<string, keyof CSVRow> {
  const mapping = new Map<string, keyof CSVRow>();

  const columnMappings: Record<string, (keyof CSVRow)[]> = {
    org_name: ['org_name', 'organization', 'org', 'company', 'company_name'],
    user_email: ['user_email', 'email', 'user_mail', 'contact_email'],
    user_name: ['user_name', 'name', 'user', 'contact_name', 'full_name'],
    query_text: ['query_text', 'query', 'question', 'prompt', 'search'],
    executed_at: ['executed_at', 'timestamp', 'date', 'created_at', 'query_date'],
    category: ['category', 'type', 'query_type', 'category_name'],
    query_topic: ['query_topic', 'topic', 'subject', 'theme'],
    cost_usd: ['cost_usd', 'cost', 'price', 'amount'],
    insight_title: ['insight_title', 'title', 'summary', 'headline'],
    status: ['status', 'state', 'query_status'],
  };

  headers.forEach((header) => {
    const normalized = header.toLowerCase().trim();

    for (const [fieldName, variations] of Object.entries(columnMappings)) {
      if (variations.some((v) => normalized === v || normalized.includes(v))) {
        mapping.set(header, fieldName as keyof CSVRow);
        break;
      }
    }
  });

  return mapping;
}

/**
 * Check if all required columns are present
 */
export function validateColumns(headers: string[]): {
  valid: boolean;
  missing: string[];
  mapping: Map<string, keyof CSVRow>;
} {
  const mapping = mapColumnNames(headers);
  const requiredFields: (keyof CSVRow)[] = [
    'org_name',
    'user_email',
    'user_name',
    'query_text',
    'executed_at',
  ];

  const mappedFields = new Set(mapping.values());
  const missing = requiredFields.filter((field) => !mappedFields.has(field));

  return {
    valid: missing.length === 0,
    missing,
    mapping,
  };
}
