#!/usr/bin/env node

/**
 * Migration Script: Add org_url column to trial_organizations
 * Run this with: node scripts/run-migration.js
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
  console.log('🚀 Starting migration: Add org_url column to trial_organizations');
  console.log('📍 Supabase URL:', supabaseUrl);

  try {
    // Add org_url column
    console.log('\n1️⃣ Adding org_url column...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS org_url TEXT;'
    });

    if (error) {
      // Try alternative approach using direct SQL
      console.log('   Trying alternative approach...');
      const { error: error2 } = await supabase
        .from('trial_organizations')
        .select('org_url')
        .limit(1);

      if (error2 && error2.message.includes('column "org_url" does not exist')) {
        console.error('❌ Column does not exist and cannot be added via API');
        console.error('   Please run this SQL manually in Supabase Dashboard > SQL Editor:');
        console.error('   ALTER TABLE trial_organizations ADD COLUMN org_url TEXT;');
        process.exit(1);
      } else if (error2) {
        console.error('❌ Error:', error2.message);
        process.exit(1);
      } else {
        console.log('✅ Column already exists or was added successfully');
      }
    } else {
      console.log('✅ org_url column added successfully');
    }

    // Verify column exists
    console.log('\n2️⃣ Verifying column exists...');
    const { data: testData, error: testError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, org_url')
      .limit(1);

    if (testError) {
      console.error('❌ Verification failed:', testError.message);
      console.error('\n📝 Please run this SQL manually in Supabase Dashboard:');
      console.error('   ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS org_url TEXT;');
      process.exit(1);
    }

    console.log('✅ Column verified - org_url exists in trial_organizations');
    console.log('\n🎉 Migration completed successfully!');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error('\n📝 Please run this SQL manually in Supabase Dashboard > SQL Editor:');
    console.error('   ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS org_url TEXT;');
    process.exit(1);
  }
}

runMigration();
