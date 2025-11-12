import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Authentication middleware for API routes
 * Verifies user authentication and returns user data
 *
 * @throws {Error} If authentication fails
 * @returns {Promise<{ user: User, supabase: SupabaseClient }>}
 */
export async function requireAuth(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized - Authentication required');
  }

  return { user, supabase };
}

/**
 * Authentication middleware for admin-only routes
 * Verifies user has admin or super_admin role
 *
 * @throws {Error} If user is not an admin
 * @returns {Promise<{ user: User, supabase: SupabaseClient, userData: any }>}
 */
export async function requireAdmin(request: NextRequest) {
  const { user, supabase } = await requireAuth(request);

  // Get user role from database
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    throw new Error('User data not found');
  }

  // Check if user has admin privileges
  const isAdmin = userData.role === 'Admin' ||
                  userData.is_super_admin === true;

  if (!isAdmin) {
    throw new Error('Forbidden - Admin access required');
  }

  return { user, supabase, userData };
}

/**
 * Wraps API handler with authentication
 * Returns 401 if auth fails, otherwise calls handler
 */
export function withAuth(
  handler: (request: NextRequest, context: { user: any; supabase: any }) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeParams?: any) => {
    try {
      const { user, supabase } = await requireAuth(request);
      return await handler(request, { user, supabase });
    } catch (error: any) {
      const status = error.message.includes('Forbidden') ? 403 : 401;
      return NextResponse.json(
        { error: error.message || 'Unauthorized' },
        { status }
      );
    }
  };
}

/**
 * Wraps API handler with admin authentication
 * Returns 401/403 if auth fails, otherwise calls handler
 */
export function withAdmin(
  handler: (request: NextRequest, context: { user: any; supabase: any; userData: any }) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeParams?: any) => {
    try {
      const { user, supabase, userData } = await requireAdmin(request);
      return await handler(request, { user, supabase, userData });
    } catch (error: any) {
      const status = error.message.includes('Forbidden') ? 403 : 401;
      return NextResponse.json(
        { error: error.message || 'Unauthorized' },
        { status }
      );
    }
  };
}
