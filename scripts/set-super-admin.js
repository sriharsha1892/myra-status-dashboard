#!/usr/bin/env node
/**
 * Set admin@myra.ai as Super Admin in Supabase Auth
 * This script sets the is_super_admin flag in user_metadata
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

async function setSuperAdmin() {
  const targetEmail = 'admin@myra.ai';

  console.log('\n🔧 Setting Super Admin flag in Supabase Auth...\n');

  try {
    // Find user by email
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Error fetching users:', error.message);
      process.exit(1);
    }

    const user = data.users.find(u => u.email === targetEmail);

    if (!user) {
      console.error(`❌ User not found: ${targetEmail}`);
      console.log('\n💡 Available users:');
      data.users.forEach(u => {
        console.log(`   - ${u.email}`);
      });
      process.exit(1);
    }

    console.log('📋 Current User Info:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.user_metadata?.name || '(not set)'}`);
    console.log(`   Role: ${user.user_metadata?.role || '(not set)'}`);
    console.log(`   Parent Company: ${user.user_metadata?.parent_company || '(not set)'}`);
    console.log(`   Is Super Admin: ${user.user_metadata?.is_super_admin || false}`);
    console.log('');

    // Update user to set super admin flag and ensure proper defaults
    console.log('🔄 Setting Super Admin flag...');

    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          role: user.user_metadata?.role || 'Admin',
          parent_company: user.user_metadata?.parent_company || 'Mordor Intelligence',
          is_super_admin: true
        }
      }
    );

    if (updateError) {
      console.error('❌ Error updating user:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Successfully set Super Admin flag!\n');
    console.log('📋 Updated User Info:');
    console.log(`   Email: ${updateData.user.email}`);
    console.log(`   Name: ${updateData.user.user_metadata?.name || '(not set)'}`);
    console.log(`   Role: ${updateData.user.user_metadata?.role}`);
    console.log(`   Parent Company: ${updateData.user.user_metadata?.parent_company}`);
    console.log(`   Is Super Admin: ${updateData.user.user_metadata?.is_super_admin}`);
    console.log('');

    console.log('⚠️  IMPORTANT: Next Steps:');
    console.log('   1. Go to your app in the browser');
    console.log('   2. Click "Logout"');
    console.log('   3. Login again with ' + targetEmail);
    console.log('   4. Your session will now have Super Admin permissions');
    console.log('   5. Visit /support/users to verify the SUPER ADMIN badge\n');

    console.log('💡 Why logout/login is needed:');
    console.log('   The metadata is stored in the JWT token. You need a fresh token with the new flags.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setSuperAdmin();
