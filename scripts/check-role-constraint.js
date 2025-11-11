// Check role constraint by trying different values
require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');

async function checkRoleConstraint() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!dbPassword) {
    console.error('❌ Missing SUPABASE_DB_PASSWORD');
    process.exit(1);
  }

  console.log('🔍 Checking users table constraints...\n');

  try {
    // Get constraint definition
    const result = execSync(
      `PGPASSWORD="${dbPassword}" psql -h aws-0-ap-south-1.pooler.supabase.com -p 6543 -d postgres -U postgres.mkkhwiyolmowomojvtel -c "SELECT conname, pg_get_constraintdef(oid) as definition FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'c';"`,
      { encoding: 'utf-8' }
    );
    console.log('Check constraints:\n');
    console.log(result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkRoleConstraint();
