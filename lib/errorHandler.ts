/**
 * Centralized Error Handler
 * Provides graceful, user-friendly error messages with support reporting
 */

import { enhancedToast } from './toast/manager';
import type { EnhancedToastOptions } from './toast/types';

export type ErrorContext =
  | 'trial_org_create'
  | 'trial_org_update'
  | 'user_create'
  | 'user_update'
  | 'note_create'
  | 'login'
  | 'api_call'
  | 'generic';

export interface ErrorDetails {
  message: string;
  suggestion?: string;
  technical?: string;
}

export interface ErrorReport {
  error_message: string;
  error_stack?: string;
  context: ErrorContext;
  user_email?: string;
  user_id?: string;
  page_url: string;
  timestamp: string;
  user_agent: string;
  additional_info?: Record<string, any>;
}

/**
 * Detect error type from error object or message
 */
function detectErrorType(error: any): string {
  const errorMessage = error?.message?.toLowerCase() || String(error).toLowerCase();
  const errorCode = error?.code?.toLowerCase() || '';

  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorCode === 'network_error') {
    return 'network';
  }

  // Auth errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('auth') || errorCode === 'unauthorized') {
    return 'auth';
  }

  // Duplicate/unique constraint violations
  if (errorMessage.includes('duplicate') || errorMessage.includes('unique') || errorMessage.includes('already exists')) {
    return 'duplicate';
  }

  // Validation errors
  if (errorMessage.includes('required') || errorMessage.includes('invalid') || errorMessage.includes('validation')) {
    return 'validation';
  }

  // Permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('forbidden') || errorCode === 'permission_denied') {
    return 'permission';
  }

  // Database errors
  if (errorMessage.includes('database') || errorMessage.includes('constraint') || errorMessage.includes('foreign key')) {
    return 'database';
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return 'timeout';
  }

  return 'unknown';
}

/**
 * Get humorous, context-aware error message
 */
export function getErrorMessage(error: any, context: ErrorContext = 'generic'): ErrorDetails {
  const errorType = detectErrorType(error);
  const technicalMessage = error?.message || String(error);

  // Network Errors
  if (errorType === 'network') {
    const messages = [
      {
        message: "Connection to server lost",
        suggestion: "Please check your internet connection and try again"
      },
      {
        message: "Network connection interrupted",
        suggestion: "Your internet connection appears unstable. Please check your connection and retry."
      },
      {
        message: "Unable to reach the server",
        suggestion: "We're having trouble connecting. Please verify your internet connection and try again."
      }
    ];
    const selected = messages[Math.floor(Math.random() * messages.length)];
    return { ...selected, technical: technicalMessage };
  }

  // Auth Errors
  if (errorType === 'auth') {
    const messages = [
      {
        message: "Session has expired",
        suggestion: "For security, please log in again to continue"
      },
      {
        message: "Authentication required",
        suggestion: "Please log in to access this page"
      },
      {
        message: "Login session ended",
        suggestion: "Your session has timed out. Please log in again."
      }
    ];
    const selected = messages[Math.floor(Math.random() * messages.length)];
    return { ...selected, technical: technicalMessage };
  }

  // Duplicate Errors
  if (errorType === 'duplicate') {
    const contextMessages: Record<ErrorContext, ErrorDetails> = {
      trial_org_create: {
        message: "Organization already exists",
        suggestion: "This organization name is already in use. Please choose a different name or check existing organizations.",
        technical: technicalMessage
      },
      user_create: {
        message: "Email address already registered",
        suggestion: "This email is already associated with an account. Please use a different email address.",
        technical: technicalMessage
      },
      note_create: {
        message: "Duplicate note detected",
        suggestion: "This note already exists in the system",
        technical: technicalMessage
      },
      generic: {
        message: "Duplicate entry found",
        suggestion: "This information already exists. Please use unique values.",
        technical: technicalMessage
      },
      trial_org_update: { message: "", technical: technicalMessage },
      user_update: { message: "", technical: technicalMessage },
      login: { message: "", technical: technicalMessage },
      api_call: { message: "", technical: technicalMessage }
    };

    return contextMessages[context] || contextMessages.generic;
  }

  // Validation Errors
  if (errorType === 'validation') {
    const messages = [
      {
        message: "Required fields incomplete",
        suggestion: "Please fill in all required fields before submitting"
      },
      {
        message: "Missing required information",
        suggestion: "Some required fields are empty. Please complete all fields marked as required."
      },
      {
        message: "Invalid input detected",
        suggestion: "Please check your entries and ensure all information is in the correct format"
      }
    ];
    const selected = messages[Math.floor(Math.random() * messages.length)];
    return { ...selected, technical: technicalMessage };
  }

  // Permission Errors
  if (errorType === 'permission') {
    const messages = [
      {
        message: "Access denied",
        suggestion: "You don't have permission for this action. Please contact your administrator or use the support chat below."
      },
      {
        message: "Insufficient permissions",
        suggestion: "This action requires additional privileges. Please contact your admin for access."
      }
    ];
    const selected = messages[Math.floor(Math.random() * messages.length)];
    return { ...selected, technical: technicalMessage };
  }

  // Database Errors - balanced professional tone with light humor
  if (errorType === 'database') {
    const messages = [
      {
        message: "Database connection interrupted",
        suggestion: "We're experiencing a temporary database issue. Please try again in a moment. If the problem continues, use the support chat in the bottom right corner."
      },
      {
        message: "Server processing error",
        suggestion: "Something went wrong while processing your request. Our team has been notified. Please try again or use the support widget for immediate assistance."
      },
      {
        message: "Temporary service disruption",
        suggestion: "We're having a brief technical hiccup. Please try again shortly. Need help? Click the chat bubble in the bottom right corner."
      },
      {
        message: "Request processing failed",
        suggestion: "We couldn't complete your request this time. Please retry, and if you continue to see this message, reach out via the support chat below."
      }
    ];
    const selected = messages[Math.floor(Math.random() * messages.length)];
    return { ...selected, technical: technicalMessage };
  }

  // Timeout Errors
  if (errorType === 'timeout') {
    return {
      message: "Request timed out",
      suggestion: "This is taking longer than expected. Please try again or use the support chat if the issue persists.",
      technical: technicalMessage
    };
  }

  // Context-Specific Generic Errors - professional with support guidance
  const contextFallbacks: Record<ErrorContext, ErrorDetails> = {
    trial_org_create: {
      message: "Unable to create organization",
      suggestion: "There was an issue creating the organization. Please verify your information and try again. If this persists, use the support chat in the bottom right corner.",
      technical: technicalMessage
    },
    trial_org_update: {
      message: "Update could not be saved",
      suggestion: "We encountered an issue saving your changes. Please try again. Need assistance? Click the chat widget below.",
      technical: technicalMessage
    },
    user_create: {
      message: "User creation failed",
      suggestion: "We couldn't create the user account. Please check the details and try again. For help, use the support chat in the bottom right.",
      technical: technicalMessage
    },
    user_update: {
      message: "Unable to update user information",
      suggestion: "The update didn't go through as expected. Please retry. If you need immediate help, the support chat is available below.",
      technical: technicalMessage
    },
    note_create: {
      message: "Note could not be saved",
      suggestion: "We had trouble saving your note. Please try posting it again. If the issue continues, reach out via the support widget.",
      technical: technicalMessage
    },
    login: {
      message: "Authentication error",
      suggestion: "We couldn't complete the login process. Please verify your credentials and try again. Need help? Use the chat bubble below.",
      technical: technicalMessage
    },
    api_call: {
      message: "Request failed",
      suggestion: "The request couldn't be processed. Please try again. For persistent issues, contact support using the chat widget.",
      technical: technicalMessage
    },
    generic: {
      message: "Something went wrong",
      suggestion: "We encountered an unexpected issue. Please try again. If this continues, click the support chat in the bottom right corner for assistance.",
      technical: technicalMessage
    }
  };

  return contextFallbacks[context];
}

/**
 * Format error for toast display
 */
export function formatErrorForToast(error: any, context: ErrorContext = 'generic', showTechnical: boolean = false): string {
  const details = getErrorMessage(error, context);

  let message = details.message;

  if (details.suggestion) {
    message += `\n${details.suggestion}`;
  }

  // In development, show technical details
  if (showTechnical && details.technical && process.env.NODE_ENV === 'development') {
    message += `\n\nTechnical: ${details.technical}`;
  }

  return message;
}

/**
 * Format error for API response
 */
export function formatErrorForAPI(error: any, context: ErrorContext = 'api_call'): {
  error: string;
  message: string;
  suggestion?: string;
  technical?: string;
} {
  const details = getErrorMessage(error, context);

  return {
    error: details.message,
    message: details.message,
    suggestion: details.suggestion,
    technical: process.env.NODE_ENV === 'development' ? details.technical : undefined
  };
}

/**
 * Report error to support team
 * Sends error details to support for investigation
 */
export async function reportErrorToSupport(
  error: any,
  context: ErrorContext,
  userEmail?: string,
  userId?: string,
  additionalInfo?: Record<string, any>
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  try {
    const errorReport: ErrorReport = {
      error_message: error?.message || String(error),
      error_stack: error?.stack,
      context,
      user_email: userEmail,
      user_id: userId,
      page_url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      additional_info: additionalInfo
    };

    const response = await fetch('/api/error-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport)
    });

    if (!response.ok) {
      throw new Error('Failed to send error report');
    }

    const data = await response.json();
    return { success: true, ticketId: data.ticketId };
  } catch (reportError: any) {
    console.error('Failed to report error:', reportError);
    return { success: false, error: reportError.message };
  }
}

/**
 * Format error with support reporting option
 * Shows user-friendly error with option to report to support
 */
export function formatErrorWithReportOption(
  error: any,
  context: ErrorContext = 'generic',
  onReport?: () => void
): string {
  const details = getErrorMessage(error, context);

  let message = details.message;

  if (details.suggestion) {
    message += `\n${details.suggestion}`;
  }

  // Add report option for persistent issues
  message += '\n\nIssue persists? Click to report to support team.';

  return message;
}

/**
 * Show enhanced error toast with retry capability
 * Uses the enhanced toast system with progressive disclosure and actions
 */
export function showEnhancedError(
  error: any,
  context: ErrorContext = 'generic',
  options?: {
    onRetry?: () => void | Promise<void>;
    userEmail?: string;
    userId?: string;
    additionalInfo?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'critical';
  }
): string {
  const details = getErrorMessage(error, context);
  const errorType = detectErrorType(error);

  // Determine priority based on error type if not specified
  const priority = options?.priority || (
    errorType === 'auth' ? 'high' :
    errorType === 'database' ? 'critical' :
    errorType === 'permission' ? 'high' :
    errorType === 'network' ? 'normal' :
    'normal'
  );

  // Build toast options
  const toastOptions: EnhancedToastOptions = {
    type: 'error',
    message: details.message,
    description: details.suggestion,
    priority,
    expandable: true,
    autoDismiss: false, // Errors should be manually dismissed
    metadata: {
      dedupeKey: `error_${context}_${details.message}`,
      context,
      technicalDetails: process.env.NODE_ENV === 'development' ? details.technical : undefined,
      errorCode: (error as any)?.code,
    },
  };

  // Add retry action if provided
  if (options?.onRetry) {
    toastOptions.onRetry = options.onRetry;
  }

  // Add report to support action
  toastOptions.actions = [
    {
      label: 'Report to Support',
      variant: 'secondary',
      onClick: async () => {
        const result = await reportErrorToSupport(
          error,
          context,
          options?.userEmail,
          options?.userId,
          options?.additionalInfo
        );

        if (result.success) {
          enhancedToast.success('Error reported successfully', {
            description: result.ticketId
              ? `Ticket #${result.ticketId} created`
              : 'Support team has been notified',
            duration: 5000,
          });
        } else {
          enhancedToast.error('Failed to report error', {
            description: 'Please try again or contact support directly',
            duration: 5000,
          });
        }
      },
    },
  ];

  // Show the enhanced toast
  return enhancedToast.show(toastOptions);
}
