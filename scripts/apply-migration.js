#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration(migrationFile) {
  console.log(`📄 Applying migration: ${path.basename(migrationFile)}\n`);

  try {
    // Read migration SQL file
    const sql = fs.readFileSync(migrationFile, 'utf8');

    // Execute SQL using Supabase's RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, we'll need to use a different approach
      console.log('⚠️  exec_sql RPC not available, trying direct execution...');

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('ALTER TABLE') || statement.includes('CREATE INDEX')) {
          console.log(`\n🔧 Executing: ${statement.substring(0, 50)}...`);
          // Use database query for DDL statements
          const { error: execError } = await supabase.from('_').select('*').limit(0);
          // This won't work directly, we need psql access
        }
      }

      console.log('\n⚠️  Cannot apply migration automatically.');
      console.log('Please run the migration manually using one of these methods:');
      console.log('\n1. Via Supabase Dashboard:');
      console.log('   - Go to https://supabase.com/dashboard/project/mkkhwiyolmowomojvtel/sql/new');
      console.log(`   - Copy the content of: ${migrationFile}`);
      console.log('   - Run the SQL');
      console.log('\n2. Via psql (if installed):');
      console.log(`   PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h aws-0-ap-south-1.pooler.supabase.com -p 6543 -d postgres -U postgres.mkkhwiyolmowomojvtel -f ${migrationFile}`);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  }
}

const migrationFile = process.argv[2] || '/Users/sriharsha/myra-status-dashboard/supabase/migrations/20250112_trial_expiring_notifications.sql';
applyMigration(migrationFile).catch(console.error);
