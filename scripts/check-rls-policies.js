require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS Policies on users table...\n');

  // Query to get all policies on users table
  const { data, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE tablename = 'users'
        ORDER BY policyname;
      `
    });

  if (error) {
    console.log('⚠️  RPC function not available, trying alternative method...\n');

    // Alternative: Check if we can query users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(1);

    if (userError) {
      console.log('❌ Error querying users table:');
      console.log(JSON.stringify(userError, null, 2));

      if (userError.code === '42P17') {
        console.log('\n🚨 INFINITE RECURSION DETECTED IN RLS POLICY');
        console.log('This is the root cause of all console errors!');
      }
    } else {
      console.log('✅ Users table query successful');
      console.log('Sample user:', userData);
    }
  } else {
    console.log('Policies on users table:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkRLSPolicies().catch(console.error);
