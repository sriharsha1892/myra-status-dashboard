#!/usr/bin/env node
/**
 * Set a simpler password for admin
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function setSimplePassword() {
  const email = 'admin@myra.ai';
  const newPassword = 'admin123456';

  console.log('\n🔑 Setting simple password for admin...\n');

  // Get user
  const { data: users } = await supabase.auth.admin.listUsers();
  const adminUser = users.users.find(u => u.email === email);

  if (!adminUser) {
    console.log('❌ User not found');
    return;
  }

  // Update password
  const { data, error } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    { password: newPassword }
  );

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ Password updated successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    admin@myra.ai');
  console.log('🔑 Password: admin123456');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🌐 Login at: https://myra-status-dashboard.vercel.app/support/login');
  console.log('\n⚠️  IMPORTANT: Type the password manually (don\'t copy/paste)\n');
}

setSimplePassword();
