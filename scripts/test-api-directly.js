#!/usr/bin/env node
/**
 * Test the /api/admin/users endpoint by calling listUsers directly
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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

async function testListUsers() {
  console.log('\n🧪 Testing auth.admin.listUsers() directly...\n');

  try {
    // This is exactly what the API route does
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`✅ Total users returned: ${data.users.length}`);
    console.log('\n📋 User list:');
    data.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - Role: ${user.user_metadata?.role || 'N/A'} - Confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`);
    });

    // Count by role
    const roleCount = {};
    data.users.forEach(user => {
      const role = user.user_metadata?.role || 'No Role';
      roleCount[role] = (roleCount[role] || 0) + 1;
    });

    console.log('\n📊 By role:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testListUsers();
