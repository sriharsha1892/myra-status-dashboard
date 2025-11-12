#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdminUser() {
  console.log('🔍 Checking admin@myra.ai user in production...\n');

  // Check in users table
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@myra.ai')
    .single();

  if (userError) {
    console.error('❌ Error fetching user from users table:', userError.message);
  } else if (user) {
    console.log('✅ User found in users table:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Full Name:', user.full_name);
    console.log('   Role:', user.role);
    console.log('   Is Super Admin:', user.is_super_admin);
    console.log('   Created:', user.created_at);
  } else {
    console.log('❌ User NOT found in users table');
  }

  // Check in Supabase Auth
  console.log('\n🔍 Checking Supabase Auth users...\n');

  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching auth users:', authError.message);
  } else {
    const adminUser = authData.users.find(u => u.email === 'admin@myra.ai');

    if (adminUser) {
      console.log('✅ User found in Supabase Auth:');
      console.log('   ID:', adminUser.id);
      console.log('   Email:', adminUser.email);
      console.log('   Email Confirmed:', adminUser.email_confirmed_at ? 'Yes' : 'No');
      console.log('   Created:', adminUser.created_at);
      console.log('   Last Sign In:', adminUser.last_sign_in_at || 'Never');
    } else {
      console.log('❌ User NOT found in Supabase Auth');
    }
  }

  // Try to authenticate
  console.log('\n🔐 Testing authentication with admin123456...\n');

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@myra.ai',
    password: 'admin123456',
  });

  if (signInError) {
    console.error('❌ Authentication failed:', signInError.message);
  } else {
    console.log('✅ Authentication successful!');
    console.log('   User ID:', signInData.user.id);
    console.log('   Email:', signInData.user.email);
  }
}

checkAdminUser().catch(console.error);
