/**
 * Check Trial Users Table Schema
 *
 * This script checks what columns currently exist in the trial_users table
 * to help diagnose schema mismatches.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function checkSchema() {
  try {
    console.log('🔍 Checking trial_users table schema...\n');

    // Try to query one record to see what columns exist
    const { data, error } = await supabase
      .from('trial_users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying trial_users:', error.message);

      if (error.message.includes('does not exist')) {
        console.log('\n📝 The trial_users table does not exist yet.');
        console.log('   You need to run the migration: supabase/migrations/20250103_trial_users.sql');
      }

      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  Table exists but is empty. Cannot determine schema from data.');
      console.log('   Try adding a test record first, or check Supabase dashboard directly.\n');
      return;
    }

    // Show the columns that exist
    const columns = Object.keys(data[0]);
    console.log('✅ trial_users table exists with these columns:\n');
    columns.forEach((col) => {
      const value = data[0][col];
      const type = value === null ? 'null' : typeof value;
      console.log(`   • ${col} (${type}): ${JSON.stringify(value)}`);
    });

    // Check for expected columns
    console.log('\n📋 Required columns check:');
    const requiredColumns = [
      'user_id',
      'org_id',
      'name',
      'email',
      'role',
      'phone',
      'current_stage',
      'account_manager',
      'sales_poc',
      'created_at',
      'last_active_at',
      'invited_at',
    ];

    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    const extraColumns = columns.filter(col => !requiredColumns.includes(col));

    if (missingColumns.length === 0) {
      console.log('   ✅ All required columns exist!');
    } else {
      console.log('   ❌ Missing columns:');
      missingColumns.forEach(col => console.log(`      • ${col}`));
    }

    if (extraColumns.length > 0) {
      console.log('\n   📝 Extra columns (not in expected schema):');
      extraColumns.forEach(col => console.log(`      • ${col}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log('Next Steps:');
    console.log('='.repeat(60));

    if (missingColumns.length > 0) {
      console.log('\n⚠️  Schema mismatch detected!\n');
      console.log('Option 1: Drop and recreate table (DESTRUCTIVE)');
      console.log('   DROP TABLE trial_users CASCADE;');
      console.log('   Then run: supabase/migrations/20250103_trial_users.sql\n');
      console.log('Option 2: Add missing columns (SAFE)');
      console.log('   I can generate an ALTER TABLE script for you.\n');
    } else {
      console.log('\n✅ Schema matches! You can proceed with adding users.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkSchema();
