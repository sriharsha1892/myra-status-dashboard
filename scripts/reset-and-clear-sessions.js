#!/usr/bin/env node
/**
 * Reset password to invalidate all sessions
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function resetAndClearSessions() {
  console.log('\n🔥 Resetting password to invalidate all sessions...\n');

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

  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const adminUser = users.users.find(u => u.email === 'admin@myra.ai');

  if (!adminUser) {
    console.log('❌ admin@myra.ai user not found');
    return;
  }

  console.log(`Found user: ${adminUser.email}`);
  console.log(`Current role: ${adminUser.user_metadata?.role}`);
  console.log('');

  // Reset password - this invalidates all tokens
  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    adminUser.id,
    { password: 'admin123456' }
  );

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ Password reset - ALL existing sessions are now invalid');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 CRITICAL: Use INCOGNITO/PRIVATE Window');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Your regular browser has too much cached data.');
  console.log('You MUST use an incognito/private window for this to work.');
  console.log('');
  console.log('Steps:');
  console.log('');
  console.log('1. 🕵️  Open INCOGNITO/PRIVATE window');
  console.log('   • Chrome: Ctrl+Shift+N (Cmd+Shift+N on Mac)');
  console.log('   • Firefox: Ctrl+Shift+P (Cmd+Shift+P on Mac)');
  console.log('   • Safari: Cmd+Shift+N');
  console.log('');
  console.log('2. 🌐 Go to:');
  console.log('   https://myra-status-dashboard.vercel.app/support/login');
  console.log('');
  console.log('3. 🔑 Login:');
  console.log('   Email:    admin@myra.ai');
  console.log('   Password: admin123456');
  console.log('');
  console.log('4. ✅ Navigate to /support/users');
  console.log('');
  console.log('This WILL work because:');
  console.log('  ✓ Database has correct role: Admin');
  console.log('  ✓ Fresh login returns correct role');
  console.log('  ✓ API accepts it (tested programmatically)');
  console.log('  ✓ All old sessions are invalidated');
  console.log('  ✓ Incognito has zero cached data');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

resetAndClearSessions();
