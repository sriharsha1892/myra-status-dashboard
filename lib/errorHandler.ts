/**
 * Centralized Error Handler
 * Provides graceful, user-friendly error messages with support reporting
 */

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
        message: "Oops! Can't reach the server right now 🌐",
        suggestion: "Check your internet connection and try again"
      },
      {
        message: "Network connection lost 📡",
        suggestion: "Please check your internet and retry"
      },
      {
        message: "Can't connect to the server 🔌",
        suggestion: "Your connection seems unstable. Give it another try?"
      }
    ];
    const selected = messages[Math.floor(Math.random() * messages.length)];
    return { ...selected, technical: technicalMessage };
  }

  // Auth Errors
  if (errorType === 'auth') {
    const messages = [
      {
        message: "Session expired ⏰",
        suggestion: "Please log in again to continue"
      },
      {
        message: "Authentication required 🔐",
        suggestion: "Please log in to access this page"
      },
      {
        message: "Your session has ended 🚪",
        suggestion: "Please log in again"
      }
    ];
    const selected = messages[Math.floor(Math.random() * messages.length)];
    return { ...selected, technical: technicalMessage };
  }

  // Duplicate Errors
  if (errorType === 'duplicate') {
    const contextMessages: Record<ErrorContext, ErrorDetails> = {
      trial_org_create: {
        message: "This organization already exists 🔄",
        suggestion: "Please use a different name or check existing organizations",
        technical: technicalMessage
      },
      user_create: {
        message: "This email is already registered 👥",
        suggestion: "Please use a different email address",
        technical: technicalMessage
      },
      note_create: {
        message: "Duplicate note detected 📝",
        suggestion: "This note already exists",
        technical: technicalMessage
      },
      generic: {
        message: "This entry already exists 🔄",
        suggestion: "Please use unique values",
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
        message: "Please fill in all required fields 📋",
        suggestion: "Some fields are missing or invalid"
      },
      {
        message: "Missing required information ✍️",
        suggestion: "Please complete all required fields"
      },
      {
        message: "Invalid input detected 📝",
        suggestion: "Please check your entries and try again"
      }
    ];
    const selected = messages[Math.floor(Math.random() * messages.length)];
    return { ...selected, technical: technicalMessage };
  }

  // Permission Errors
  if (errorType === 'permission') {
    const messages = [
      {
        message: "Access denied 🚫",
        suggestion: "You don't have permission for this action. Please contact your admin."
      },
      {
        message: "Insufficient permissions 🔒",
        suggestion: "This action requires admin privileges"
      }
    ];
    const selected = messages[Math.floor(Math.random() * messages.length)];
    return { ...selected, technical: technicalMessage };
  }

  // Database Errors
  if (errorType === 'database') {
    const messages = [
      {
        message: "Database error occurred 💾",
        suggestion: "Please try again. Our team has been notified."
      },
      {
        message: "Something went wrong on our end 🔧",
        suggestion: "We're looking into it. Please retry in a moment."
      },
      {
        message: "Server error 🖥️",
        suggestion: "Please try again in a few seconds"
      }
    ];
    const selected = messages[Math.floor(Math.random() * messages.length)];
    return { ...selected, technical: technicalMessage };
  }

  // Timeout Errors
  if (errorType === 'timeout') {
    return {
      message: "Request timed out ⏱️",
      suggestion: "This is taking longer than expected. Please try again",
      technical: technicalMessage
    };
  }

  // Context-Specific Generic Errors
  const contextFallbacks: Record<ErrorContext, ErrorDetails> = {
    trial_org_create: {
      message: "Failed to create organization 🏢",
      suggestion: "Please check your information and try again",
      technical: technicalMessage
    },
    trial_org_update: {
      message: "Failed to update organization 📝",
      suggestion: "Please try again",
      technical: technicalMessage
    },
    user_create: {
      message: "Failed to create user 👤",
      suggestion: "Please verify the details and try again",
      technical: technicalMessage
    },
    user_update: {
      message: "Failed to update user 💾",
      suggestion: "Please try again in a moment",
      technical: technicalMessage
    },
    note_create: {
      message: "Failed to save note 📝",
      suggestion: "Please try posting your note again",
      technical: technicalMessage
    },
    login: {
      message: "Login failed 🔑",
      suggestion: "Please check your credentials and try again",
      technical: technicalMessage
    },
    api_call: {
      message: "Request failed 📡",
      suggestion: "Please try again",
      technical: technicalMessage
    },
    generic: {
      message: "Something went wrong ⚠️",
      suggestion: "Please try again or contact support if this persists",
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
