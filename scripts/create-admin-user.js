// Create admin@myra.ai user specifically
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function createAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🚀 Creating admin@myra.ai user...\n');

  // Get auth user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const adminAuthUser = authUsers.users.find(u => u.email === 'admin@myra.ai');

  if (!adminAuthUser) {
    console.error('❌ admin@myra.ai not found in auth.users');
    process.exit(1);
  }

  console.log('Found auth user:', adminAuthUser.id, adminAuthUser.email);

  // Check if already exists
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', adminAuthUser.id)
    .maybeSingle();

  if (existing) {
    console.log('\n✅ User already exists in users table:');
    console.log(JSON.stringify(existing, null, 2));
    process.exit(0);
  }

  // Try different role values based on existing user pattern
  const testUser = {
    id: adminAuthUser.id,
    email: adminAuthUser.email,
    password_hash: 'AUTH_USER',
    full_name: 'Admin',
    role: 'admin', // Try lowercase like existing user
    parent_company: 'Mordor Intelligence', // Try this first since it's known to work
    is_super_admin: true,
    is_active: true,
    managed_org_ids: [],
    created_at: adminAuthUser.created_at,
  };

  console.log('\nInserting:', JSON.stringify(testUser, null, 2));

  const { data, error } = await supabase
    .from('users')
    .insert(testUser)
    .select()
    .single();

  if (error) {
    console.error('\n❌ Error:', JSON.stringify(error, null, 2));
    console.log('\n🔍 Let me check what roles are allowed...');

    // Try to get constraint info by trying different values
    const roleTests = ['admin', 'user', 'viewer', 'manager'];
    for (const testRole of roleTests) {
      const testData = { ...testUser, role: testRole };
      const { error: testError } = await supabase
        .from('users')
        .insert(testData)
        .select();

      if (testError) {
        console.log(`  ❌ role='${testRole}' failed:`, testError.message);
      } else {
        console.log(`  ✅ role='${testRole}' works!`);
        // Delete the test user
        await supabase.from('users').delete().eq('id', adminAuthUser.id);
        break;
      }
    }
    process.exit(1);
  }

  console.log('\n✅ Success!');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n👉 You should now be able to access /support/admin/customer-support');
}

createAdminUser();
