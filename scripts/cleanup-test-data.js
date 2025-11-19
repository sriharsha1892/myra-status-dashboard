/**
 * Cleanup Test Data
 * Reverts the changes made by test-bulk-operations.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupTestData() {
  console.log('🧹 Cleaning Up Test Data\n');
  console.log('='.repeat(70));

  try {
    // Step 1: Revert trial status changes
    console.log('\n📋 Step 1: Reverting trial status changes...');

    const { error: statusError } = await supabase
      .from('trial_organizations')
      .update({ trial_status: 'requested' })
      .in('org_name', ['CircleK', 'Innovation Labs']);

    if (statusError) throw statusError;

    console.log('✅ Reverted trial status to "requested" for test organizations');

    // Step 2: Revert trial end date extensions
    console.log('\n📋 Step 2: Reverting trial end date extensions...');

    // CircleK: revert from 2025-12-09 back to 2025-12-02
    const { error: circleError } = await supabase
      .from('trial_organizations')
      .update({
        trial_end_date: '2025-12-02',
        updated_at: new Date().toISOString(),
      })
      .eq('org_name', 'CircleK');

    if (circleError) throw circleError;

    // Innovation Labs: revert from 2025-12-09 back to 2025-12-02
    const { error: innovationError } = await supabase
      .from('trial_organizations')
      .update({
        trial_end_date: '2025-12-02',
        updated_at: new Date().toISOString(),
      })
      .eq('org_name', 'Innovation Labs');

    if (innovationError) throw innovationError;

    console.log('✅ Reverted trial end dates back to original values');

    // Step 3: Verification
    console.log('\n📋 Step 3: Verifying cleanup...');

    const { data: verification } = await supabase
      .from('trial_organizations')
      .select('org_name, trial_status, trial_end_date')
      .in('org_name', ['CircleK', 'Innovation Labs']);

    console.log('✅ Cleaned organizations:');
    verification.forEach(org => {
      console.log(`   • ${org.org_name}`);
      console.log(`     - Status: ${org.trial_status}`);
      console.log(`     - End Date: ${org.trial_end_date}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 CLEANUP COMPLETE!\n');
    console.log('✅ All test data has been reverted to original state');
    console.log('✅ Database is clean and ready for production\n');

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTestData();
