/**
 * Placeholder Contract for Locked-Template MSA Generator
 *
 * This file defines the ONLY allowed placeholders for token replacement.
 * Any placeholder not listed here is ILLEGAL and will cause generation to fail.
 *
 * LEGAL IMMUTABILITY NOTICE:
 * - These placeholders replace ONLY variable values in the master template
 * - No legal text, clause content, or structure is modified
 * - If a placeholder is not in this list, it must not exist in the template
 */

// REQUIRED - Generation MUST fail if any of these are missing a value
export const REQUIRED_PLACEHOLDERS = [
  // Main Agreement - Parties Section
  'CLIENT_COUNTRY',         // e.g., "Croatia"

  // Annexure B - Subscription Order Form
  'SOF_CLIENT_NAME',        // Client name in order form (also used in signature block)
  'SOF_PRIMARY_CONTACT',    // Primary contact person name
  'SOF_EMAIL',              // Contact email

  // Order Form Table - Commercial Terms
  'SOF_TERM',               // e.g., "3-Year"
  'SOF_USERS',              // e.g., "2"
  'SOF_CONSULTING_HOURS',   // e.g., "100"
  'SOF_LIST_PRICE',         // e.g., "$120,000"
  'SOF_INVESTMENT',         // e.g., "$90,000"
  'SOF_PAYMENT_TERMS',      // e.g., "Monthly, invoiced upfront"
] as const;

// OPTIONAL - May be left blank (will be replaced with empty string)
// Note: Some of these are optional because they may need manual template editing
// to add the placeholder tokens (Word splits text across XML runs)
export const OPTIONAL_PLACEHOLDERS = [
  // These may not be in the template yet (require manual Word editing)
  'CLIENT_LEGAL_NAME',      // e.g., "Horwath HTL." - in parties section
  'CLIENT_ADDRESS',         // Full registered address - in parties section
  'SOF_REGISTERED_ADDRESS', // Registered address in order form

  'SOF_PHONE',              // Contact phone (optional field)

  // Signature Blocks - Dates are typically filled at signing
  'MORDOR_SIGN_DATE',       // Mordor signatory date
  'CUSTOMER_SIGN_NAME',     // Customer signatory name
  'CUSTOMER_SIGN_TITLE',    // Customer signatory title
  'CUSTOMER_SIGN_DATE',     // Customer signatory date
] as const;

// Combined list of all valid placeholders
export const ALL_PLACEHOLDERS = [
  ...REQUIRED_PLACEHOLDERS,
  ...OPTIONAL_PLACEHOLDERS,
] as const;

// Type for required placeholder keys
export type RequiredPlaceholderKey = typeof REQUIRED_PLACEHOLDERS[number];

// Type for optional placeholder keys
export type OptionalPlaceholderKey = typeof OPTIONAL_PLACEHOLDERS[number];

// Type for all placeholder keys
export type PlaceholderKey = typeof ALL_PLACEHOLDERS[number];

// Type for placeholder values - required keys must have string, optional may be undefined
export type PlaceholderValues = {
  [K in RequiredPlaceholderKey]: string;
} & {
  [K in OptionalPlaceholderKey]?: string;
};

// Regex pattern to match placeholder tokens in template
export const PLACEHOLDER_PATTERN = /\{\{([A-Z_]+)\}\}/g;

// Helper to check if a token is a valid placeholder
export function isValidPlaceholder(token: string): boolean {
  return (ALL_PLACEHOLDERS as readonly string[]).includes(token);
}

// Helper to get placeholder token format
export function toPlaceholderToken(key: PlaceholderKey): string {
  return `{{${key}}}`;
}
