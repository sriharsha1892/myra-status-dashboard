// Test which role values are allowed
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testRoleValues() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🧪 Testing different role values...\n');

  const testRoles = [
    'user',
    'viewer',
    'member',
    'employee',
    'staff',
    'analyst',
    'manager',
    'admin'
  ];

  const testUserId = '00000000-0000-0000-0000-000000000001';
  const workingRoles = [];
  const failedRoles = [];

  for (const role of testRoles) {
    console.log(`Testing role: "${role}"`);

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: 'test.role@example.com',
        password_hash: 'TEST',
        full_name: 'Test User',
        role: role,
        parent_company: 'Mordor Intelligence',
        is_super_admin: false,
        is_active: true,
        managed_org_ids: []
      })
      .select();

    if (error) {
      console.log(`  ❌ Failed: ${error.message}`);
      failedRoles.push(role);
    } else {
      console.log(`  ✅ Works!`);
      workingRoles.push(role);
      // Delete the test user
      await supabase.from('users').delete().eq('id', testUserId);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Results:');
  console.log('='.repeat(50));
  console.log('\n✅ Working roles:');
  workingRoles.forEach(role => console.log(`   - "${role}"`));

  console.log('\n❌ Failed roles:');
  failedRoles.forEach(role => console.log(`   - "${role}"`));

  if (workingRoles.length > 0) {
    console.log(`\n💡 Recommendation: Use "${workingRoles[0]}" for regular users`);
  }
}

testRoleValues();
