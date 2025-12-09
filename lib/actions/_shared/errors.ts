/**
 * Error Transformation Utilities
 * Transform cryptic DB errors to user-friendly messages with suggestions
 */

import type { z } from 'zod';
import type { ActionError, ActionErrorCode } from './types';

// ============ POSTGRESQL ERROR CODES ============
// Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html

const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  INVALID_TEXT_REPRESENTATION: '22P02',
} as const;

// ============ ERROR CONTEXT SUGGESTIONS ============
// Context-specific suggestions for better UX

const CONTEXT_SUGGESTIONS: Record<string, Record<ActionErrorCode, string>> = {
  org: {
    DUPLICATE_ENTRY: 'Try a different organization name or check if this organization already exists.',
    NOT_FOUND: 'The organization may have been deleted. Try refreshing the page.',
    VALIDATION_ERROR: 'Please check the organization details and try again.',
    PERMISSION_DENIED: 'You may not have access to this organization.',
    DATABASE_ERROR: 'Unable to save organization. Please try again.',
    TRANSACTION_FAILED: 'Some changes could not be saved. Please try again.',
    UNDO_EXPIRED: 'The undo window for this operation has passed.',
    ALREADY_UNDONE: 'This action has already been undone.',
    INVALID_STATE: 'The organization is not in a valid state for this operation.',
    RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  },
  user: {
    DUPLICATE_ENTRY: 'A user with this email already exists in the system.',
    NOT_FOUND: 'The user may have been deleted. Try refreshing the page.',
    VALIDATION_ERROR: 'Please check the user details and try again.',
    PERMISSION_DENIED: 'You may not have access to modify this user.',
    DATABASE_ERROR: 'Unable to save user. Please try again.',
    TRANSACTION_FAILED: 'Some changes could not be saved. Please try again.',
    UNDO_EXPIRED: 'The undo window for this operation has passed.',
    ALREADY_UNDONE: 'This action has already been undone.',
    INVALID_STATE: 'The user is not in a valid state for this operation.',
    RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  },
  ticket: {
    DUPLICATE_ENTRY: 'A similar ticket may already exist.',
    NOT_FOUND: 'The ticket may have been deleted or resolved.',
    VALIDATION_ERROR: 'Please check the ticket details and try again.',
    PERMISSION_DENIED: 'You may not have access to this ticket.',
    DATABASE_ERROR: 'Unable to save ticket. Please try again.',
    TRANSACTION_FAILED: 'Some changes could not be saved. Please try again.',
    UNDO_EXPIRED: 'The undo window for this operation has passed.',
    ALREADY_UNDONE: 'This action has already been undone.',
    INVALID_STATE: 'The ticket is not in a valid state for this operation.',
    RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  },
  default: {
    DUPLICATE_ENTRY: 'This record already exists. Try using different values.',
    NOT_FOUND: 'The referenced record was not found. It may have been deleted.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    PERMISSION_DENIED: 'You do not have permission to perform this action.',
    DATABASE_ERROR: 'Unable to save changes. Please try again.',
    TRANSACTION_FAILED: 'Some changes could not be saved. Please try again.',
    UNDO_EXPIRED: 'The undo window for this operation has passed.',
    ALREADY_UNDONE: 'This action has already been undone.',
    INVALID_STATE: 'The record is not in a valid state for this operation.',
    RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  },
};

// ============ DATABASE ERROR TRANSFORMATION ============

/**
 * Transform a Supabase/PostgreSQL error to a user-friendly ActionError
 * @param error - Raw error from Supabase
 * @param context - Optional context for better suggestions (e.g., 'org', 'user', 'ticket')
 * @returns User-friendly ActionError
 */
export function transformDbError(
  error: any,
  context?: string
): ActionError {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code || '';
  const details = error?.details || '';
  const hint = error?.hint || '';

  // Get context-specific suggestions
  const suggestions = CONTEXT_SUGGESTIONS[context || 'default'] || CONTEXT_SUGGESTIONS.default;

  // Unique constraint violation (duplicate entry)
  if (code === PG_ERROR_CODES.UNIQUE_VIOLATION || message.includes('duplicate')) {
    const field = extractFieldFromError(message, details);
    return {
      code: 'DUPLICATE_ENTRY',
      message: 'This record already exists',
      suggestion: suggestions.DUPLICATE_ENTRY,
      field,
      technical: `PostgreSQL ${code}: ${message}`,
    };
  }

  // Foreign key violation (referenced record not found)
  if (code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION || message.includes('foreign key')) {
    return {
      code: 'NOT_FOUND',
      message: 'Referenced record not found',
      suggestion: suggestions.NOT_FOUND,
      technical: `PostgreSQL ${code}: ${message}`,
    };
  }

  // Not null violation (required field missing)
  if (code === PG_ERROR_CODES.NOT_NULL_VIOLATION || message.includes('not-null')) {
    const field = extractFieldFromError(message, details);
    return {
      code: 'VALIDATION_ERROR',
      message: field ? `${formatFieldName(field)} is required` : 'A required field is missing',
      suggestion: 'Please fill in all required fields.',
      field,
      technical: `PostgreSQL ${code}: ${message}`,
    };
  }

  // Check constraint violation
  if (code === PG_ERROR_CODES.CHECK_VIOLATION || message.includes('check constraint')) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Invalid value provided',
      suggestion: hint || 'Please check the allowed values and try again.',
      technical: `PostgreSQL ${code}: ${message}`,
    };
  }

  // Invalid text representation (type casting error)
  if (code === PG_ERROR_CODES.INVALID_TEXT_REPRESENTATION) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Invalid format',
      suggestion: 'Please check the format of your input.',
      technical: `PostgreSQL ${code}: ${message}`,
    };
  }

  // Permission/RLS errors
  if (
    message.includes('permission denied') ||
    message.includes('rls') ||
    message.includes('policy')
  ) {
    return {
      code: 'PERMISSION_DENIED',
      message: 'You do not have permission to perform this action',
      suggestion: suggestions.PERMISSION_DENIED,
      technical: `RLS/Permission: ${message}`,
    };
  }

  // Connection/timeout errors
  if (
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('network')
  ) {
    return {
      code: 'DATABASE_ERROR',
      message: 'Connection error',
      suggestion: 'Please check your internet connection and try again.',
      technical: `Connection: ${message}`,
    };
  }

  // Generic database error fallback
  return {
    code: 'DATABASE_ERROR',
    message: 'Unable to save changes',
    suggestion: suggestions.DATABASE_ERROR,
    technical: `DB Error: ${code ? `[${code}] ` : ''}${message}`,
  };
}

// ============ VALIDATION ERROR TRANSFORMATION ============

/**
 * Transform a Zod validation error to a user-friendly ActionError
 * @param zodError - Zod validation error
 * @returns User-friendly ActionError
 */
export function validationError(zodError: z.ZodError): ActionError {
  const issue = zodError.issues[0] as any;
  const field = issue?.path?.join('.');

  // Generate user-friendly message based on error type
  let message = issue?.message || 'Invalid input';

  // Enhance message for common Zod error codes
  const code = issue?.code;

  if (code === 'too_small') {
    const min = issue?.minimum;
    const issueType = issue?.type;
    if (issueType === 'string') {
      message = `${formatFieldName(field)} must be at least ${min} characters`;
    } else if (issueType === 'number') {
      message = `${formatFieldName(field)} must be at least ${min}`;
    }
  } else if (code === 'too_big') {
    const max = issue?.maximum;
    const issueType = issue?.type;
    if (issueType === 'string') {
      message = `${formatFieldName(field)} must be at most ${max} characters`;
    } else if (issueType === 'number') {
      message = `${formatFieldName(field)} must be at most ${max}`;
    }
  } else if (code === 'invalid_type') {
    const expected = issue?.expected;
    message = `${formatFieldName(field)} must be a ${expected}`;
  } else if (code === 'invalid_string' || code === 'invalid_format') {
    const validation = issue?.validation || issue?.format;
    if (validation === 'email') {
      message = 'Please enter a valid email address';
    } else if (validation === 'url') {
      message = 'Please enter a valid URL';
    } else if (validation === 'uuid') {
      message = 'Invalid identifier format';
    }
  }

  return {
    code: 'VALIDATION_ERROR',
    message,
    field,
    suggestion: 'Please check your input and try again.',
    technical: `Zod: ${JSON.stringify(zodError.issues)}`,
  };
}

/**
 * Create a validation error from a field and message
 * Useful for custom validation logic
 */
export function fieldError(field: string, message: string): ActionError {
  return {
    code: 'VALIDATION_ERROR',
    message,
    field,
    suggestion: 'Please correct the field and try again.',
  };
}

// ============ ERROR FACTORIES ============

/**
 * Create a NOT_FOUND error
 */
export function notFoundError(
  entityType: string,
  identifier?: string
): ActionError {
  return {
    code: 'NOT_FOUND',
    message: identifier
      ? `${entityType} "${identifier}" not found`
      : `${entityType} not found`,
    suggestion: `The ${entityType.toLowerCase()} may have been deleted or you may not have access to it.`,
  };
}

/**
 * Create a PERMISSION_DENIED error
 */
export function permissionError(action?: string): ActionError {
  return {
    code: 'PERMISSION_DENIED',
    message: action
      ? `You do not have permission to ${action}`
      : 'You do not have permission to perform this action',
    suggestion: 'Contact your administrator if you believe this is an error.',
  };
}

/**
 * Create an INVALID_STATE error
 */
export function invalidStateError(
  entityType: string,
  currentState: string,
  requiredState?: string
): ActionError {
  return {
    code: 'INVALID_STATE',
    message: requiredState
      ? `${entityType} must be in "${requiredState}" state, but is currently "${currentState}"`
      : `${entityType} is in invalid state: ${currentState}`,
    suggestion: `Check the ${entityType.toLowerCase()}'s current status and try again.`,
  };
}

/**
 * Create an UNDO_EXPIRED error
 */
export function undoExpiredError(): ActionError {
  return {
    code: 'UNDO_EXPIRED',
    message: 'The undo window has expired',
    suggestion: 'Actions can only be undone within 5 minutes of execution.',
  };
}

/**
 * Create an ALREADY_UNDONE error
 */
export function alreadyUndoneError(): ActionError {
  return {
    code: 'ALREADY_UNDONE',
    message: 'This action has already been undone',
    suggestion: 'No further action is needed.',
  };
}

/**
 * Create a RATE_LIMITED error
 */
export function rateLimitedError(retryAfter?: number): ActionError {
  return {
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    suggestion: retryAfter
      ? `Please wait ${retryAfter} seconds and try again.`
      : 'Please wait a moment and try again.',
  };
}

// ============ HELPER FUNCTIONS ============

/**
 * Extract field name from error message/details
 */
function extractFieldFromError(message: string, details: string): string | undefined {
  // Try to extract column name from various error formats
  const patterns = [
    /column "([^"]+)"/,
    /field "([^"]+)"/,
    /Key \(([^)]+)\)/,
    /violates.*constraint.*"([^"]+)"/,
  ];

  const combined = `${message} ${details}`;
  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Format field name for display (snake_case -> Title Case)
 */
function formatFieldName(field?: string): string {
  if (!field) return 'Field';

  return field
    .split(/[._]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ============ ERROR RESULT HELPER ============

/**
 * Create a failed ActionResult from an ActionError
 * Convenience function for action modules
 */
export function failedResult(
  error: ActionError,
  summary?: string
): {
  success: false;
  changes: never[];
  summary: string;
  error: ActionError;
} {
  return {
    success: false,
    changes: [],
    summary: summary || error.message,
    error,
  };
}
