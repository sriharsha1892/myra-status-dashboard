const AUTH_KEY = 'myra_quote_auth';
const ADMIN_AUTH_KEY = 'myra_quote_admin_auth';

export function isQuoteAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(AUTH_KEY) === 'true';
}

export function setQuoteAuthenticated(): void {
  sessionStorage.setItem(AUTH_KEY, 'true');
}

export function clearQuoteAuth(): void {
  sessionStorage.removeItem(AUTH_KEY);
}

export function isQuoteAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
}

export function setQuoteAdminAuthenticated(): void {
  sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
}

export function clearQuoteAdminAuth(): void {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
}
