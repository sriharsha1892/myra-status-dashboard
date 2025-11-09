#!/usr/bin/env node
/**
 * Set user's role to Admin in Supabase Auth
 * Usage: node scripts/set-admin-role.js <email>
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setAdminRole(email) {
  if (!email) {
    console.error('❌ Email is required');
    console.error('   Usage: node scripts/set-admin-role.js your@email.com');
    process.exit(1);
  }

  console.log('\n🔧 Setting Admin role in Supabase Auth...\n');

  try {
    // Find user by email
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Error fetching users:', error.message);
      process.exit(1);
    }

    const user = data.users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('\n💡 Available users:');
      data.users.forEach(u => {
        console.log(`   - ${u.email}`);
      });
      process.exit(1);
    }

    console.log('📋 Current User Info:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.user_metadata?.name || '(not set)'}`);
    console.log(`   Current Role: ${user.user_metadata?.role || '(not set)'}`);
    console.log('');

    // Update user role to Admin
    console.log('🔄 Updating role to Admin...');

    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          role: 'Admin'
        }
      }
    );

    if (updateError) {
      console.error('❌ Error updating user:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Successfully updated user role!\n');
    console.log('📋 Updated User Info:');
    console.log(`   Email: ${updateData.user.email}`);
    console.log(`   Name: ${updateData.user.user_metadata?.name || '(not set)'}`);
    console.log(`   New Role: ${updateData.user.user_metadata?.role}`);
    console.log('');

    console.log('⚠️  IMPORTANT: Next Steps:');
    console.log('   1. Go to your app in the browser');
    console.log('   2. Click "Logout"');
    console.log('   3. Login again with ' + email);
    console.log('   4. Your session will now have Admin permissions');
    console.log('   5. Visit /support/users to verify\n');

    console.log('💡 Why logout/login is needed:');
    console.log('   The role is stored in the JWT token. You need a fresh token with the new role.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line args
const email = process.argv[2];

setAdminRole(email);
