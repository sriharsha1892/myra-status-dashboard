import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Helper to create Supabase Admin client at runtime
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
async function verifyAdminAccess(): Promise<{ authorized: boolean; userId?: string }> {
  try {
    // Use the proper server client that handles cookies automatically
    const supabase = await createServerClient();

    // Get the current user from the session
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { authorized: false };
    }

    // Check if user has Admin role (case-insensitive)
    const role = user.user_metadata?.role;
    if (!role) {
      return { authorized: false };
    }

    const lowerRole = role.toLowerCase();
    const isAdmin = lowerRole === 'admin' || lowerRole === 'sales admin' || lowerRole === 'research admin';
    if (!isAdmin) {
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
    const { authorized } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get all users using admin API
    const { data, error} = await getSupabaseAdmin().auth.admin.listUsers();

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

// POST - Invite new user
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { authorized } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, name, role } = body;

    // Validate input
    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'Email, name, and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['Admin', 'Sales Admin', 'Research Admin', 'Account Manager', 'Product', 'Prodgain User', 'Team', 'AM'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Invite user using admin API (sends email invitation)
    const { data, error } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        role,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/support/login`,
    });

    if (error) {
      console.error('Error inviting user:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to invite user' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
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

// PATCH - Update user (email, name, or role)
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const { authorized } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role, email, name } = body;

    // Validate user ID
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prepare update payload
    const updatePayload: any = {};
    const metadataUpdates: any = {};

    // Handle role update
    if (role) {
      const validRoles = ['Admin', 'Sales Admin', 'Research Admin', 'Account Manager', 'Product', 'Prodgain User', 'Team', 'AM'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }
      metadataUpdates.role = role;
    }

    // Handle name update
    if (name !== undefined) {
      metadataUpdates.name = name;
    }

    // Handle email update
    if (email) {
      updatePayload.email = email;
    }

    // Add metadata updates if any
    if (Object.keys(metadataUpdates).length > 0) {
      updatePayload.user_metadata = metadataUpdates;
    }

    // Update user using admin API
    const { data, error } = await getSupabaseAdmin().auth.admin.updateUserById(
      userId,
      updatePayload
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
        name: data.user.user_metadata?.name,
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
    const { authorized, userId: adminUserId } = await verifyAdminAccess();
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
    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId);

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
