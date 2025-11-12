import type { User } from '@supabase/supabase-js';

export type UserRole = 'Admin' | 'Account Manager';

export function getUserRole(user: User | null): UserRole | null {
  if (!user) return null;
  return user.user_metadata?.role || null;
}

export function isAdmin(user: User | null): boolean {
  const role = getUserRole(user);
  if (!role) return false;
  const lowerRole = role.toLowerCase();
  return lowerRole === 'admin';
}

export function canAccessRoute(user: User | null, route: string): boolean {
  const role = getUserRole(user);
  if (!role) return false;

  // Account Managers can access trial orgs and tickets (read-only)
  if (role === 'Account Manager') {
    return route.startsWith('/support/trials') ||
           route.startsWith('/support/tickets') ||
           route.startsWith('/support/dashboard');
  }

  // Admins can access all support routes
  if (isAdmin(user)) {
    return true;
  }

  return false;
}

export function canUpdateTicket(user: User | null): boolean {
  // Only Admins can update tickets (Account Managers are read-only)
  return isAdmin(user);
}

export function canDeleteTicket(user: User | null): boolean {
  return isAdmin(user);
}

export function canManageOrganizations(user: User | null): boolean {
  return isAdmin(user);
}

export function canViewAllTickets(user: User | null): boolean {
  const role = getUserRole(user);
  // Both Admins and Account Managers can view tickets
  return role === 'Admin' || role === 'Account Manager';
}

export function canAddComments(user: User | null): boolean {
  // Only Admins can add comments (Account Managers are read-only)
  return isAdmin(user);
}
