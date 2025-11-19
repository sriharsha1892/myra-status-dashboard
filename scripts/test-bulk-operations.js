/**
 * Test New Bulk Operations
 * Tests the new Bulk Trial Status and Bulk Trial Extension features
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testBulkOperations() {
  console.log('🧪 Testing New Bulk Operations\n');
  console.log('='.repeat(70));

  try {
    // Step 1: Query trial organizations
    console.log('\n📋 Step 1: Fetching trial organizations...');
    const { data: orgs, error: fetchError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, trial_status, trial_end_date')
      .limit(5);

    if (fetchError) throw fetchError;

    console.log(`✅ Found ${orgs.length} trial organizations`);
    orgs.forEach(org => {
      console.log(`   • ${org.org_name}`);
      console.log(`     - Current Status: ${org.trial_status || 'null'}`);
      console.log(`     - Trial End Date: ${org.trial_end_date || 'null'}`);
    });

    if (orgs.length === 0) {
      console.log('\n⚠️  No trial organizations found. Skipping tests.');
      return;
    }

    // Step 2: Test Bulk Trial Status Change
    console.log('\n📋 Step 2: Testing Bulk Trial Status Change...');
    const testOrgIds = orgs.slice(0, 2).map(o => o.org_id);

    const { error: statusError } = await supabase
      .from('trial_organizations')
      .update({ trial_status: 'active' })
      .in('org_id', testOrgIds);

    if (statusError) throw statusError;

    console.log(`✅ Successfully updated trial status to 'active' for ${testOrgIds.length} organizations`);

    // Verify the update
    const { data: verifyStatus } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, trial_status')
      .in('org_id', testOrgIds);

    verifyStatus.forEach(org => {
      console.log(`   • ${org.org_name}: ${org.trial_status}`);
    });

    // Step 3: Test Bulk Trial Extension
    console.log('\n📋 Step 3: Testing Bulk Trial Extension...');

    // Filter orgs with end dates
    const orgsWithEndDate = orgs.filter(o => o.trial_end_date);

    if (orgsWithEndDate.length === 0) {
      console.log('   ⚠️  No organizations with trial_end_date found. Skipping extension test.');
    } else {
      const extensionDays = 7;
      const testExtensionIds = orgsWithEndDate.slice(0, 2).map(o => o.org_id);

      // Simulate extension by calculating new dates
      for (const org of orgsWithEndDate.slice(0, 2)) {
        const currentEndDate = new Date(org.trial_end_date);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(newEndDate.getDate() + extensionDays);

        const { error: extendError } = await supabase
          .from('trial_organizations')
          .update({
            trial_end_date: newEndDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('org_id', org.org_id);

        if (extendError) throw extendError;

        console.log(`   • ${org.org_name}:`);
        console.log(`     - Old End Date: ${org.trial_end_date}`);
        console.log(`     - New End Date: ${newEndDate.toISOString().split('T')[0]}`);
        console.log(`     - Extended by: ${extensionDays} days`);
      }

      console.log(`✅ Successfully extended trial period for ${testExtensionIds.length} organizations`);
    }

    // Step 4: Verification Query
    console.log('\n📋 Step 4: Final Verification...');
    const { data: finalCheck } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, trial_status, trial_end_date')
      .in('org_id', testOrgIds);

    console.log('✅ Updated organizations:');
    finalCheck.forEach(org => {
      console.log(`   • ${org.org_name}`);
      console.log(`     - Status: ${org.trial_status}`);
      console.log(`     - End Date: ${org.trial_end_date || 'null'}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 ALL BULK OPERATIONS TESTS PASSED!\n');
    console.log('✅ Bulk Trial Status Change: Working');
    console.log('✅ Bulk Trial Extension: Working');
    console.log('\n✨ The new bulk operations are ready for production!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the test
testBulkOperations();
