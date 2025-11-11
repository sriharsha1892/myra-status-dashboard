#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTables() {
  console.log('🔄 Creating Timeline tables...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251110_timeline_system.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📋 Migration SQL ready');
  console.log('📝 File path:', migrationPath);
  console.log('📊 Size:', sql.length, 'bytes\n');

  console.log('⚠️  MANUAL STEP REQUIRED:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/mkkhwiyolmowomojvtel/sql/new');
  console.log('2. Copy the SQL from: supabase/migrations/20251110_timeline_system.sql');
  console.log('3. Paste it into the SQL Editor');
  console.log('4. Click "Run" (or press Cmd/Ctrl + Enter)\n');

  console.log('📄 Or use this command to copy the SQL to clipboard (macOS):');
  console.log('   cat supabase/migrations/20251110_timeline_system.sql | pbcopy\n');

  console.log('✅ Then come back here and the import should work!\n');

  // Save SQL to a temporary file for easy access
  const tempFile = path.join(__dirname, 'MIGRATION_TO_RUN.sql');
  fs.writeFileSync(tempFile, sql);
  console.log('💾 SQL saved to:', tempFile);
  console.log('   You can copy from this file instead\n');
}

createTables();
