import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAccess, isSuperAdmin } from '@/lib/auth-helper';
// Email notifications temporarily disabled
// import { sendAccountManagerInvitationEmail } from '@/lib/email/resend';

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

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { authorized, parent_company, is_super_admin } = await verifyAdminAccess(request);
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

    // Get is_super_admin status from users table
    const { data: usersTableData, error: usersTableError } = await supabaseAdmin
      .from('users')
      .select('id, is_super_admin, full_name, role as db_role, parent_company as db_parent_company');

    if (usersTableError) {
      console.error('Error fetching users table data:', usersTableError);
    }

    // Create a map of user id to is_super_admin status
    const superAdminMap = new Map(
      usersTableData?.map(u => [u.id, {
        is_super_admin: u.is_super_admin || false,
        full_name: u.full_name,
        db_role: u.db_role,
        db_parent_company: u.db_parent_company
      }]) || []
    );

    // Return users with their metadata
    let users = data.users.map(user => {
      const dbData = superAdminMap.get(user.id);
      return {
        id: user.id,
        email: user.email,
        name: dbData?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
        role: dbData?.db_role || user.user_metadata?.role || 'Team',
        status: user.email_confirmed_at ? 'Active' : 'Invited',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        parent_company: dbData?.db_parent_company || user.user_metadata?.parent_company || 'Mordor Intelligence',
        is_super_admin: dbData?.is_super_admin || user.user_metadata?.is_super_admin || false,
      };
    });

    // Filter by company if not super admin
    const adminMetadata = { is_super_admin, parent_company };
    if (!isSuperAdmin(adminMetadata) && parent_company) {
      users = users.filter(u => u.parent_company === parent_company);
    }

    return NextResponse.json({ users, is_super_admin });
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
    const { email, password, name, role, parent_company, is_super_admin } = body;

    // Validate input
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Email, password, name, and role are required' },
        { status: 400 }
      );
    }

    // Validate parent_company if provided
    const validParentCompanies = ['Mordor Intelligence', 'GMI'];
    const userParentCompany = parent_company || 'Mordor Intelligence';
    if (!validParentCompanies.includes(userParentCompany)) {
      return NextResponse.json(
        { error: 'Invalid parent company. Must be Mordor Intelligence or GMI' },
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
        parent_company: userParentCompany,
        is_super_admin: is_super_admin || false,
      },
    });

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create user' },
        { status: 400 }
      );
    }

    // Sync user to public.users table
    const { error: dbInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: data.user.id,
        email: email,
        full_name: name,
        role: role,
        parent_company: userParentCompany,
        is_super_admin: is_super_admin || false,
      });

    if (dbInsertError) {
      console.error('Error syncing user to public.users table:', dbInsertError);
      // Don't fail user creation if DB sync fails - user is already created in auth
    }

    // Email notifications temporarily disabled
    const emailSent = false;
    // try {
    //   const { data: requestData } = await verifyAdminAccess(request);
    //   const adminName = requestData?.user?.user_metadata?.name || 'Your Admin';
    //   const emailResult = await sendAccountManagerInvitationEmail({
    //     to: email,
    //     name,
    //     email,
    //     password,
    //     role,
    //     invitedBy: adminName,
    //   });
    //   emailSent = emailResult.success;
    //   if (emailResult.success) {
    //     console.log(`✅ Invitation email sent to ${email}`);
    //   } else {
    //     console.warn(`⚠️  Failed to send invitation email to ${email}:`, emailResult.error);
    //   }
    // } catch (emailError) {
    //   console.warn('⚠️  Error sending invitation email:', emailError);
    // }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'User created successfully. Invitation email sent!'
        : 'User created successfully. Share the login credentials with them.',
      emailSent,
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
    const { userId, role, parent_company, is_super_admin } = body;

    // Validate input
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get current user data to check email
    const supabaseAdmin = getSupabaseAdmin();
    const { data: currentUserData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (fetchError || !currentUserData.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Safety check: Prevent removing super admin from admin@myra.ai
    if (currentUserData.user.email === 'admin@myra.ai' && is_super_admin === false) {
      return NextResponse.json(
        { error: 'Cannot remove super admin flag from admin@myra.ai' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateMetadata: Record<string, any> = {};

    if (role !== undefined) {
      const validRoles = ['Admin', 'Account Manager', 'Product', 'Prodgain User', 'Team'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be Admin, Account Manager, Product, Prodgain User, or Team' },
          { status: 400 }
        );
      }
      updateMetadata.role = role;
    }

    if (parent_company !== undefined) {
      const validParentCompanies = ['Mordor Intelligence', 'GMI'];
      if (!validParentCompanies.includes(parent_company)) {
        return NextResponse.json(
          { error: 'Invalid parent company. Must be Mordor Intelligence or GMI' },
          { status: 400 }
        );
      }
      updateMetadata.parent_company = parent_company;
    }

    if (is_super_admin !== undefined) {
      updateMetadata.is_super_admin = is_super_admin;
    }

    // Update user metadata using admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: updateMetadata,
      }
    );

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update user' },
        { status: 400 }
      );
    }

    // Sync user updates to public.users table
    const { error: dbUpsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: data.user.email,
        full_name: data.user.user_metadata?.name || currentUserData.user.user_metadata?.name || data.user.email?.split('@')[0],
        role: data.user.user_metadata?.role || currentUserData.user.user_metadata?.role || 'Team',
        parent_company: data.user.user_metadata?.parent_company || currentUserData.user.user_metadata?.parent_company || 'Mordor Intelligence',
        is_super_admin: data.user.user_metadata?.is_super_admin ?? currentUserData.user.user_metadata?.is_super_admin ?? false,
      }, {
        onConflict: 'id'
      });

    if (dbUpsertError) {
      console.error('Error syncing user updates to public.users table:', dbUpsertError);
      // Don't fail user update if DB sync fails - user is already updated in auth
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role,
        parent_company: data.user.user_metadata?.parent_company,
        is_super_admin: data.user.user_metadata?.is_super_admin,
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
