#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTodosAPI() {
  console.log('🔐 Logging in as admin@myra.ai...\n');

  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@myra.ai',
    password: 'admin@myRA2025',
  });

  if (authError) {
    console.error('❌ Login failed:', authError.message);
    process.exit(1);
  }

  console.log('✅ Logged in successfully!');
  console.log('   Session:', authData.session.access_token.substring(0, 20) + '...');

  // Test fetching todos via local API
  console.log('\n📋 Testing /api/todos endpoint...\n');

  try {
    const response = await fetch('http://localhost:3000/api/todos?type=my', {
      headers: {
        'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`,
      },
    });

    console.log('Response status:', response.status);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Todos API works!');
      console.log('   Todos count:', data.todos?.length || 0);
    } else {
      console.error('❌ Todos API failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
  }

  // Sign out
  await supabase.auth.signOut();
}

testTodosAPI().catch(console.error);
