// Check tickets table access and RLS policies
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkTicketsAccess() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🔍 Checking tickets table access...\n');

  // Test 1: Try to fetch tickets with service role
  console.log('Test 1: Fetch tickets with service role');
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('   ❌ Error:', JSON.stringify(error, null, 2));
    } else {
      console.log(`   ✅ Found ${data.length} tickets`);
      if (data.length > 0) {
        console.log('   Sample ticket:', {
          id: data[0].ticket_id,
          number: data[0].ticket_number,
          source: data[0].source,
          organization: data[0].organization
        });
      }
    }
  } catch (error) {
    console.log('   ❌ Exception:', error.message);
  }

  // Test 2: Check if user exists
  console.log('\nTest 2: Check authenticated users');
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(3);

    if (error) {
      console.log('   ❌ Error:', error.message);
    } else {
      console.log(`   ✅ Found ${users.length} users`);
      users.forEach(u => {
        console.log(`      - ${u.email} (${u.role})`);
      });
    }
  } catch (error) {
    console.log('   ❌ Exception:', error.message);
  }

  // Test 3: Simulate client-side query (without service role)
  console.log('\nTest 3: Simulate client query (anon key)');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const clientSupabase = createClient(supabaseUrl, anonKey);

  try {
    const { data, error } = await clientSupabase
      .from('tickets')
      .select('*')
      .limit(5);

    if (error) {
      console.log('   ❌ Error (expected - RLS policy):', error.message);
      console.log('   💡 This is likely why the page is failing');
    } else {
      console.log(`   ✅ Found ${data.length} tickets (unexpected - RLS may be disabled)`);
    }
  } catch (error) {
    console.log('   ❌ Exception:', error.message);
  }

  console.log('\n📝 Recommendation:');
  console.log('   The tickets page needs to use authenticated requests.');
  console.log('   Make sure the user is logged in and the query uses the user session.');
}

checkTicketsAccess();
