import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export interface UserMetadata {
  authorized: boolean;
  userId?: string;
  email?: string;
  role?: string;
  parent_company?: string;
  is_super_admin?: boolean;
}

// Create Supabase Admin client
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Verify user access and return metadata
 * Returns user's company, super admin status, and role
 */
export async function verifyUserAccess(request: NextRequest): Promise<UserMetadata> {
  try {
    // Get the authorization header or cookie
    const authHeader = request.headers.get('authorization');
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Find Supabase auth token from cookies
    let accessToken = '';

    if (authHeader) {
      accessToken = authHeader.replace('Bearer ', '');
    } else {
      // Try to find auth token in cookies
      const authCookie = allCookies.find(cookie =>
        cookie.name.includes('sb-') && cookie.name.includes('auth-token')
      );

      if (authCookie) {
        try {
          // Try to decode base64 if it starts with "base64-"
          let decodedValue = authCookie.value;
          if (authCookie.value.startsWith('base64-')) {
            decodedValue = Buffer.from(authCookie.value.substring(7), 'base64').toString('utf-8');
          }

          // Try to parse as JSON
          const cookieValue = JSON.parse(decodedValue);
          accessToken = cookieValue.access_token || cookieValue[0];
        } catch (parseError) {
          // If not JSON, use the decoded value directly
          accessToken = authCookie.value.startsWith('base64-')
            ? Buffer.from(authCookie.value.substring(7), 'base64').toString('utf-8')
            : authCookie.value;
        }
      }
    }

    if (!accessToken) {
      return { authorized: false };
    }

    // Verify the user using admin API
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      return { authorized: false };
    }

    // Extract user metadata
    const role = user.user_metadata?.role;
    const parent_company = user.user_metadata?.parent_company || 'Mordor Intelligence';
    const is_super_admin = user.user_metadata?.is_super_admin || false;

    return {
      authorized: true,
      userId: user.id,
      email: user.email,
      role,
      parent_company,
      is_super_admin
    };
  } catch (error) {
    console.error('Error verifying user access:', error);
    return { authorized: false };
  }
}

/**
 * Verify admin access (Admin role required)
 */
export async function verifyAdminAccess(request: NextRequest): Promise<UserMetadata> {
  const metadata = await verifyUserAccess(request);

  if (!metadata.authorized) {
    return { authorized: false };
  }

  // TEMPORARY: Allow admin@myra.ai regardless of role
  if (metadata.email === 'admin@myra.ai') {
    return metadata;
  }

  // Check if user has Admin role (case-insensitive)
  if (!metadata.role || metadata.role.toLowerCase() !== 'admin') {
    return { authorized: false };
  }

  return metadata;
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(metadata: UserMetadata): boolean {
  return metadata.is_super_admin === true;
}

/**
 * Filter data by company unless user is super admin
 */
export function filterByCompany<T extends { parent_company?: string }>(
  data: T[],
  userMetadata: UserMetadata
): T[] {
  // Super admins see everything
  if (isSuperAdmin(userMetadata)) {
    return data;
  }

  // Filter by user's company
  if (userMetadata.parent_company) {
    return data.filter(item => item.parent_company === userMetadata.parent_company);
  }

  return data;
}
