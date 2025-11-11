// Check what role values exist in the users table
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkAllowedRoles() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🔍 Checking existing role values...\n');

  // Get all unique roles from existing users
  const { data: users, error } = await supabase
    .from('users')
    .select('role, full_name, email, is_super_admin');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('Existing users and their roles:\n');
  const roleSet = new Set();

  users.forEach(user => {
    console.log(`📌 ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Super Admin: ${user.is_super_admin}`);
    console.log('');
    roleSet.add(user.role);
  });

  console.log('\n✅ Unique role values found:');
  Array.from(roleSet).forEach(role => {
    console.log(`   - "${role}"`);
  });
}

checkAllowedRoles();
