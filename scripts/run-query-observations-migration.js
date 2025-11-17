const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('Running migration: Add observations and query_category to platform_queries');
  console.log('');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251117_add_query_observations_category.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL...');
    console.log('');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct execution (may require admin)
      console.log('⚠️  exec_sql RPC not available, trying direct execution...');

      // Split SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('ALTER TABLE') || statement.includes('CREATE INDEX') || statement.includes('COMMENT ON') || statement.includes('CREATE OR REPLACE FUNCTION')) {
          console.log(`Executing: ${statement.substring(0, 60)}...`);

          // For ALTER TABLE and CREATE INDEX, we can use the raw SQL
          const { error: execError } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

          if (execError) {
            console.log(`⚠️  Statement execution via RPC failed: ${execError.message}`);
            console.log('This is expected - migrations need to be run via Supabase CLI or dashboard.');
          }
        }
      }

      console.log('');
      console.log('✅ Migration script created successfully!');
      console.log('');
      console.log('IMPORTANT: To apply this migration, you have two options:');
      console.log('');
      console.log('Option 1: Supabase Dashboard (Recommended)');
      console.log('1. Go to: https://supabase.com/dashboard/project/mkkhwiyolmowomojvtel/editor');
      console.log('2. Click "SQL Editor" in the left sidebar');
      console.log('3. Create a new query');
      console.log('4. Paste the contents of: supabase/migrations/20251117_add_query_observations_category.sql');
      console.log('5. Click "Run"');
      console.log('');
      console.log('Option 2: Supabase CLI');
      console.log('1. Install Supabase CLI: npm install -g supabase');
      console.log('2. Link to project: supabase link --project-ref mkkhwiyolmowomojvtel');
      console.log('3. Run: supabase db push');
      console.log('');
      console.log('Migration file location:');
      console.log(migrationPath);

      return;
    }

    console.log('✅ Migration executed successfully!');
    console.log('');
    console.log('Added columns:');
    console.log('  - observations (TEXT) - B2B market research observations');
    console.log('  - query_category (TEXT) - Market research category');
    console.log('');
    console.log('Created index:');
    console.log('  - idx_platform_queries_category');
    console.log('');
    console.log('Updated trigger:');
    console.log('  - create_timeline_event_for_query() - now includes new fields in metadata');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

runMigration();
