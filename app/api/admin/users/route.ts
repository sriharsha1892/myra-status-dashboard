import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create Supabase Admin client with service role key (lazy initialization)
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

// Helper function to verify admin access
async function verifyAdminAccess(request: NextRequest): Promise<{ authorized: boolean; userId?: string }> {
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
          const cookieValue = JSON.parse(authCookie.value);
          accessToken = cookieValue.access_token || cookieValue[0];
        } catch {
          accessToken = authCookie.value;
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

    // Check if user has Admin role
    const role = user.user_metadata?.role;
    if (role !== 'Admin') {
      return { authorized: false };
    }

    return { authorized: true, userId: user.id };
  } catch (error) {
    console.error('Error verifying admin access:', error);
    return { authorized: false };
  }
}

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { authorized } = await verifyAdminAccess(request);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get all users using admin API
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Return users with their metadata
    const users = data.users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
      role: user.user_metadata?.role || 'Team',
      status: user.email_confirmed_at ? 'Active' : 'Invited',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new user with password (simplified for small teams)
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { authorized } = await verifyAdminAccess(request);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, role } = body;

    // Validate input
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Email, password, name, and role are required' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['Admin', 'Account Manager', 'Product', 'Prodgain User', 'Team'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be Admin, Account Manager, Product, Prodgain User, or Team' },
        { status: 400 }
      );
    }

    // Create user directly with password using admin API
    // This bypasses email confirmation - perfect for small teams (max 25 users)
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email (no email required)
      user_metadata: {
        name,
        role,
      },
    });

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create user' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully. Share the login credentials with them.',
      user: {
        id: data.user.id,
        email: data.user.email,
        name,
        role,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update user role
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const { authorized } = await verifyAdminAccess(request);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    // Validate input
    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['Admin', 'Account Manager', 'Product', 'Prodgain User', 'Team'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be Admin, Account Manager, Product, Prodgain User, or Team' },
        { status: 400 }
      );
    }

    // Update user metadata using admin API
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: { role },
      }
    );

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update user' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role,
      },
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const { authorized, userId: adminUserId } = await verifyAdminAccess(request);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    // Validate input
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === adminUserId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete user using admin API
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete user' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
