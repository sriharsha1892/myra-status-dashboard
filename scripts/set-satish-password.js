#!/usr/bin/env node
/**
 * Set password for Satish Boini
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setSatishPassword() {
  console.log('\n🔑 Setting password for Satish Boini...\n');

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

  const email = 'satish.boini@mordorintelligence.com';
  const password = 'Satish123!'; // Strong temporary password

  // Find user
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const user = users.users.find(u => u.email === email);

  if (!user) {
    console.error('❌ User not found:', email);
    return;
  }

  console.log('Found user:');
  console.log('  Name:', user.user_metadata?.name);
  console.log('  Email:', user.email);
  console.log('  Role:', user.user_metadata?.role);
  console.log('');

  // Set password
  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { password }
  );

  if (error) {
    console.error('❌ Error setting password:', error.message);
    return;
  }

  console.log('✅ Password set successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Name:     Satish Boini');
  console.log('📧 Email:    satish.boini@mordorintelligence.com');
  console.log('🔑 Password: Satish123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🌐 Login at: https://myra-status-dashboard.vercel.app/support/login');
  console.log('');
  console.log('✅ Satish can now login immediately with these credentials');
  console.log('');
}

setSatishPassword();
