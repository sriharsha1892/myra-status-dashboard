const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_DB_PASSWORD ?
  process.env.SUPABASE_SERVICE_ROLE_KEY :
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

async function runMigration() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/20251108_trial_automation_system.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📦 Running migration: 20251108_trial_automation_system.sql');
  console.log('Creating tables for trial automation system...\n');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  // Note: This requires direct database access or Supabase SQL editor
  console.log('⚠️  This migration should be run through:');
  console.log('1. Supabase Dashboard > SQL Editor, or');
  console.log('2. Direct PostgreSQL connection using psql\n');
  console.log('Migration file location:');
  console.log(migrationPath);
  console.log('\nTables to be created:');
  console.log('✓ terminology_mappings (with 30+ pre-seeded jargon terms)');
  console.log('✓ import_templates');
  console.log('✓ review_queue');
  console.log('✓ parsing_sessions');
  console.log('✓ learning_decisions');
}

runMigration();
