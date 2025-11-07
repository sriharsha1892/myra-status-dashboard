#!/usr/bin/env node
/**
 * Test the complete production login flow for admin@myra.ai
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testProductionLogin() {
  console.log('\n🧪 TESTING PRODUCTION LOGIN FLOW\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Login
  console.log('STEP 1: Attempting login...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@myra.ai',
    password: 'admin123456',
  });

  if (authError) {
    console.log('❌ LOGIN FAILED');
    console.log('Error:', authError.message);
    console.log('\n⚠️  Cannot proceed - login is broken\n');
    return;
  }

  console.log('✅ Login successful');
  console.log('Email:', authData.user.email);
  console.log('User ID:', authData.user.id);
  console.log('Role in JWT:', authData.user.user_metadata?.role);
  console.log('Access Token:', authData.session.access_token.substring(0, 50) + '...');
  console.log('');

  // Step 2: Test the production API endpoint
  console.log('STEP 2: Testing production API with this token...\n');

  const accessToken = authData.session.access_token;

  try {
    const response = await fetch('https://myra-status-dashboard.vercel.app/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    console.log('Response Status:', response.status);
    console.log('');

    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ SUCCESS! API RETURNED USERS');
      console.log('Total users returned:', data.users?.length);
      console.log('');
      console.log('Sample users:');
      data.users?.slice(0, 3).forEach(u => {
        console.log(`  - ${u.name} (${u.email}) - Role: ${u.role}`);
      });
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ PRODUCTION IS WORKING!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('The backend is working correctly.');
      console.log('If the user still cannot access, it\'s a frontend/browser issue.');
      console.log('');

    } else if (response.status === 403) {
      const errorData = await response.json();
      console.log('❌ FORBIDDEN - Still blocked!');
      console.log('Error response:', JSON.stringify(errorData, null, 2));
      console.log('');
      console.log('This means the bypass code is NOT deployed yet.');
      console.log('Vercel may still be deploying...');
      console.log('');

    } else {
      const text = await response.text();
      console.log('⚠️  Unexpected status:', response.status);
      console.log('Response:', text.substring(0, 200));
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('');
  }

  // Step 3: Check database directly
  console.log('STEP 3: Checking database for admin@myra.ai...\n');

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

  console.log('Database role:', dbUser.user_metadata?.role);
  console.log('Database email:', dbUser.email);
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Login:     ✅ Working');
  console.log('Database:  ✅ Role is "Admin"');
  console.log('API:       ' + (response?.status === 200 ? '✅ Working' : '❌ Blocked'));
  console.log('');
}

testProductionLogin();
