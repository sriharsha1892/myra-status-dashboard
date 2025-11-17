/**
 * Brevo API Client
 *
 * Wrapper around Brevo's official SDK for sending transactional emails.
 * Requires BREVO_API_KEY environment variable.
 *
 * Free tier: 300 emails/day (9,000/month)
 * Docs: https://developers.brevo.com/docs
 */

import { BrevoEmailParams } from './types';

const brevo = require('@getbrevo/brevo');

let apiInstance: any | null = null;

/**
 * Initialize Brevo API client
 * Creates a singleton instance configured with API key from environment
 */
function initializeBrevoClient(): any {
  if (apiInstance) {
    return apiInstance;
  }

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error(
      'BREVO_API_KEY environment variable is not set. ' +
      'Get your API key from https://app.brevo.com → Settings → SMTP & API'
    );
  }

  // Create API instance with API key
  apiInstance = new brevo.TransactionalEmailsApi();

  // Set API key authentication
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  return apiInstance;
}

/**
 * Send a transactional email via Brevo
 *
 * @param params - Email parameters (to, subject, content, etc.)
 * @returns Promise with message ID on success, or throws error
 *
 * @example
 * ```typescript
 * const result = await sendEmailViaBrevo({
 *   to: [{ email: 'user@example.com', name: 'John Doe' }],
 *   sender: { email: 'notifications@yourdomain.com', name: 'My App' },
 *   subject: 'Welcome!',
 *   htmlContent: '<h1>Welcome to our app!</h1>',
 *   tags: ['welcome', 'onboarding']
 * });
 *
 * console.log('Email sent:', result.messageId);
 * ```
 */
export async function sendEmailViaBrevo(
  params: BrevoEmailParams
): Promise<{ success: true; messageId: string } | { success: false; error: any; reason?: string }> {
  try {
    const api = initializeBrevoClient();

    // Create send email request
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = params.to;
    sendSmtpEmail.sender = params.sender;
    sendSmtpEmail.subject = params.subject;
    sendSmtpEmail.htmlContent = params.htmlContent;

    // Optional fields
    if (params.textContent) {
      sendSmtpEmail.textContent = params.textContent;
    }

    if (params.tags) {
      sendSmtpEmail.tags = params.tags;
    }

    if (params.params) {
      sendSmtpEmail.params = params.params;
    }

    // Send the email
    const response = await api.sendTransacEmail(sendSmtpEmail);

    return {
      success: true,
      messageId: response.messageId || 'unknown',
    };
  } catch (error: any) {
    console.error('Brevo email sending error:', error);

    // Extract useful error information
    let reason = 'Unknown error';
    if (error.response?.body) {
      reason = error.response.body.message || error.response.body.code || reason;
    } else if (error.message) {
      reason = error.message;
    }

    return {
      success: false,
      error,
      reason,
    };
  }
}

/**
 * Verify Brevo API configuration
 * Useful for health checks and debugging
 *
 * @returns true if API key is configured, false otherwise
 */
export function isBrevoConfigured(): boolean {
  return !!process.env.BREVO_API_KEY;
}

/**
 * Get sender email configuration from environment
 * Falls back to default values if not set
 */
export function getSenderConfig(): { email: string; name: string } {
  return {
    email: process.env.FROM_EMAIL || 'notifications@example.com',
    name: process.env.FROM_NAME || 'Myra Status Dashboard',
  };
}

/**
 * Get base URL for email action links
 * Uses NEXT_PUBLIC_URL or falls back to localhost in development
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  console.warn('NEXT_PUBLIC_URL not set - using fallback URL');
  return 'https://yourdomain.com';
}
