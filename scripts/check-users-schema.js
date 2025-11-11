// Check users table schema
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkUsersSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl || !dbPassword) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  const { execSync } = require('child_process');

  console.log('🔍 Checking users table schema...\n');

  try {
    const result = execSync(
      `PGPASSWORD="${dbPassword}" psql -h aws-0-ap-south-1.pooler.supabase.com -p 6543 -d postgres -U postgres.mkkhwiyolmowomojvtel -c "\\d users"`,
      { encoding: 'utf-8' }
    );
    console.log(result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUsersSchema();
