/**
 * Utility functions for account manager name resolution
 */

export interface User {
  user_id: string;
  email: string;
  username?: string | null;
  full_name?: string | null;
  role?: string;
}

/**
 * Creates a lookup map for resolving account manager identifiers to display names
 * @param users Array of user objects
 * @returns Map with user_id, email, and username as keys, display name as value
 */
export function createAccountManagerMap(users: User[]): Map<string, string> {
  const map = new Map<string, string>();

  users.forEach(user => {
    const displayName = user.full_name || user.username || user.email;

    // Add lookup by UUID
    map.set(user.user_id, displayName);

    // Add lookup by email
    map.set(user.email, displayName);

    // Add lookup by username if it exists
    if (user.username) {
      map.set(user.username, displayName);
    }
  });

  return map;
}

/**
 * Resolves an account manager identifier to a display name
 * @param accountManager The account_manager value from the database
 * @param accountManagerMap The lookup map created by createAccountManagerMap
 * @returns The display name, 'Unknown Manager' for invalid UUIDs, or 'Unassigned' if null
 */
export function resolveAccountManagerName(
  accountManager: string | null | undefined,
  accountManagerMap: Map<string, string>
): string {
  // Handle null/undefined
  if (!accountManager) {
    return 'Unassigned';
  }

  // Try to look up in the map
  const lookupResult = accountManagerMap.get(accountManager);
  if (lookupResult) {
    return lookupResult;
  }

  // Not found in map - check if it's a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(accountManager)) {
    return 'Unknown Manager';
  }

  // Not a UUID and not in map - likely a salesPOC name, show as Unassigned
  return 'Unassigned';
}

/**
 * Convenience function that combines fetching users and creating the lookup map
 * This is a server-side function that uses Supabase
 */
export async function fetchAccountManagerMap(supabase: any): Promise<Map<string, string>> {
  const { data: users, error } = await supabase
    .from('users')
    .select('user_id, email, username, full_name, role');

  if (error) {
    console.error('Error fetching users for account manager map:', error);
    return new Map();
  }

  return createAccountManagerMap(users || []);
}

/**
 * Gets initials from a name string
 * @param name The full name or username
 * @returns Initials (max 2 characters, uppercase)
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}
