// Check what columns exist in users table
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkUsersColumns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🔍 Checking users table structure...\n');

  // Get one user record to see what columns exist
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error querying users table:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No users found in table');
    console.log('\n💡 Let me try to insert a test user to see what columns are required...\n');

    // Try inserting with minimal fields
    const testInsert = await supabase
      .from('users')
      .insert({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'test@test.com'
      })
      .select();

    if (testInsert.error) {
      console.log('Insert error reveals required/available columns:');
      console.log(JSON.stringify(testInsert.error, null, 2));
    }
  } else {
    console.log('✅ Found user record. Columns in users table:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\nFull record:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

checkUsersColumns();
