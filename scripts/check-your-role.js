#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkYourRole() {
  const { data: users } = await supabase.auth.admin.listUsers();

  console.log('\n🔍 ALL USERS AND THEIR ROLES:\n');
  users.users.forEach(u => {
    const role = u.user_metadata ? u.user_metadata.role : 'NOT SET';
    console.log(`Email: ${u.email}`);
    console.log(`Role: ${role}`);
    console.log(`ID: ${u.id}`);
    console.log(`Email Confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'}`);
    console.log('---');
  });

  console.log(`\nTotal users: ${users.users.length}`);
}

checkYourRole();
