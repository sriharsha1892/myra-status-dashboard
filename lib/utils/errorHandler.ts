/**
 * Error Handling Utility
 * Provides graceful error handling with detailed logging and user-friendly messages
 */

import toast from 'react-hot-toast';

interface ErrorDetails {
  message?: string;
  code?: string;
  details?: any;
  hint?: string;
  [key: string]: any;
}

interface ErrorHandlerOptions {
  /**
   * Context for the error (e.g., 'fetching ticket', 'creating todo')
   */
  context?: string;
  /**
   * Whether to show a toast notification
   */
  showToast?: boolean;
  /**
   * Custom toast message (overrides default)
   */
  customToastMessage?: string;
  /**
   * Additional context data to log
   */
  additionalContext?: Record<string, any>;
  /**
   * Callback to execute after error handling
   */
  onError?: (error: any) => void;
}

/**
 * Extract structured error details from various error formats
 */
export function extractErrorDetails(error: any): ErrorDetails {
  if (!error) {
    return { message: 'Unknown error occurred' };
  }

  return {
    message: error?.message || error?.msg || error?.error || 'Unknown error',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    status: error?.status || error?.statusCode,
    ...error
  };
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(error: any, context?: string): string {
  const details = extractErrorDetails(error);
  const action = context || 'complete the action';

  // Handle Supabase-specific errors
  if (details.code) {
    // No rows returned (PGRST116)
    if (details.code === 'PGRST116') {
      return `The requested item was not found. It may have been deleted.`;
    }

    // Foreign key violation (23503)
    if (details.code === '23503') {
      return `Invalid reference. Please ensure all related items exist.`;
    }

    // Unique constraint violation (23505)
    if (details.code === '23505') {
      return `This item already exists.`;
    }

    // Not null violation (23502)
    if (details.code === '23502') {
      return `Missing required information. Please fill in all required fields.`;
    }

    // Row level security policy violation (42501 or policy-related)
    if (details.code === '42501' || details.code?.includes('policy')) {
      return `You don't have permission to ${action}.`;
    }
  }

  // Handle common error patterns in message
  if (details.message) {
    const msg = details.message.toLowerCase();

    if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
      return `This item already exists.`;
    }

    if (msg.includes('foreign key')) {
      return `Invalid selection. Please check your input.`;
    }

    if (msg.includes('permission') || msg.includes('policy') || msg.includes('unauthorized')) {
      return `You don't have permission to ${action}.`;
    }

    if (msg.includes('not found') || msg.includes('no rows')) {
      return `The requested item was not found.`;
    }

    if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
      return `Network error. Please check your connection and try again.`;
    }

    if (msg.includes('required')) {
      return `Missing required information. Please fill in all required fields.`;
    }

    // Return the actual message if it seems user-friendly (not too technical)
    if (!msg.includes('sql') && !msg.includes('database') && msg.length < 100) {
      return details.message;
    }
  }

  // Fallback message
  return `Failed to ${action}. Please try again.`;
}

/**
 * Main error handler - logs detailed error info and shows user-friendly message
 */
export function handleError(error: any, options: ErrorHandlerOptions = {}): void {
  const {
    context = 'perform action',
    showToast = true,
    customToastMessage,
    additionalContext = {},
    onError
  } = options;

  // Extract and log detailed error information
  const errorDetails = extractErrorDetails(error);

  console.error(`Error ${context}:`, {
    ...errorDetails,
    ...additionalContext,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
  });

  // Show user-friendly toast message
  if (showToast) {
    const message = customToastMessage || getUserFriendlyMessage(error, context);
    toast.error(message);
  }

  // Execute callback if provided
  if (onError) {
    onError(error);
  }
}

/**
 * Async wrapper with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: ErrorHandlerOptions = {}
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, options);
    return null;
  }
}

/**
 * Check if an error is a specific type
 */
export function isErrorType(error: any, type: string): boolean {
  const details = extractErrorDetails(error);
  return (
    details.code === type ||
    details.message?.toLowerCase().includes(type.toLowerCase()) ||
    false
  );
}

/**
 * Check if error is permission-related
 */
export function isPermissionError(error: any): boolean {
  return (
    isErrorType(error, '42501') ||
    isErrorType(error, 'permission') ||
    isErrorType(error, 'unauthorized') ||
    isErrorType(error, 'policy')
  );
}

/**
 * Check if error is not-found
 */
export function isNotFoundError(error: any): boolean {
  return (
    isErrorType(error, 'PGRST116') ||
    isErrorType(error, 'not found') ||
    isErrorType(error, 'no rows')
  );
}

/**
 * Check if error is validation-related
 */
export function isValidationError(error: any): boolean {
  return (
    isErrorType(error, '23502') || // Not null
    isErrorType(error, '23505') || // Unique
    isErrorType(error, '23503') || // Foreign key
    isErrorType(error, 'required') ||
    isErrorType(error, 'validation')
  );
}
