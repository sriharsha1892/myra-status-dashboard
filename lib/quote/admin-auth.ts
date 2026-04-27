const ADMIN_AUTH_KEY = 'myra_quote_admin_auth';

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
}

export function setAdminAuthenticated(): void {
  sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
}

export function clearAdminAuth(): void {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
}
