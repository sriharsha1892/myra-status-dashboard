#!/usr/bin/env node

/**
 * Create Sriharsha as Super Admin
 * Creates sriharsha@mordorintelligence.com with full admin access
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.log('\nPlease add to .env.local:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_USER = {
  email: 'sriharsha@mordorintelligence.com',
  name: 'Sriharsha',
  role: 'Admin',
  password: 'SriHarsha@2025!' // Change this after first login
};

async function createAdminUser() {
  console.log('\n🔐 Creating Super Admin User\n');
  console.log('═'.repeat(60));

  try {
    // 1. Check if auth user exists
    console.log('\n1️⃣  Checking Supabase Auth...');
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const authUserExists = existingUsers.users.some(u => u.email === ADMIN_USER.email);

    let authUserId;

    if (authUserExists) {
      console.log(`   ✅ Auth user exists: ${ADMIN_USER.email}`);
      authUserId = existingUsers.users.find(u => u.email === ADMIN_USER.email).id;
    } else {
      console.log(`   Creating auth user...`);

      const { data, error } = await supabase.auth.admin.createUser({
        email: ADMIN_USER.email,
        password: ADMIN_USER.password,
        email_confirm: true, // Auto-confirm
        user_metadata: {
          name: ADMIN_USER.name,
          role: ADMIN_USER.role,
        },
      });

      if (error) {
        console.log(`   ❌ Failed to create auth user: ${error.message}`);
        process.exit(1);
      }

      authUserId = data.user.id;
      console.log(`   ✅ Auth user created: ${ADMIN_USER.email}`);
    }

    // 2. Check if user exists in users table
    console.log('\n2️⃣  Checking users table...');
    const { data: existingDbUsers } = await supabase
      .from('users')
      .select('id, email, role, is_super_admin')
      .eq('email', ADMIN_USER.email);

    if (existingDbUsers && existingDbUsers.length > 0) {
      console.log(`   ✅ User exists in database`);
      const dbUser = existingDbUsers[0];

      // Update to super admin if not already
      if (!dbUser.is_super_admin) {
        console.log('   Updating to super admin...');
        const { error } = await supabase
          .from('users')
          .update({
            is_super_admin: true,
            role: 'Admin'
          })
          .eq('id', dbUser.id);

        if (error) {
          console.log(`   ⚠️  Could not update via API: ${error.message}`);
          console.log('\n   Run this SQL in Supabase Dashboard:');
          console.log(`   UPDATE users SET is_super_admin = true, role = 'Admin' WHERE email = '${ADMIN_USER.email}';`);
        } else {
          console.log('   ✅ Updated to super admin');
        }
      } else {
        console.log('   ✅ Already a super admin');
      }
    } else {
      console.log('   Creating user in database...');

      const { error } = await supabase
        .from('users')
        .insert({
          id: authUserId,
          email: ADMIN_USER.email,
          name: ADMIN_USER.name,
          role: 'Admin',
          is_super_admin: true
        });

      if (error) {
        console.log(`   ⚠️  Could not create via API: ${error.message}`);
        console.log('\n   Run this SQL in Supabase Dashboard:');
        console.log(`   INSERT INTO users (id, email, name, role, is_super_admin)`);
        console.log(`   VALUES ('${authUserId}', '${ADMIN_USER.email}', '${ADMIN_USER.name}', 'Admin', true);`);
      } else {
        console.log('   ✅ User created in database');
      }
    }

    // 3. Verify
    console.log('\n3️⃣  Verifying setup...');
    const { data: verifyData } = await supabase
      .from('users')
      .select('email, name, role, is_super_admin')
      .eq('email', ADMIN_USER.email)
      .single();

    if (verifyData) {
      console.log('   ✅ Verification successful:');
      console.log(`      Email: ${verifyData.email}`);
      console.log(`      Name: ${verifyData.name}`);
      console.log(`      Role: ${verifyData.role}`);
      console.log(`      Super Admin: ${verifyData.is_super_admin}`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ SETUP COMPLETE!\n');
    console.log('📧 Your credentials:');
    console.log(`   Email: ${ADMIN_USER.email}`);
    console.log(`   Password: ${ADMIN_USER.password}`);
    console.log(`   Login: https://myra-status-dashboard.vercel.app/support/login`);
    console.log('\n⚠️  Please change your password after first login!\n');
    console.log('Next steps:');
    console.log('1. Apply database migration (see SUPPORT_SYSTEM_STATUS.md)');
    console.log('2. Run: node scripts/check-support-db.js');
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
