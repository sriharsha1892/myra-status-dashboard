#!/usr/bin/env node

/**
 * Cleanup Test Data Script
 *
 * Deletes all test data from the database (organizations with names starting with "TEST-")
 *
 * Usage:
 *   node scripts/cleanup-test-data.js
 *   or
 *   npm run cleanup:test-data
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupTestData() {
  console.log('🧹 Starting test data cleanup...\n');

  try {
    // 1. Find all test organizations
    console.log('📋 Step 1: Finding test organizations...');
    const { data: testOrgs, error: findError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .like('org_name', 'TEST-%');

    if (findError) {
      console.error('❌ Error finding test organizations:', findError.message);
      process.exit(1);
    }

    if (!testOrgs || testOrgs.length === 0) {
      console.log('✅ No test data found. Database is clean!\n');
      return;
    }

    console.log(`   Found ${testOrgs.length} test organization(s):`);
    testOrgs.forEach((org, idx) => {
      console.log(`   ${idx + 1}. ${org.org_name} (${org.org_id})`);
    });
    console.log('');

    const testOrgIds = testOrgs.map(org => org.org_id);

    // 2. Delete user_interactions
    console.log('📋 Step 2: Deleting user interactions...');
    const { data: deletedInteractions, error: interactionError } = await supabase
      .from('user_interactions')
      .delete()
      .in('org_id', testOrgIds)
      .select();

    if (interactionError) {
      console.error('❌ Error deleting interactions:', interactionError.message);
    } else {
      console.log(`   ✓ Deleted ${deletedInteractions?.length || 0} interaction(s)\n`);
    }

    // 3. Delete trial_users
    console.log('📋 Step 3: Deleting trial users...');
    const { data: deletedUsers, error: userError } = await supabase
      .from('trial_users')
      .delete()
      .in('org_id', testOrgIds)
      .select();

    if (userError) {
      console.error('❌ Error deleting users:', userError.message);
    } else {
      console.log(`   ✓ Deleted ${deletedUsers?.length || 0} user(s)\n`);
    }

    // 4. Delete trial_organizations
    console.log('📋 Step 4: Deleting trial organizations...');
    const { data: deletedOrgs, error: orgError } = await supabase
      .from('trial_organizations')
      .delete()
      .in('org_id', testOrgIds)
      .select();

    if (orgError) {
      console.error('❌ Error deleting organizations:', orgError.message);
    } else {
      console.log(`   ✓ Deleted ${deletedOrgs?.length || 0} organization(s)\n`);
    }

    // 5. Verify cleanup
    console.log('📋 Step 5: Verifying cleanup...');
    const { data: remainingOrgs, error: verifyError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .like('org_name', 'TEST-%');

    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError.message);
    } else if (remainingOrgs && remainingOrgs.length > 0) {
      console.log(`   ⚠️  Warning: ${remainingOrgs.length} test organization(s) still remain:`);
      remainingOrgs.forEach((org, idx) => {
        console.log(`      ${idx + 1}. ${org.org_name}`);
      });
    } else {
      console.log('   ✓ Cleanup verified: No test organizations remain\n');
    }

    // Summary
    console.log('✅ Cleanup Complete!\n');
    console.log('Summary:');
    console.log(`   Organizations: ${deletedOrgs?.length || 0} deleted`);
    console.log(`   Users: ${deletedUsers?.length || 0} deleted`);
    console.log(`   Interactions: ${deletedInteractions?.length || 0} deleted\n`);

  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTestData();
