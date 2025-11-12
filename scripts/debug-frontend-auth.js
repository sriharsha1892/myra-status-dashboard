#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create client exactly like frontend does (using anon key, not service role)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('🔍 Testing auth with ANON key (same as frontend)...\n');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Anon Key:', supabaseAnonKey.substring(0, 20) + '...');
  console.log();

  const testCredentials = [
    { email: 'admin@myra.ai', password: 'admin123456' },
    { email: 'admin@myra.ai ', password: 'admin123456' }, // With trailing space
    { email: ' admin@myra.ai', password: 'admin123456' }, // With leading space
  ];

  for (const creds of testCredentials) {
    console.log(`\n🔐 Testing: "${creds.email}" (length: ${creds.email.length})`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: creds.email,
      password: creds.password,
    });

    if (error) {
      console.error('❌ Error:', error.message);
      console.error('   Status:', error.status);
      console.error('   Code:', error.code);
    } else {
      console.log('✅ Success!');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);

      // Sign out after successful test
      await supabase.auth.signOut();
    }
  }

  // Check auth settings
  console.log('\n\n🔧 Checking Supabase Auth Settings...\n');

  try {
    const { data: settings, error: settingsError } = await supabase
      .from('users')
      .select('email, role, is_super_admin')
      .eq('email', 'admin@myra.ai')
      .single();

    if (settingsError) {
      console.error('❌ Error fetching user:', settingsError.message);
    } else {
      console.log('✅ User found in database:');
      console.log('   Email:', settings.email);
      console.log('   Role:', settings.role);
      console.log('   Super Admin:', settings.is_super_admin);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

testAuth().catch(console.error);
