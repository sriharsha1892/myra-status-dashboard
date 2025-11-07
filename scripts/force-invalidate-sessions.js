#!/usr/bin/env node
/**
 * Force invalidate ALL sessions for admin user
 * This will force a completely fresh login
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function forceInvalidateSessions() {
  console.log('\n🔥 Force invalidating ALL sessions for admin@myra.ai...\n');

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Find admin user
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const adminUser = users.users.find(u => u.email === 'admin@myra.ai');

  if (!adminUser) {
    console.log('❌ admin@myra.ai user not found');
    return;
  }

  console.log(`Found user: ${adminUser.email}`);
  console.log(`User ID: ${adminUser.id}`);
  console.log(`Current role: ${adminUser.user_metadata?.role}`);
  console.log('');

  // Sign out all sessions for this user
  const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(adminUser.id);

  if (signOutError) {
    console.error('❌ Error signing out sessions:', signOutError.message);
    return;
  }

  console.log('✅ All sessions invalidated for admin@myra.ai');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 NEXT STEPS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('1. Open an INCOGNITO/PRIVATE browser window');
  console.log('   (This is critical to avoid any cached data)');
  console.log('');
  console.log('2. Go to: https://myra-status-dashboard.vercel.app/support/login');
  console.log('');
  console.log('3. Login with:');
  console.log('   Email:    admin@myra.ai');
  console.log('   Password: admin123456');
  console.log('');
  console.log('4. You should now have full access to /support/users');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

forceInvalidateSessions();
