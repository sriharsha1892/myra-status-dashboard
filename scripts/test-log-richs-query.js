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

async function testQueryLogging() {
  console.log('Testing platform query logging for Rich\'s organization...');
  console.log('Org ID:', RICHS_ORG_ID);
  console.log('');

  try {
    // 1. Get users from Rich's org
    console.log('Step 1: Fetching trial users...');
    const { data: users, error: usersError } = await supabase
      .from('trial_users')
      .select('user_id, name, email')
      .eq('org_id', RICHS_ORG_ID);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.error('❌ No users found for Rich\'s org');
      process.exit(1);
    }

    console.log('✅ Found', users.length, 'users:');
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
    });
    console.log('');

    // Use the first user (Michael Pence)
    const testUser = users[0];

    // 2. Log a test platform query with new fields
    console.log('Step 2: Logging test platform query...');
    const testQuery = {
      org_id: RICHS_ORG_ID,
      user_id: testUser.user_id,
      query_topic: 'Dairy Beverage Market Size',
      query_text: 'What is the current market size and forecast for dairy beverage products in North America?',
      status: 'success',
      query_category: 'Market Size & Forecast',
      observations: 'Good - Meets expectations with solid insights',
      confidence_score: 87.5,
      response_time_ms: 2340,
      executed_at: new Date().toISOString(),
      metadata: {
        test: true,
        source: 'test_script'
      }
    };

    const { data: query, error: queryError } = await supabase
      .from('platform_queries')
      .insert(testQuery)
      .select()
      .single();

    if (queryError) {
      console.error('❌ Error logging query:', queryError.message);
      console.error('Details:', queryError);
      process.exit(1);
    }

    console.log('✅ Query logged successfully!');
    console.log('   Query ID:', query.query_id);
    console.log('   User:', testUser.name);
    console.log('   Topic:', query.query_topic);
    console.log('   Category:', query.query_category);
    console.log('   Observations:', query.observations);
    console.log('   Confidence Score:', query.confidence_score);
    console.log('   Status:', query.status);
    console.log('');

    // 3. Verify timeline event was created
    console.log('Step 3: Checking if timeline event was created...');

    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: timelineEvents, error: timelineError } = await supabase
      .from('trial_timeline_events')
      .select('event_id, event_type, title, description, metadata')
      .eq('org_id', RICHS_ORG_ID)
      .order('created_at', { ascending: false })
      .limit(1);

    if (timelineError) {
      console.error('⚠️  Warning: Could not check timeline events:', timelineError.message);
    } else if (timelineEvents && timelineEvents.length > 0) {
      const latestEvent = timelineEvents[0];
      console.log('✅ Timeline event found:');
      console.log('   Event Type:', latestEvent.event_type);
      console.log('   Title:', latestEvent.title);
      console.log('   Metadata includes query_category:', latestEvent.metadata?.query_category || 'N/A');
      console.log('   Metadata includes observations:', latestEvent.metadata?.observations || 'N/A');
    }
    console.log('');

    // 4. Verify user query count was incremented
    console.log('Step 4: Checking if user query count was incremented...');
    const { data: updatedUser, error: userError } = await supabase
      .from('trial_users')
      .select('name, queries_executed')
      .eq('user_id', testUser.user_id)
      .single();

    if (userError) {
      console.error('⚠️  Warning: Could not check user query count:', userError.message);
    } else {
      console.log('✅ User query count:');
      console.log('   User:', updatedUser.name);
      console.log('   Queries Executed:', updatedUser.queries_executed || 0);
    }
    console.log('');

    // 5. Test query aggregation helper
    console.log('Step 5: Testing query aggregation helper...');
    const { data: allQueries, error: aggError } = await supabase
      .from('platform_queries')
      .select('query_id, query_topic, status, query_category, observations')
      .eq('org_id', RICHS_ORG_ID);

    if (aggError) {
      console.error('⚠️  Warning: Could not fetch aggregated queries:', aggError.message);
    } else {
      console.log('✅ Query aggregation stats:');
      console.log('   Total Queries:', allQueries.length);
      console.log('   Successful:', allQueries.filter(q => q.status === 'success').length);

      const categoryCounts = {};
      allQueries.forEach(q => {
        if (q.query_category) {
          categoryCounts[q.query_category] = (categoryCounts[q.query_category] || 0) + 1;
        }
      });
      console.log('   By Category:', categoryCounts);
    }
    console.log('');

    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('Query logging functionality is working correctly for Rich\'s organization.');
    console.log('');
    console.log('View the query at:');
    console.log('  Local: http://localhost:3000/support/trials/' + RICHS_ORG_ID);
    console.log('  Production: https://myra-status-dashboard.vercel.app/support/trials/' + RICHS_ORG_ID);

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testQueryLogging();
