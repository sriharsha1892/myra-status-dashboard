/**
 * GTM Access Control
 *
 * Server-side utilities for checking if a user has GTM access.
 * The allowed emails are configured via GTM_EMAILS environment variable.
 */

import { getSessionFromRequest } from '@/lib/gtm/token';

/**
 * Check if an email has GTM access.
 * Compares against the GTM_EMAILS environment variable (comma-separated).
 */
export function isGtmEmail(email: string | undefined): boolean {
  if (!email) return false;

  const allowedEmails = (process.env.GTM_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // If no emails configured, deny all access
  if (allowedEmails.length === 0) return false;

  return allowedEmails.includes(email.toLowerCase());
}

/**
 * Require GTM auth via session cookie.
 * Returns the authenticated email, or null if not authenticated.
 */
export function requireGtmAuth(request: Request): string | null {
  const email = getSessionFromRequest(request);
  if (!email) return null;
  if (!isGtmEmail(email)) return null;
  return email;
}
