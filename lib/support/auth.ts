import type { User } from '@supabase/supabase-js';

export type UserRole = 'AM' | 'Team' | 'Admin';

export function getUserRole(user: User | null): UserRole | null {
  if (!user) return null;
  return user.user_metadata?.role || null;
}

export function isAdmin(user: User | null): boolean {
  const role = getUserRole(user);
  if (!role) return false;
  const lowerRole = role.toLowerCase();
  return lowerRole === 'admin' || lowerRole === 'sales admin' || lowerRole === 'research admin';
}

export function canAccessRoute(user: User | null, route: string): boolean {
  const role = getUserRole(user);
  if (!role) return false;

  // AM users can only access /support/submit
  if (role === 'AM') {
    return route.startsWith('/support/submit');
  }

  // Team and all Admin roles can access all support routes
  if (role?.toLowerCase() === 'team' || isAdmin(user)) {
    return true;
  }

  return false;
}

export function canUpdateTicket(user: User | null): boolean {
  const role = getUserRole(user);
  return role?.toLowerCase() === 'team' || isAdmin(user);
}

export function canDeleteTicket(user: User | null): boolean {
  return isAdmin(user);
}

export function canManageOrganizations(user: User | null): boolean {
  return isAdmin(user);
}

export function canViewAllTickets(user: User | null): boolean {
  const role = getUserRole(user);
  return role?.toLowerCase() === 'team' || isAdmin(user);
}

export function canAddComments(user: User | null): boolean {
  const role = getUserRole(user);
  return role?.toLowerCase() === 'team' || isAdmin(user);
}
