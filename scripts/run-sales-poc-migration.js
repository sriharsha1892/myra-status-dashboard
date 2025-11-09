#!/usr/bin/env node
/**
 * Run migration: Move sales_poc from trial_users to trial_organizations
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('\n📝 Running sales_poc migration...\n');
  console.log('This will:');
  console.log('1. Add sales_poc column to trial_organizations');
  console.log('2. Migrate existing sales_poc data from trial_users to trial_organizations');
  console.log('3. Drop sales_poc column from trial_users\n');

  try {
    // Step 1: Add sales_poc to trial_organizations
    console.log('Step 1: Adding sales_poc column to trial_organizations...');

    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS sales_poc TEXT;'
    });

    // Since rpc might not exist, we'll use raw SQL via the client
    // Actually, let's just check if the column exists by trying to select it
    const { error: checkError } = await supabase
      .from('trial_organizations')
      .select('sales_poc')
      .limit(1);

    if (checkError && checkError.message.includes('column')) {
      console.log('   ℹ️  Column sales_poc does not exist yet. Please run the SQL migration manually:');
      console.log('   ALTER TABLE trial_organizations ADD COLUMN IF NOT EXISTS sales_poc TEXT;');
      console.log('\n   You can run this in Supabase SQL Editor or via psql.');
      console.log('   Then run this script again to migrate the data.\n');
      process.exit(1);
    }

    console.log('   ✅ Column sales_poc exists on trial_organizations');

    // Step 2: Migrate data from trial_users to trial_organizations
    console.log('\nStep 2: Migrating sales_poc data from users to orgs...');

    // Get all orgs
    const { data: orgs, error: orgsError } = await supabase
      .from('trial_organizations')
      .select('org_id, sales_poc');

    if (orgsError) throw orgsError;

    let migratedCount = 0;

    for (const org of orgs) {
      if (org.sales_poc) {
        console.log(`   ⏭️  Org ${org.org_id} already has sales_poc, skipping`);
        continue;
      }

      // Get first non-null sales_poc from this org's users
      const { data: users, error: usersError } = await supabase
        .from('trial_users')
        .select('sales_poc')
        .eq('org_id', org.org_id)
        .not('sales_poc', 'is', null)
        .limit(1);

      if (usersError) throw usersError;

      if (users && users.length > 0 && users[0].sales_poc) {
        const { error: updateError } = await supabase
          .from('trial_organizations')
          .update({ sales_poc: users[0].sales_poc })
          .eq('org_id', org.org_id);

        if (updateError) throw updateError;

        console.log(`   ✅ Migrated sales_poc for org ${org.org_id}: ${users[0].sales_poc}`);
        migratedCount++;
      }
    }

    console.log(`\n   📊 Migrated ${migratedCount} sales_poc values to organizations`);

    // Step 3: Drop sales_poc from trial_users
    console.log('\nStep 3: Dropping sales_poc column from trial_users...');
    console.log('   ⚠️  This requires SQL execution. Please run manually:');
    console.log('   ALTER TABLE trial_users DROP COLUMN IF EXISTS sales_poc;');
    console.log('\n   You can run this in Supabase SQL Editor or via psql.\n');

    console.log('✅ Migration steps completed!\n');
    console.log('⚠️  Remember to run the final SQL command to drop the column from trial_users.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
