#!/usr/bin/env node
/**
 * Test login with admin credentials
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  console.log('\n🔐 Testing login with admin@myra.ai...\n');

  const email = 'admin@myra.ai';
  const password = 'AdminPass2025!';

  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      console.error('Error code:', error.status);
      console.error('Full error:', JSON.stringify(error, null, 2));

      // Try to get user info
      console.log('\n🔍 Checking if user exists in database...');
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const adminUser = users.users.find(u => u.email === email);

      if (adminUser) {
        console.log('✅ User exists in database');
        console.log('User ID:', adminUser.id);
        console.log('Email confirmed:', adminUser.email_confirmed_at ? 'YES' : 'NO');
        console.log('Role:', adminUser.user_metadata?.role);
        console.log('Created:', adminUser.created_at);
      } else {
        console.log('❌ User not found in database');
      }

      return;
    }

    console.log('✅ Login successful!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Role:', data.user.user_metadata?.role);
    console.log('Session:', data.session ? 'Created' : 'None');
    console.log('\n✅ You should be able to login with these credentials!\n');

  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
}

testLogin();
