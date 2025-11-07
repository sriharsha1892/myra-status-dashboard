#!/usr/bin/env node

/**
 * ADMIN PASSWORD RESET TOOL
 *
 * Quick workaround for password reset emails not working.
 * Admin can manually reset any user's password.
 *
 * Usage:
 *   node scripts/reset-user-password.js user@example.com newPassword123
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetPassword(email, newPassword) {
  try {
    console.log(`\n🔍 Looking for user: ${email}...`);

    // Find user
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.error(`\n❌ User not found: ${email}`);
      console.log('\nAvailable users:');
      users.users.forEach(u => console.log(`  - ${u.email}`));
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`   Name: ${user.user_metadata?.name || '(none)'}`);
    console.log(`   Role: ${user.user_metadata?.role || '(none)'}\n`);

    // Reset password
    console.log(`🔄 Resetting password...`);

    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) throw error;

    console.log(`\n✅ Password reset successful!`);
    console.log(`\n📋 Send this to the user:`);
    console.log(`─`.repeat(60));
    console.log(`\nYour password has been reset by an administrator.`);
    console.log(`\nLogin URL: ${process.env.NEXT_PUBLIC_APP_URL || 'https://myra-status-dashboard.vercel.app'}/support/login`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log(`\nPlease change your password after logging in.`);
    console.log(`\n─`.repeat(60));
    console.log(`\n💡 User can now log in immediately with this password.\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('❌ Invalid usage\n');
  console.log('Usage:');
  console.log('  node scripts/reset-user-password.js user@example.com newPassword123\n');
  console.log('Example:');
  console.log('  node scripts/reset-user-password.js satish.boini@mordorintelligence.com TempPass2025!\n');
  process.exit(1);
}

const [email, newPassword] = args;

if (newPassword.length < 6) {
  console.error('❌ Password must be at least 6 characters long\n');
  process.exit(1);
}

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║          ADMIN PASSWORD RESET TOOL                             ║');
console.log('║          Quick fix for password reset emails not working      ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

resetPassword(email, newPassword).catch(console.error);
