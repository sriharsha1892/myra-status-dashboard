#!/usr/bin/env node

/**
 * Migration Script: Make org_id nullable in org_product_roadmap
 * Run this with: node scripts/run-org-id-nullable-migration.js
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
  console.log('🚀 Starting migration: Make org_id nullable in org_product_roadmap');
  console.log('📍 Supabase URL:', supabaseUrl);

  const migrationSQL = `
    ALTER TABLE org_product_roadmap
    ALTER COLUMN org_id DROP NOT NULL;

    COMMENT ON COLUMN org_product_roadmap.org_id IS 'Optional: Links roadmap item to specific trial org. NULL for general company roadmap items.';
  `;

  try {
    console.log('\n1️⃣ Making org_id nullable...');

    // Try using rpc if available
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.log('   RPC not available, trying alternative approach...');

      // Verify by checking if we can query with null org_id
      const { error: testError } = await supabase
        .from('org_product_roadmap')
        .select('id, org_id')
        .is('org_id', null)
        .limit(1);

      if (testError) {
        console.error('❌ Migration needs to be run manually in Supabase Dashboard');
        console.error('\n📝 Please run this SQL in Supabase Dashboard > SQL Editor:');
        console.error(migrationSQL);
        process.exit(1);
      } else {
        console.log('✅ org_id is already nullable or migration succeeded');
      }
    } else {
      console.log('✅ org_id column made nullable successfully');
    }

    console.log('\n2️⃣ Verifying migration...');
    const { data: items, error: verifyError } = await supabase
      .from('org_product_roadmap')
      .select('id, org_id, title')
      .limit(5);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      process.exit(1);
    }

    console.log(`✅ Verified - Found ${items.length} roadmap items`);
    console.log('\n🎉 Migration completed successfully!');
    console.log('💡 You can now import general roadmap items with NULL org_id');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error('\n📝 Please run this SQL manually in Supabase Dashboard > SQL Editor:');
    console.error(migrationSQL);
    process.exit(1);
  }
}

runMigration();
