const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const RICHS_ORG_ID = '835ad7c2-8385-4461-b8f4-7ccd02409536';

async function cleanupTestData() {
  console.log('🧹 CLEANING UP TEST DATA FOR RICH\'S ORGANIZATION');
  console.log('================================================\n');
  console.log('Org ID:', RICHS_ORG_ID);
  console.log('');

  try {
    // 1. Delete all test platform queries
    console.log('Step 1: Deleting test platform queries...');
    const { data: deletedQueries, error: deleteError } = await supabase
      .from('platform_queries')
      .delete()
      .eq('org_id', RICHS_ORG_ID)
      .eq('metadata->test', true)
      .select('query_id');

    if (deleteError) {
      console.error('❌ Error deleting queries:', deleteError.message);
      process.exit(1);
    }

    console.log('✅ Deleted', deletedQueries?.length || 0, 'test queries');
    console.log('');

    // 2. Reset user query counts
    console.log('Step 2: Resetting user query counts...');
    const { data: users, error: usersError } = await supabase
      .from('trial_users')
      .select('user_id, name')
      .eq('org_id', RICHS_ORG_ID);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      process.exit(1);
    }

    for (const user of users) {
      // Count remaining queries for this user
      const { count, error: countError } = await supabase
        .from('platform_queries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id);

      if (countError) {
        console.warn(`⚠️  Warning: Could not count queries for ${user.name}`);
        continue;
      }

      // Update user's query count
      const { error: updateError } = await supabase
        .from('trial_users')
        .update({ queries_executed: count || 0 })
        .eq('user_id', user.user_id);

      if (updateError) {
        console.warn(`⚠️  Warning: Could not update query count for ${user.name}`);
      } else {
        console.log(`   ✅ ${user.name}: reset to ${count || 0} queries`);
      }
    }
    console.log('');

    // 3. Delete test timeline events
    console.log('Step 3: Deleting test timeline events...');
    const { data: deletedEvents, error: eventsError } = await supabase
      .from('trial_timeline_events')
      .delete()
      .eq('org_id', RICHS_ORG_ID)
      .eq('metadata->test', true)
      .select('event_id');

    if (eventsError) {
      console.warn('⚠️  Warning: Could not delete timeline events:', eventsError.message);
    } else {
      console.log('✅ Deleted', deletedEvents?.length || 0, 'test timeline events');
    }
    console.log('');

    // 4. Verify cleanup
    console.log('Step 4: Verifying cleanup...');
    const { count: remainingQueries, error: verifyError } = await supabase
      .from('platform_queries')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', RICHS_ORG_ID);

    if (verifyError) {
      console.warn('⚠️  Warning: Could not verify cleanup:', verifyError.message);
    } else {
      console.log('✅ Remaining queries for Rich\'s org:', remainingQueries || 0);
    }
    console.log('');

    console.log('🎉 CLEANUP COMPLETE!');
    console.log('');
    console.log('Test data has been removed from Rich\'s organization.');
    console.log('The organization and users remain intact for future use.');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

cleanupTestData();
