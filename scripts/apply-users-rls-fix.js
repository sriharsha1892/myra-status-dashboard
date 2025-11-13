require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function applyMigration() {
  console.log('🔧 Applying users RLS fix migration...\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250113_fix_users_rls_infinite_recursion.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Remove comments and split into individual statements
  const statements = migrationSQL
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`[${i + 1}/${statements.length}] Executing...`);
    console.log(statement.substring(0, 100) + '...\n');

    try {
      // Execute via supabase-js (this uses the service role)
      const { error } = await supabase.rpc('exec_sql', { query: statement });

      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`);
        console.error(error);
        console.error(`\nStatement was: ${statement}\n`);
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      }
    } catch (err) {
      console.error(`❌ Exception executing statement ${i + 1}:`);
      console.error(err);
    }
  }

  console.log('\n🧪 Testing if the fix worked...\n');

  // Test query that was failing before
  const { data, error } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, parent_company')
    .limit(5);

  if (error) {
    console.log('❌ Test query still failing:');
    console.log(JSON.stringify(error, null, 2));

    if (error.code === '42P17') {
      console.log('\n⚠️  Still getting infinite recursion error!');
      console.log('The migration may not have applied correctly.');
      console.log('Try applying it manually via Supabase Dashboard SQL editor.');
    }
  } else {
    console.log('✅ Test query SUCCESSFUL!');
    console.log(`Found ${data.length} trial organizations`);
    console.log('Sample data:', data[0]);
    console.log('\n🎉 THE FIX WORKED! Console errors should be resolved.');
  }
}

applyMigration().catch(console.error);
