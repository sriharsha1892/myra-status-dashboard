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

// ============================================
// Client-side Session Storage Helpers
// ============================================

const LEADERSHIP_AUTH_KEY = 'myra_leadership_auth';
const LEADERSHIP_EMAIL_KEY = 'myra_leadership_email';

/**
 * Check if user is authenticated for leadership access (client-side).
 */
export function isLeadershipAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(LEADERSHIP_AUTH_KEY) === 'true';
}

/**
 * Store leadership authentication state (client-side).
 */
export function setLeadershipAuthenticated(email: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LEADERSHIP_AUTH_KEY, 'true');
  sessionStorage.setItem(LEADERSHIP_EMAIL_KEY, email.toLowerCase());
}

/**
 * Get the authenticated leadership email (client-side).
 */
export function getLeadershipEmail(): string | null {
  if (typeof window === 'undefined') return null;
  if (!isLeadershipAuthenticated()) return null;
  return sessionStorage.getItem(LEADERSHIP_EMAIL_KEY);
}

/**
 * Clear leadership authentication (client-side).
 */
export function clearLeadershipAuth(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LEADERSHIP_AUTH_KEY);
  sessionStorage.removeItem(LEADERSHIP_EMAIL_KEY);
}
