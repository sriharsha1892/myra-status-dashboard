#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyLogin() {
  console.log('\n🧪 Testing new simple password...\n');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@myra.ai',
    password: 'admin123456',
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    return;
  }

  console.log('✅ Login works!\n');
  console.log('User:', data.user.email);
  console.log('Role:', data.user.user_metadata?.role);
  console.log('\n✅ Ready to use!\n');
}

verifyLogin();
