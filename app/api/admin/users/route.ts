import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Helper to create Supabase Admin client at runtime
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    throw new Error('Server configuration error: Missing Supabase URL');
  }

  if (!serviceRoleKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    throw new Error('Server configuration error: Missing Supabase service role key');
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Helper function to verify admin access
async function verifyAdminAccess(): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  try {
    // Use the proper server client that handles cookies automatically
    const supabase = await createServerClient();

    // Get the current user from the session
    const { data: { user }, error } = await supabase.auth.getUser();

    console.log('🔐 Admin verification:', {
      hasUser: !!user,
      error: error?.message,
      userId: user?.id,
      role: user?.user_metadata?.role,
      metadata: user?.user_metadata
    });

    if (error || !user) {
      return { authorized: false, error: error?.message || 'No user found' };
    }

    // Check if user has Admin role (case-insensitive)
    const role = user.user_metadata?.role;
    if (!role) {
      return { authorized: false, error: 'No role found in user metadata' };
    }

    const lowerRole = role.toLowerCase();
    const isAdmin = lowerRole === 'admin' || lowerRole === 'sales admin' || lowerRole === 'research admin';

    console.log('🔐 Role check:', {
      originalRole: role,
      lowerRole,
      isAdmin,
      checkedAgainst: ['admin', 'sales admin', 'research admin']
    });

    if (!isAdmin) {
      return { authorized: false, error: `Role "${role}" does not have admin permissions` };
    }

    return { authorized: true, userId: user.id };
  } catch (error) {
    console.error('Error verifying admin access:', error);
    return { authorized: false, error: 'Exception during verification' };
  }
}

// GET - List all users (including pending signups)
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

    const adminClient = getSupabaseAdmin();

    // Get all users using admin API
    const { data, error} = await adminClient.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get existing users from Supabase Auth
    const users = data.users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
      role: user.user_metadata?.role || 'Team',
      status: user.email_confirmed_at ? 'Active' : 'Invited',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    }));

    // Also fetch pending signup tokens that haven't been used yet
    const { data: pendingTokens, error: tokensError } = await adminClient
      .from('signup_tokens')
      .select('*')
      .is('used_at', null) // Only get unused tokens
      .gt('expires_at', new Date().toISOString()); // Only get non-expired tokens

    if (!tokensError && pendingTokens) {
      // Add pending signups to the list
      const pendingUsers = pendingTokens
        .filter(token => !users.some(u => u.email === token.email)) // Don't duplicate if already signed up
        .map(token => ({
          id: `pending-${token.token}`,
          email: token.email || 'Unknown',
          name: token.email?.split('@')[0] || 'Pending User',
          role: token.user_role || 'Team',
          status: 'Pending' as const,
          created_at: token.created_at,
          last_sign_in_at: null,
        }));

      users.push(...pendingUsers);
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create signup link for new user
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { authorized, userId: adminUserId, error: authError } = await verifyAdminAccess();
    if (!authorized) {
      console.error('❌ Admin access denied:', authError);
      return NextResponse.json(
        { error: `Unauthorized - Admin access required. ${authError || ''}` },
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

    const adminClient = getSupabaseAdmin();

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const userExists = existingUsers.users.some(u => u.email === email);

    if (userExists) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Generate unique token
    const token = crypto.randomUUID();

    // Token expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store signup token in database
    const { error: tokenError } = await adminClient
      .from('signup_tokens')
      .insert({
        token,
        email,
        user_role: role,
        expires_at: expiresAt.toISOString(),
        created_by: adminUserId,
      });

    if (tokenError) {
      console.error('Error creating signup token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate signup link' },
        { status: 500 }
      );
    }

    // Generate signup URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const signupUrl = `${baseUrl}/support/signup?token=${token}`;

    return NextResponse.json({
      success: true,
      signupUrl,
      email,
      name,
      role,
      expiresAt: expiresAt.toISOString(),
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
