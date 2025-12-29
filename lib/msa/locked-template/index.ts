/**
 * Locked-Template MSA Generator
 *
 * This module provides a legally-immutable MSA document generator that:
 * - Uses a pre-created master template with placeholder tokens
 * - Replaces ONLY explicitly defined variable fields using docxtemplater
 * - Preserves ALL legal text exactly as-is
 * - Fails loudly if any validation fails
 *
 * Usage:
 * ```typescript
 * import { generateLockedMSA, downloadLockedMSA } from '@/lib/msa/locked-template';
 *
 * const values = {
 *   CLIENT_COUNTRY: 'United States',
 *   SOF_CLIENT_NAME: 'Acme Corp.',
 *   SOF_PRIMARY_CONTACT: 'John Smith',
 *   SOF_EMAIL: 'john@acme.com',
 *   // ... other required fields
 * };
 *
 * // Generate and download
 * await downloadLockedMSA(values);
 * ```
 */

// Main generator functions
export {
  generateLockedMSA,
  generateLockedMSAFilename,
  downloadLockedMSA,
  previewLockedMSA,
} from './template-generator';

// Placeholder contract and types
export {
  REQUIRED_PLACEHOLDERS,
  OPTIONAL_PLACEHOLDERS,
  ALL_PLACEHOLDERS,
  isValidPlaceholder,
  toPlaceholderToken,
  PLACEHOLDER_PATTERN,
} from './placeholder-contract';

export type {
  PlaceholderValues,
  PlaceholderKey,
  RequiredPlaceholderKey,
  OptionalPlaceholderKey,
} from './placeholder-contract';

// Validation utilities
export {
  MSAValidationError,
  validateRequiredPlaceholders,
  getValidationErrors,
  getFieldErrorMessage,
  PLACEHOLDER_ERROR_MESSAGES,
} from './validation';
