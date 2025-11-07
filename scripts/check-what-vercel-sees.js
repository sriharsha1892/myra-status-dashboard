#!/usr/bin/env node
/**
 * Check what role the Vercel API actually sees
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkWhatVercelSees() {
  console.log('\n🔍 Checking what your current session has...\n');

  // First, login to get a session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@myra.ai',
    password: 'admin123456',
  });

  if (authError) {
    console.error('❌ Login failed:', authError.message);
    return;
  }

  console.log('✅ Login successful');
  console.log('Email:', authData.user.email);
  console.log('User ID:', authData.user.id);
  console.log('Role in metadata:', authData.user.user_metadata?.role);
  console.log('');

  // Now test the API endpoint with this token
  const accessToken = authData.session.access_token;

  console.log('📡 Testing /api/admin/users with this token...\n');

  try {
    const response = await fetch('https://myra-status-dashboard.vercel.app/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('Status:', response.status);

    if (response.status === 403) {
      const errorData = await response.json();
      console.log('❌ REJECTED:', errorData);
      console.log('');
      console.log('🔍 This means the API is rejecting your role.');
      console.log('Your role in JWT:', authData.user.user_metadata?.role);
      console.log('');
      console.log('Checking database directly...');

      // Check database directly
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: { user: dbUser }, error: dbError } = await adminClient.auth.admin.getUserById(authData.user.id);

      if (dbError) {
        console.error('❌ Database error:', dbError.message);
        return;
      }

      console.log('');
      console.log('Database says:');
      console.log('  Role:', dbUser.user_metadata?.role);
      console.log('  All metadata:', JSON.stringify(dbUser.user_metadata, null, 2));
      console.log('');

      if (dbUser.user_metadata?.role !== authData.user.user_metadata?.role) {
        console.log('❌ MISMATCH! Database has different role than your session!');
        console.log('   Session role:', authData.user.user_metadata?.role);
        console.log('   Database role:', dbUser.user_metadata?.role);
        console.log('');
        console.log('🔥 YOU MUST LOGOUT AND LOGIN AGAIN!');
      }

    } else if (response.status === 200) {
      const data = await response.json();
      console.log('✅ SUCCESS! API returned', data.users?.length, 'users');
    } else {
      console.log('⚠️  Unexpected status:', response.status);
      const text = await response.text();
      console.log('Response:', text.substring(0, 200));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkWhatVercelSees();
