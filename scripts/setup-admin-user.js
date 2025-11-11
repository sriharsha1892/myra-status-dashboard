#!/usr/bin/env node

/**
 * Setup Admin User
 * Creates or updates sriharsha@mordorintelligence.com as super admin
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = 'sriharsha@mordorintelligence.com';

async function setupAdminUser() {
  console.log('🔧 Setting up admin user...\n');

  try {
    // 1. Check if user exists
    console.log('1️⃣  Checking if user exists...');
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id, email, role, is_super_admin')
      .eq('email', ADMIN_EMAIL);

    if (checkError) {
      console.log('   ❌ Error checking users:', checkError.message);
      return;
    }

    if (existingUsers && existingUsers.length > 0) {
      const user = existingUsers[0];
      console.log(`   ✅ User found: ${user.email}`);
      console.log(`      Current role: ${user.role || 'null'}`);
      console.log(`      Super admin: ${user.is_super_admin || false}`);

      // 2. Update to super admin if not already
      if (!user.is_super_admin) {
        console.log('\n2️⃣  Setting as super admin...');
        const { error: updateError } = await supabase
          .from('users')
          .update({
            is_super_admin: true,
            role: 'Admin' // Make sure role is set too
          })
          .eq('id', user.id);

        if (updateError) {
          console.log('   ❌ Error updating user:', updateError.message);
          console.log('\n   💡 Try running this SQL in Supabase Dashboard:');
          console.log(`   UPDATE users SET is_super_admin = true, role = 'Admin' WHERE email = '${ADMIN_EMAIL}';`);
        } else {
          console.log('   ✅ User updated successfully!');

          // Verify update
          const { data: verifyData } = await supabase
            .from('users')
            .select('email, role, is_super_admin')
            .eq('id', user.id)
            .single();

          if (verifyData) {
            console.log('\n   ✨ Verification:');
            console.log(`      Email: ${verifyData.email}`);
            console.log(`      Role: ${verifyData.role}`);
            console.log(`      Super Admin: ${verifyData.is_super_admin}`);
          }
        }
      } else {
        console.log('\n   ℹ️  User is already a super admin!');
      }
    } else {
      console.log(`   ⚠️  User ${ADMIN_EMAIL} not found in users table`);
      console.log('\n   📋 You need to create this user first.');
      console.log('   Options:');
      console.log('   1. Create via Supabase Auth (Sign up through the app)');
      console.log('   2. Use the create-user script if available');
      console.log('   3. Run this SQL in Supabase Dashboard:\n');
      console.log(`   INSERT INTO users (email, role, is_super_admin)`);
      console.log(`   VALUES ('${ADMIN_EMAIL}', 'Admin', true);`);
      console.log('\n   Note: You may also need to create an auth user if using Supabase Auth.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Apply database migration: See docs/SUPPORT_SYSTEM_SETUP.md');
    console.log('2. Verify setup: node scripts/check-support-db.js');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupAdminUser();
