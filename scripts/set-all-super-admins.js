#!/usr/bin/env node
/**
 * Set multiple users as Super Admins with Mordor Intelligence
 * Sets: Reddy, Sai Teja, Abin Zacharia, and admin@myra.ai
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

async function setSuperAdmins() {
  // Target user IDs found from check-auth-role.js
  const superAdminIds = [
    'ff2377f7-1436-4bb7-ab7d-f0f1acd3e62b', // Reddy
    '2dc9c795-bd25-4e97-bed3-0add4bac2910', // Sai Teja
    'a70b4146-e217-4118-9428-3d22a89a6de9', // Abin Zacharia
    '84796ddb-6458-4eea-9a67-cfcf73a31f7d'  // admin@myra.ai (already set, but included for completeness)
  ];

  console.log('\n🔧 Setting Super Admin flags for multiple users...\n');

  try {
    // Get all users
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Error fetching users:', error.message);
      process.exit(1);
    }

    let updatedCount = 0;
    let alreadySetCount = 0;

    for (const userId of superAdminIds) {
      const user = data.users.find(u => u.id === userId);

      if (!user) {
        console.error(`⚠️  User ID ${userId} not found, skipping...`);
        continue;
      }

      // Check if already set
      const alreadySuperAdmin = user.user_metadata?.is_super_admin === true;
      const alreadyHasCompany = user.user_metadata?.parent_company === 'Mordor Intelligence';

      console.log(`📋 ${user.user_metadata?.name || user.email || 'Unknown'}`);
      console.log(`   Email: ${user.email || '(not set)'}`);
      console.log(`   Current Role: ${user.user_metadata?.role || '(not set)'}`);
      console.log(`   Current Company: ${user.user_metadata?.parent_company || '(not set)'}`);
      console.log(`   Currently Super Admin: ${user.user_metadata?.is_super_admin || false}`);

      if (alreadySuperAdmin && alreadyHasCompany) {
        console.log(`   ✅ Already configured - skipping\n`);
        alreadySetCount++;
        continue;
      }

      // Update user
      console.log(`   🔄 Updating...`);

      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            ...user.user_metadata,
            role: user.user_metadata?.role || 'Admin',
            parent_company: 'Mordor Intelligence',
            is_super_admin: true
          }
        }
      );

      if (updateError) {
        console.error(`   ❌ Error updating user: ${updateError.message}\n`);
        continue;
      }

      console.log(`   ✅ Updated successfully!\n`);
      updatedCount++;
    }

    console.log('═══════════════════════════════════════\n');
    console.log(`✅ Updated: ${updatedCount} user(s)`);
    console.log(`⏭️  Already configured: ${alreadySetCount} user(s)`);
    console.log(`📊 Total Super Admins: ${updatedCount + alreadySetCount}\n`);

    console.log('⚠️  IMPORTANT: Next Steps for affected users:');
    console.log('   1. Log out from the app');
    console.log('   2. Log in again');
    console.log('   3. Your session will now have Super Admin permissions');
    console.log('   4. Visit /support/users to verify the SUPER ADMIN badge\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setSuperAdmins();
