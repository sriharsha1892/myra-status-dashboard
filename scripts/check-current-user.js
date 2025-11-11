// Check current authenticated user details
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkCurrentUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  // Use service role to query auth.users
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🔍 Checking all auth users...\n');

  // Get all users from auth
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    process.exit(1);
  }

  console.log(`Found ${authUsers.users.length} auth users:\n`);

  for (const user of authUsers.users) {
    console.log('Auth User:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Created:', user.created_at);

    // Check if they exist in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, is_super_admin, parent_company')
      .eq('id', user.id)
      .maybeSingle();

    if (userData) {
      console.log('  ✅ Exists in users table:');
      console.log('    Role:', userData.role);
      console.log('    Super Admin:', userData.is_super_admin);
      console.log('    Company:', userData.parent_company);
    } else {
      console.log('  ❌ NOT in users table');
    }
    console.log('');
  }
}

checkCurrentUser();
