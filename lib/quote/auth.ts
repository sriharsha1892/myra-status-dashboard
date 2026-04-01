const AUTH_KEY = 'myra_quote_auth';

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
