#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Applying Timeline system migration...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251110_timeline_system.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments
    if (statement.startsWith('--')) continue;

    try {
      // Use the Supabase client to execute raw SQL
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error.message);
        errorCount++;
      } else {
        successCount++;
        if (statement.includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/)?.[1];
          console.log(`✅ Created table: ${tableName}`);
        } else if (statement.includes('INSERT INTO')) {
          const tableName = statement.match(/INSERT INTO (\w+)/)?.[1];
          if (tableName === 'event_type_taxonomy') {
            console.log(`✅ Seeded event types`);
          }
        }
      }
    } catch (err) {
      console.error(`❌ Error on statement ${i + 1}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration complete:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. This might be normal if tables already exist.');
    console.log('   Try running the migration through Supabase Dashboard SQL Editor instead.');
  } else {
    console.log('\n🎉 All tables created successfully!');
  }
}

runMigration().catch(err => {
  console.error('💥 Migration failed:', err.message);
  console.log('\n📝 Manual migration steps:');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Open your project: mkkhwiyolmowomojvtel');
  console.log('   3. Click "SQL Editor" in the sidebar');
  console.log('   4. Copy the contents of: supabase/migrations/20251110_timeline_system.sql');
  console.log('   5. Paste and click "Run"');
  process.exit(1);
});
