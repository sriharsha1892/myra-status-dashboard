#!/usr/bin/env node
/**
 * Remove phone column from trial_users table
 */

require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function removePhoneColumn() {
  console.log('\n🗑️  Removing phone column from trial_users table...\n');

  try {
    // Test if column exists by trying to select it
    const { error: testError } = await supabase
      .from('trial_users')
      .select('phone')
      .limit(1);

    if (testError && testError.message.includes('column "phone" does not exist')) {
      console.log('✅ Phone column already removed or does not exist');
      console.log('\n📋 Migration already applied!\n');
      return;
    }

    // If column exists, we need to drop it manually via SQL
    console.log('⚠️  Phone column exists. Please run this SQL on your Supabase dashboard:');
    console.log('\nSQL to run:');
    console.log('─'.repeat(60));
    console.log('ALTER TABLE trial_users DROP COLUMN IF EXISTS phone;');
    console.log('─'.repeat(60));
    console.log('\nSteps:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Paste the SQL above');
    console.log('3. Click "Run"');
    console.log('\nOR run locally if you have psql installed:');
    console.log('PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$SUPABASE_DB_HOST" -U postgres -d postgres \\');
    console.log('  -c "ALTER TABLE trial_users DROP COLUMN IF EXISTS phone;"\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

removePhoneColumn();
