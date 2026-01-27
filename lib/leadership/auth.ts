/**
 * Leadership Access Control
 *
 * Server-side utilities for checking if a user has leadership access.
 * The allowed emails are configured via LEADERSHIP_EMAILS environment variable.
 */

/**
 * Check if an email has leadership access.
 * Compares against the LEADERSHIP_EMAILS environment variable (comma-separated).
 */
export function isLeadershipEmail(email: string | undefined): boolean {
  if (!email) return false;

  const allowedEmails = (process.env.LEADERSHIP_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // If no emails configured, deny all access
  if (allowedEmails.length === 0) return false;

  return allowedEmails.includes(email.toLowerCase());
}
