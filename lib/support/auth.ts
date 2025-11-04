import type { User } from '@supabase/supabase-js';

export type UserRole = 'AM' | 'Team' | 'Admin';

export function getUserRole(user: User | null): UserRole | null {
  if (!user) return null;
  return user.user_metadata?.role || null;
}

export function canAccessRoute(user: User | null, route: string): boolean {
  const role = getUserRole(user);
  if (!role) return false;

  // AM users can only access /support/submit
  if (role === 'AM') {
    return route.startsWith('/support/submit');
  }

  // Team and Admin can access all support routes
  if (role === 'Team' || role === 'Admin') {
    return true;
  }

  return false;
}

export function canUpdateTicket(user: User | null): boolean {
  const role = getUserRole(user);
  return role === 'Team' || role === 'Admin';
}

export function canDeleteTicket(user: User | null): boolean {
  const role = getUserRole(user);
  return role === 'Admin';
}

export function canManageOrganizations(user: User | null): boolean {
  const role = getUserRole(user);
  return role === 'Admin';
}

export function canViewAllTickets(user: User | null): boolean {
  const role = getUserRole(user);
  return role === 'Team' || role === 'Admin';
}

export function canAddComments(user: User | null): boolean {
  const role = getUserRole(user);
  return role === 'Team' || role === 'Admin';
}
