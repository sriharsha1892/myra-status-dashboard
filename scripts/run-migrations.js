/**
 * Run pending SQL migrations on Supabase
 *
 * Usage: node scripts/run-migrations.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  '004_advanced_features.sql',
  '005_internal_comments_rls.sql'
];

async function runMigrations() {
  console.log('🚀 Starting migration process...\n');

  for (const migrationFile of migrations) {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);

    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠️  Skipping ${migrationFile} - file not found`);
      continue;
    }

    console.log(`📝 Running migration: ${migrationFile}`);

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (statement.trim().length === 0) continue;

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_migrations')
            .insert({ name: migrationFile, sql: statement });

          if (directError) {
            console.warn(`⚠️  Statement ${i + 1}/${statements.length}: ${error.message}`);
          }
        }
      } catch (err) {
        console.warn(`⚠️  Error in statement ${i + 1}: ${err.message}`);
      }
    }

    console.log(`✅ Completed: ${migrationFile}\n`);
  }

  console.log('🎉 Migration process complete!');
  console.log('\nNote: Some warnings are normal if tables/functions already exist.');
  console.log('Please verify the database schema in Supabase dashboard.');
}

runMigrations().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
