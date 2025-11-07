#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function fixAdminRole() {
  console.log('\n🔧 Fixing admin role case sensitivity issue...\n');

  // Fix admin@myra.ai role
  const { data: users } = await supabase.auth.admin.listUsers();
  const adminUser = users.users.find(u => u.email === 'admin@myra.ai');

  if (!adminUser) {
    console.log('❌ admin@myra.ai user not found');
    return;
  }

  console.log(`Found user: ${adminUser.email}`);
  console.log(`Current role: "${adminUser.user_metadata?.role}"`);

  // Update to capitalized "Admin"
  const { data, error } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    {
      user_metadata: {
        ...adminUser.user_metadata,
        role: 'Admin', // Capitalize
      },
    }
  );

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('\n✅ Fixed! Role is now "Admin" (capitalized)');
  console.log('\n🎉 You can now access /support/admin/users');
  console.log('   Please refresh your browser!\n');
}

fixAdminRole();
