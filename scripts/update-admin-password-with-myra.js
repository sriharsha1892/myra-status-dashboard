#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateAdminPassword() {
  console.log('🔐 Updating admin@myra.ai password to include "myRA"...\n');

  const newPassword = 'admin@myRA2025';

  try {
    // Update password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      '84796ddb-6458-4eea-9a67-cfcf73a31f7d', // admin user ID
      { password: newPassword }
    );

    if (error) {
      console.error('❌ Error updating password:', error.message);
      process.exit(1);
    }

    console.log('✅ Password updated successfully!');
    console.log('\n📧 New credentials for admin@myra.ai:');
    console.log('   Email: admin@myra.ai');
    console.log('   Password:', newPassword);
    console.log('\n⚠️  Please update your password manager!');
    console.log('\n💡 The password now includes "myRA" as required by the login page.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateAdminPassword().catch(console.error);
