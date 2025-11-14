/**
 * Cleanup Test Data Created During AI Features Testing
 * Removes test timeline events and trial users
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function cleanupTestData() {
  console.log('🧹 CLEANING UP TEST DATA\n');
  console.log('='.repeat(80));

  try {
    // 1. Remove test timeline events (created during tagging test)
    console.log('\n📋 Step 1: Removing test timeline events...');

    const { data: testEvents, error: findError } = await supabase
      .from('trial_timeline_events')
      .select('id, title')
      .or('title.eq.Customer reported integration issue,title.eq.Successful product demo,title.eq.User milestone: 10 workflows created');

    if (findError) {
      console.error('Error finding test events:', findError.message);
    } else if (testEvents && testEvents.length > 0) {
      console.log(`   Found ${testEvents.length} test timeline events:`);
      testEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. "${event.title}" (${event.id})`);
      });

      const { error: deleteError } = await supabase
        .from('trial_timeline_events')
        .delete()
        .in('id', testEvents.map(e => e.id));

      if (deleteError) {
        console.error('   ❌ Error deleting events:', deleteError.message);
      } else {
        console.log(`   ✅ Deleted ${testEvents.length} test timeline events`);
      }
    } else {
      console.log('   No test timeline events found');
    }

    // 2. Remove test trial users (created during user import test)
    console.log('\n📋 Step 2: Removing test trial users...');

    const { data: testUsers, error: findUsersError } = await supabase
      .from('trial_users')
      .select('user_id, name, email, org_id')
      .or('email.eq.john.smith@acmecorp.com,email.eq.jane.doe@acmecorp.com,email.eq.bob.wilson@acmecorp.com,email.eq.sarah.connor@techstart.io');

    if (findUsersError) {
      console.error('Error finding test users:', findUsersError.message);
    } else if (testUsers && testUsers.length > 0) {
      console.log(`   Found ${testUsers.length} test trial users:`);
      testUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - Org: ${user.org_id}`);
      });

      const { error: deleteUsersError } = await supabase
        .from('trial_users')
        .delete()
        .in('user_id', testUsers.map(u => u.user_id));

      if (deleteUsersError) {
        console.error('   ❌ Error deleting users:', deleteUsersError.message);
      } else {
        console.log(`   ✅ Deleted ${testUsers.length} test trial users`);
      }
    } else {
      console.log('   No test trial users found');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ TEST DATA CLEANUP COMPLETE!\n');
    console.log('Summary:');
    console.log(`  - Timeline Events: ${testEvents?.length || 0} removed`);
    console.log(`  - Trial Users: ${testUsers?.length || 0} removed`);
    console.log('\nNote: Health scores and tags that were generated are part of');
    console.log('production data and have been left intact.');
    console.log('');

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error);
  }
}

// Run the cleanup
(async () => {
  await cleanupTestData();
})();
