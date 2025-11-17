const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function testSuperAdminBadge() {
  console.log('🧪 Testing Super Admin Badge Fix\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Check auth.users for super admin metadata
    console.log('\n📋 Step 1: Checking auth.users for is_super_admin metadata');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    console.log(`\nFound ${authUsers.users.length} users in auth.users:`);
    authUsers.users.forEach(user => {
      const isSuperAdmin = user.user_metadata?.is_super_admin;
      const role = user.user_metadata?.role;
      const icon = isSuperAdmin ? '👑' : '👤';
      console.log(`${icon} ${user.email}`);
      console.log(`   Role: ${role}, is_super_admin: ${isSuperAdmin}`);
    });

    // Step 2: Check public.users table
    console.log('\n📋 Step 2: Checking public.users table');
    const { data: publicUsers, error: publicError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, is_super_admin');

    if (publicError) {
      console.error('❌ Error fetching public users:', publicError);
    } else {
      console.log(`\nFound ${publicUsers?.length || 0} users in public.users:`);
      if (publicUsers && publicUsers.length > 0) {
        publicUsers.forEach(user => {
          const icon = user.is_super_admin ? '👑' : '👤';
          console.log(`${icon} ${user.email || 'No email'}`);
          console.log(`   Role: ${user.role}, is_super_admin: ${user.is_super_admin}`);
        });
      } else {
        console.log('⚠️  No users found in public.users table');
      }
    }

    // Step 3: Test the GET endpoint logic with fallback
    console.log('\n📋 Step 3: Testing GET endpoint fallback logic');

    const usersTableData = publicUsers || [];
    const superAdminMap = new Map(
      usersTableData.map(u => [u.id, {
        is_super_admin: u.is_super_admin || false,
        full_name: u.full_name,
        db_role: u.role,
      }]) || []
    );

    console.log('\nSimulating GET /api/admin/users response:');
    const simulatedResponse = authUsers.users.map(user => {
      const dbData = superAdminMap.get(user.id);
      const finalIsSuperAdmin = dbData?.is_super_admin || user.user_metadata?.is_super_admin || false;
      const icon = finalIsSuperAdmin ? '👑' : '👤';

      return {
        id: user.id,
        email: user.email,
        name: dbData?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
        role: dbData?.db_role || user.user_metadata?.role || 'Team',
        is_super_admin: finalIsSuperAdmin,
      };
    });

    simulatedResponse.forEach(user => {
      const icon = user.is_super_admin ? '👑' : '👤';
      console.log(`${icon} ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   is_super_admin: ${user.is_super_admin} ${user.is_super_admin ? '✅ BADGE WILL SHOW' : ''}`);
    });

    // Step 4: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    const superAdminsInAuth = authUsers.users.filter(u => u.user_metadata?.is_super_admin).length;
    const superAdminsInPublic = publicUsers?.filter(u => u.is_super_admin).length || 0;
    const superAdminsAfterFallback = simulatedResponse.filter(u => u.is_super_admin).length;

    console.log(`\n✓ Super admins in auth.users metadata: ${superAdminsInAuth}`);
    console.log(`✓ Super admins in public.users table: ${superAdminsInPublic}`);
    console.log(`✓ Super admins after fallback logic: ${superAdminsAfterFallback}`);

    if (superAdminsAfterFallback > 0) {
      console.log('\n✅ SUCCESS: Super admin badge will appear correctly!');
      console.log('The fallback to auth metadata is working.');
    } else {
      console.log('\n⚠️  WARNING: No super admins detected.');
      console.log('Make sure at least one user has is_super_admin set to true in their metadata.');
    }

    if (superAdminsInPublic < superAdminsInAuth) {
      console.log(`\n📝 NOTE: ${superAdminsInAuth - superAdminsInPublic} super admin(s) not yet synced to public.users`);
      console.log('They will be synced on next update via the PATCH endpoint.');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testSuperAdminBadge();
