#!/usr/bin/env node
/**
 * Check user's role in Supabase Auth
 * Usage: node scripts/check-auth-role.js [email]
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

async function checkAuthRole(email) {
  console.log('\n🔍 Checking Supabase Auth role...\n');

  try {
    // Get all users from Supabase Auth
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Error fetching users:', error.message);
      process.exit(1);
    }

    console.log(`📊 Total users in Supabase Auth: ${data.users.length}\n`);

    if (email) {
      // Check specific user
      const user = data.users.find(u => u.email === email);

      if (!user) {
        console.error(`❌ User not found: ${email}`);
        console.log('\n💡 Available users:');
        data.users.forEach(u => {
          console.log(`   - ${u.email}`);
        });
        process.exit(1);
      }

      console.log('👤 User Details:');
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.user_metadata?.name || '(not set)'}`);
      console.log(`   Role: ${user.user_metadata?.role || '(not set)'}`);
      console.log(`   Parent Company: ${user.user_metadata?.parent_company || '(not set)'}`);
      console.log(`   Is Super Admin: ${user.user_metadata?.is_super_admin || false}`);
      console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last Sign In: ${user.last_sign_in_at || '(never)'}`);

      console.log('\n🔐 Authorization Status:');
      const hasAdminRole = user.user_metadata?.role?.toLowerCase() === 'admin';
      const isAdminBypass = user.email === 'admin@myra.ai';

      if (hasAdminRole) {
        console.log('   ✅ HAS Admin role - should be able to access users page');
      } else if (isAdminBypass) {
        console.log('   ✅ Has admin@myra.ai bypass - should be able to access users page');
      } else {
        console.log(`   ❌ DOES NOT have Admin role (current: ${user.user_metadata?.role || 'none'})`);
        console.log('   ❌ Cannot access /support/users page');
        console.log('\n💡 To fix: Run `node scripts/set-admin-role.js ' + email + '`');
      }
    } else {
      // Show all users
      console.log('👥 All Supabase Auth Users:\n');
      data.users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.user_metadata?.name || '(not set)'}`);
        console.log(`   Role: ${user.user_metadata?.role || '(not set)'}`);
        console.log(`   Parent Company: ${user.user_metadata?.parent_company || '(not set)'}`);
        console.log(`   Is Super Admin: ${user.user_metadata?.is_super_admin || false}`);
        console.log(`   Status: ${user.email_confirmed_at ? 'Active' : 'Invited'}`);
        console.log(`   Last Sign In: ${user.last_sign_in_at || '(never)'}`);
        console.log('');
      });

      console.log('💡 To check a specific user: node scripts/check-auth-role.js your@email.com');
    }

    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line args
const email = process.argv[2];

checkAuthRole(email);
