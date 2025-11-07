#!/usr/bin/env node

/**
 * Batch User Creation Script - Create All 13 Users at Once
 *
 * This script creates all 13 users with the new direct password system.
 * No tokens, no emails - just instant access!
 *
 * Usage: node scripts/create-all-users.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// All 13 users with roles and temporary passwords
const USERS_TO_CREATE = [
  // Account Managers (7 users)
  { email: 'krati@mordorintelligence.com', name: 'Krati Agarwal', role: 'Account Manager', password: 'Krati@2025!' },
  { email: 'kartheek@mordorintelligence.com', name: 'Kartheek Puttaparthini', role: 'Account Manager', password: 'Kartheek@2025!' },
  { email: 'satyanath@mordorintelligence.com', name: 'Satyanath P', role: 'Account Manager', password: 'Satyanath@2025!' },
  { email: 'kirandeep.kaur@mordorintelligence.com', name: 'Kirandeep Kaur', role: 'Account Manager', password: 'Kirandeep@2025!' },
  { email: 'rupak.dalapathi@mordorintelligence.com', name: 'Rupak Dalapathi', role: 'Account Manager', password: 'Rupak@2025!' },
  { email: 'satish.boini@mordorintelligence.com', name: 'Satish Boini', role: 'Account Manager', password: 'Satish@2025!' },
  { email: 'nikita@mordorintelligence.com', name: 'Nikita', role: 'Team', password: 'Nikita@2025!' },

  // Admins (6 users)
  { email: 'adi@mordorintelligence.com', name: 'Aditya Pisupati', role: 'Admin', password: 'Aditya@2025!' },
  { email: 'abin.zacharia@mordorintelligence.com', name: 'Abin Zacharia', role: 'Admin', password: 'Abin@2025!' },
  { email: 'sai.teja@mordorintelligence.com', name: 'Sai Teja', role: 'Admin', password: 'SaiTeja@2025!' },
  { email: 'vivek.sikaria@mordorintelligence.com', name: 'Vivek Sikaria', role: 'Admin', password: 'Vivek@2025!' },
  { email: 'reddy@mordorintelligence.com', name: 'Reddy', role: 'Admin', password: 'Reddy@2025!' },
];

async function createUser(userData) {
  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers.users.some(u => u.email === userData.email);

    if (userExists) {
      console.log(`   ⚠️  ${userData.email} - Already exists (skipped)`);
      return { success: false, reason: 'exists', ...userData };
    }

    // Create user with direct password
    const { data, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm (no email needed)
      user_metadata: {
        name: userData.name,
        role: userData.role,
      },
    });

    if (error) {
      console.log(`   ❌ ${userData.email} - Failed: ${error.message}`);
      return { success: false, reason: error.message, ...userData };
    }

    console.log(`   ✅ ${userData.email} - Created successfully`);
    return { success: true, ...userData, userId: data.user.id };

  } catch (error) {
    console.log(`   ❌ ${userData.email} - Error: ${error.message}`);
    return { success: false, reason: error.message, ...userData };
  }
}

async function createAllUsers() {
  console.log('\n🚀 Creating All 13 Users with Direct Password System\n');
  console.log('═'.repeat(60));
  console.log('');

  const results = [];

  for (const user of USERS_TO_CREATE) {
    const result = await createUser(user);
    results.push(result);
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('');
  console.log('═'.repeat(60));
  console.log('\n📊 Summary\n');

  const created = results.filter(r => r.success);
  const skipped = results.filter(r => !r.success && r.reason === 'exists');
  const failed = results.filter(r => !r.success && r.reason !== 'exists');

  console.log(`✅ Successfully created: ${created.length}`);
  console.log(`⚠️  Already existed: ${skipped.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log('');

  if (created.length > 0) {
    console.log('═'.repeat(60));
    console.log('\n📧 CREDENTIALS TO SHARE\n');
    console.log('Copy and send to each user:\n');

    created.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.name} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Login: https://myra-status-dashboard.vercel.app/support/login`);
      console.log('');
    });

    console.log('═'.repeat(60));
    console.log('\n✨ Users can login immediately - NO waiting for emails!\n');
  }

  if (failed.length > 0) {
    console.log('⚠️  Failed Users:\n');
    failed.forEach(user => {
      console.log(`   - ${user.email}: ${user.reason}`);
    });
    console.log('');
  }

  console.log('Next steps:');
  console.log('1. Copy credentials above');
  console.log('2. Share with each user (Slack/Email/Teams)');
  console.log('3. Users login at: https://myra-status-dashboard.vercel.app/support/login');
  console.log('4. Done! 🎉\n');
}

createAllUsers();
