/**
 * Validation Module for Locked-Template MSA Generator
 *
 * This module provides strict validation to ensure:
 * 1. All required placeholder values are provided
 * 2. User-friendly error messages are provided
 *
 * FAIL-FAST PRINCIPLE:
 * Generation MUST fail loudly and clearly if any validation fails.
 * A partial or incorrect MSA is worse than no MSA.
 */

import type { PlaceholderValues, RequiredPlaceholderKey } from './placeholder-contract';
import { REQUIRED_PLACEHOLDERS } from './placeholder-contract';

/**
 * Error class for validation failures
 */
export class MSAValidationError extends Error {
  constructor(
    message: string,
    public readonly code: 'MISSING_REQUIRED' | 'UNREPLACED_TOKEN' | 'INVALID_TOKEN' | 'TEMPLATE_ERROR',
    public readonly details?: string[]
  ) {
    super(message);
    this.name = 'MSAValidationError';
  }
}

/**
 * User-friendly error messages for each placeholder field
 */
export const PLACEHOLDER_ERROR_MESSAGES: Record<string, string> = {
  // Required fields
  CLIENT_LEGAL_NAME: 'Please enter the Client Legal Name',
  CLIENT_COUNTRY: 'Please select a Country',
  CLIENT_REGISTERED_ADDRESS: 'Please enter the Client Registered Address',
  SOF_CLIENT_NAME: 'Please enter the Client Name',
  SOF_PRIMARY_CONTACT: 'Please enter the Primary Contact name',
  SOF_EMAIL: 'Please enter a valid Email address',
  SOF_TERM: 'Please select a Term length',
  SOF_USERS: 'Please enter the number of Users',
  SOF_CONSULTING_HOURS: 'Please enter the Consulting Hours',
  SOF_LIST_PRICE: 'Please enter the List Price',
  SOF_INVESTMENT: 'Please enter the Investment amount',
  SOF_PAYMENT_TERMS: 'Please specify the Payment Terms',
  // Optional fields
  SOF_PHONE: 'Please enter the Phone number',
};

/**
 * Get user-friendly error message for a placeholder field
 */
export function getFieldErrorMessage(field: string): string {
  return PLACEHOLDER_ERROR_MESSAGES[field] || `Missing field: ${field}`;
}

/**
 * Validate that all required placeholder values are provided.
 *
 * @throws MSAValidationError if any required values are missing
 */
export function validateRequiredPlaceholders(values: PlaceholderValues): void {
  const missing: RequiredPlaceholderKey[] = [];

  for (const key of REQUIRED_PLACEHOLDERS) {
    const value = values[key];
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    // Create user-friendly message
    const friendlyMessages = missing.map(field => getFieldErrorMessage(field));

    throw new MSAValidationError(
      friendlyMessages.join('. '),
      'MISSING_REQUIRED',
      missing
    );
  }
}

/**
 * Get user-friendly validation errors for display
 */
export function getValidationErrors(values: PlaceholderValues): string[] {
  const errors: string[] = [];

  for (const key of REQUIRED_PLACEHOLDERS) {
    const value = values[key];
    if (!value || value.trim() === '') {
      errors.push(getFieldErrorMessage(key));
    }
  }

  return errors;
}
