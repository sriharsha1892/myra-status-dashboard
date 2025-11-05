#!/usr/bin/env node

/**
 * Migration Script: Add email and calendar features
 * Run this with: node scripts/run-email-calendar-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting migration: Add email and calendar features');
  console.log('📍 Supabase URL:', supabaseUrl);

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/006_email_calendar_features.sql');
    console.log('\n1️⃣ Reading migration file:', migrationPath);

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file read successfully');

    // Execute the migration
    console.log('\n2️⃣ Executing migration SQL...');
    console.log('   This will create:');
    console.log('   - email_threads table');
    console.log('   - calendar_integrations table');
    console.log('   - ticket_calendar_events table');
    console.log('   - Associated indexes and RLS policies');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Total statements to execute: ${statements.length}`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          // Some statements might fail if they already exist, which is OK
          console.log(`   ⚠️  Statement ${i + 1}: ${error.message.substring(0, 80)}...`);
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`   ⚠️  Statement ${i + 1}: ${err.message.substring(0, 80)}...`);
      }
    }

    // Verify tables exist
    console.log('\n3️⃣ Verifying tables exist...');

    const tables = ['email_threads', 'calendar_integrations', 'ticket_calendar_events'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error && error.code === 'PGRST204') {
        console.log(`   ⚠️  Table "${table}" might be empty (this is OK)`);
      } else if (error) {
        console.error(`   ❌ Table "${table}" verification failed:`, error.message);
      } else {
        console.log(`   ✅ Table "${table}" verified`);
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log('\n📝 Note: If you see errors above, you may need to run the SQL manually in Supabase Dashboard > SQL Editor');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error('\n📝 Please run the SQL manually in Supabase Dashboard > SQL Editor:');
    console.error('   File: supabase/migrations/006_email_calendar_features.sql');
    process.exit(1);
  }
}

runMigration();
