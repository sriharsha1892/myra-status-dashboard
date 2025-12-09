/**
 * Shared Validation Library for Bulk Imports
 *
 * Consolidates validation logic used across all import tools:
 * - Timeline Events (AI & Legacy)
 * - Feature Requests
 * - Trial Users
 * - Smart Import
 * - Excel Organizations
 * - Interactive CLI
 *
 * Benefits:
 * - Single source of truth for validation rules
 * - Consistent error messages
 * - Easy to update validation logic
 * - Reusable across all imports
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FieldValidation {
  field: string;
  value: any;
  rules: ValidationRule[];
}

export type ValidationRule =
  | { type: 'required' }
  | { type: 'email' }
  | { type: 'url' }
  | { type: 'date' }
  | { type: 'enum'; allowed: string[] }
  | { type: 'minLength'; min: number }
  | { type: 'maxLength'; max: number }
  | { type: 'pattern'; regex: RegExp; message?: string }
  | { type: 'custom'; validator: (value: any) => boolean; message: string };

// =====================================================
// EMAIL VALIDATION
// =====================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email format
 * Used in: Users Import, Smart Import, Excel Import
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates and normalizes email
 * Returns normalized email or null if invalid
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return isValidEmail(trimmed) ? trimmed : null;
}

// =====================================================
// URL VALIDATION
// =====================================================

const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

/**
 * Validates URL format
 * Used in: Excel Import, Smart Import
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return URL_REGEX.test(url);
  } catch {
    return false;
  }
}

/**
 * Normalizes URL by ensuring protocol and cleaning up
 * Returns normalized URL or null if invalid
 */
export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  let trimmed = url.trim();

  // Add protocol if missing
  if (!trimmed.match(/^https?:\/\//)) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const urlObj = new URL(trimmed);
    // Remove trailing slash
    let normalized = urlObj.toString();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return null;
  }
}

// =====================================================
// DATE VALIDATION
// =====================================================

/**
 * Parses various date formats
 * Used in: Timeline Import, Excel Import, Smart Import
 *
 * Supports:
 * - ISO 8601 (2025-01-20)
 * - US format (1/20/2025)
 * - Excel serial dates
 * - Relative dates (yesterday, last week, etc.)
 */
export function parseFlexibleDate(input: string | number | null | undefined): Date | null {
  if (!input) return null;

  // Handle Excel serial dates
  if (typeof input === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + input * 86400000);
    return isValidDate(date) ? date : null;
  }

  if (typeof input !== 'string') return null;

  const trimmed = input.trim();

  // Try standard Date parsing first
  const parsed = new Date(trimmed);
  if (isValidDate(parsed)) return parsed;

  // Handle relative dates
  const relative = parseRelativeDate(trimmed);
  if (relative) return relative;

  return null;
}

/**
 * Checks if a Date object is valid
 */
export function isValidDate(date: Date | null | undefined): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Parses relative date strings
 * Examples: "yesterday", "last week", "2 days ago"
 */
function parseRelativeDate(input: string): Date | null {
  const now = new Date();
  const lower = input.toLowerCase();

  // Today/Yesterday/Tomorrow
  if (lower === 'today') return now;
  if (lower === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return yesterday;
  }
  if (lower === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow;
  }

  // "N days/weeks/months ago" pattern
  const agoMatch = lower.match(/(\d+)\s+(day|week|month|year)s?\s+ago/);
  if (agoMatch) {
    const [, amount, unit] = agoMatch;
    const num = parseInt(amount);
    const date = new Date(now);

    switch (unit) {
      case 'day':
        date.setDate(date.getDate() - num);
        break;
      case 'week':
        date.setDate(date.getDate() - num * 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - num);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - num);
        break;
    }

    return date;
  }

  return null;
}

// =====================================================
// REQUIRED FIELD VALIDATION
// =====================================================

/**
 * Checks if a value is present and non-empty
 * Used in: All import tools
 */
export function isRequired(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

// =====================================================
// ENUM VALIDATION
// =====================================================

/**
 * Validates that a value is in an allowed set
 * Used in: Feature Requests (priority), Timeline (status), Users (role)
 */
export function isValidEnum(
  value: string | null | undefined,
  allowed: string[],
  caseSensitive: boolean = false
): boolean {
  if (!value) return false;

  if (caseSensitive) {
    return allowed.includes(value);
  } else {
    const lowerValue = value.toLowerCase();
    return allowed.some(a => a.toLowerCase() === lowerValue);
  }
}

/**
 * Normalizes enum value to match allowed values
 * Returns normalized value or null if not found
 */
export function normalizeEnum(
  value: string | null | undefined,
  allowed: string[],
  defaultValue?: string
): string | null {
  if (!value) return defaultValue || null;

  const lowerValue = value.toLowerCase();
  const found = allowed.find(a => a.toLowerCase() === lowerValue);

  return found || defaultValue || null;
}

// =====================================================
// STRING VALIDATION
// =====================================================

/**
 * Validates string length
 */
export function isValidLength(
  value: string | null | undefined,
  min?: number,
  max?: number
): boolean {
  if (!value) return min === undefined || min === 0;

  const length = value.trim().length;

  if (min !== undefined && length < min) return false;
  if (max !== undefined && length > max) return false;

  return true;
}

/**
 * Validates against a regex pattern
 */
export function matchesPattern(
  value: string | null | undefined,
  pattern: RegExp
): boolean {
  if (!value) return false;
  return pattern.test(value);
}

// =====================================================
// COMPOSITE VALIDATOR
// =====================================================

/**
 * Validates a field against multiple rules
 * Returns detailed validation result with all errors/warnings
 */
export function validateField(
  field: string,
  value: any,
  rules: ValidationRule[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        if (!isRequired(value)) {
          errors.push(`${field} is required`);
        }
        break;

      case 'email':
        if (value && !isValidEmail(value)) {
          errors.push(`${field} must be a valid email address`);
        }
        break;

      case 'url':
        if (value && !isValidUrl(value)) {
          errors.push(`${field} must be a valid URL`);
        }
        break;

      case 'date':
        if (value && !parseFlexibleDate(value)) {
          errors.push(`${field} must be a valid date`);
        }
        break;

      case 'enum':
        if (value && !isValidEnum(value, rule.allowed)) {
          errors.push(`${field} must be one of: ${rule.allowed.join(', ')}`);
        }
        break;

      case 'minLength':
        if (value && !isValidLength(value, rule.min, undefined)) {
          errors.push(`${field} must be at least ${rule.min} characters`);
        }
        break;

      case 'maxLength':
        if (value && !isValidLength(value, undefined, rule.max)) {
          errors.push(`${field} must be at most ${rule.max} characters`);
        }
        break;

      case 'pattern':
        if (value && !matchesPattern(value, rule.regex)) {
          errors.push(rule.message || `${field} has invalid format`);
        }
        break;

      case 'custom':
        if (value && !rule.validator(value)) {
          errors.push(rule.message);
        }
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates multiple fields at once
 * Returns combined validation result
 */
export function validateFields(
  validations: FieldValidation[]
): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const validation of validations) {
    const result = validateField(
      validation.field,
      validation.value,
      validation.rules
    );

    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

// =====================================================
// DOMAIN-SPECIFIC VALIDATORS
// =====================================================

/**
 * Validates priority values used in Feature Requests and Roadmap
 */
export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = typeof PRIORITIES[number];

export function isValidPriority(priority: string | null | undefined): boolean {
  return isValidEnum(priority, PRIORITIES as unknown as string[]);
}

export function normalizePriority(priority: string | null | undefined, defaultValue: Priority = 'medium'): Priority {
  return (normalizeEnum(priority, PRIORITIES as unknown as string[], defaultValue) as Priority) || defaultValue;
}

/**
 * Validates status values used in Roadmap
 */
export const STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
export type Status = typeof STATUSES[number];

export function isValidStatus(status: string | null | undefined): boolean {
  return isValidEnum(status, STATUSES as unknown as string[]);
}

export function normalizeStatus(status: string | null | undefined, defaultValue: Status = 'planned'): Status {
  return (normalizeEnum(status, STATUSES as unknown as string[], defaultValue) as Status) || defaultValue;
}

/**
 * Validates role values used in Users Import
 */
export const ROLES = ['Admin', 'Manager', 'Developer', 'User', 'Analyst', 'Designer'] as const;
export type Role = typeof ROLES[number];

export function isValidRole(role: string | null | undefined): boolean {
  return isValidEnum(role, ROLES as unknown as string[]);
}

export function normalizeRole(role: string | null | undefined, defaultValue: Role = 'User'): Role {
  return (normalizeEnum(role, ROLES as unknown as string[], defaultValue) as Role) || defaultValue;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Sanitizes input by removing dangerous characters
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
}

/**
 * Extracts name from email (common pattern in imports)
 * Example: john.doe@company.com → John Doe
 */
export function extractNameFromEmail(email: string | null | undefined): string | null {
  if (!email || !isValidEmail(email)) return null;

  const username = email.split('@')[0];

  // Convert john.doe or john_doe to John Doe
  const name = username
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return name;
}

/**
 * Batch validates an array of records
 * Returns validation results per record
 */
export function validateBatch<T>(
  records: T[],
  validator: (record: T, index: number) => ValidationResult
): {
  validRecords: T[];
  invalidRecords: Array<{ record: T; index: number; errors: string[] }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
} {
  const validRecords: T[] = [];
  const invalidRecords: Array<{ record: T; index: number; errors: string[] }> = [];

  records.forEach((record, index) => {
    const result = validator(record, index);

    if (result.isValid) {
      validRecords.push(record);
    } else {
      invalidRecords.push({
        record,
        index,
        errors: result.errors
      });
    }
  });

  return {
    validRecords,
    invalidRecords,
    summary: {
      total: records.length,
      valid: validRecords.length,
      invalid: invalidRecords.length
    }
  };
}
