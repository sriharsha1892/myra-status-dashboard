require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('🔍 Checking trial_organizations table schema...\n');

  // Get a sample record to see structure
  const { data, error } = await supabase
    .from('trial_organizations')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log('✅ trial_organizations columns:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\nColumn names:');
  Object.keys(data).forEach(key => {
    console.log(`  - ${key}`);
  });
}

checkSchema();
