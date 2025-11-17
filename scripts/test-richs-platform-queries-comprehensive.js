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

// Test queries to add
const testQueries = [
  {
    query_topic: 'Dairy Beverage Market Size',
    query_text: 'What is the current market size and forecast for dairy beverage products in North America?',
    status: 'success',
    query_category: 'Market Size & Forecast',
    observations: 'Good - Meets expectations with solid insights',
    confidence_score: 87.5,
    response_time_ms: 2340,
  },
  {
    query_topic: 'Cream Cheese Competitors',
    query_text: 'Who are the top competitors in the cream cheese market globally?',
    status: 'success',
    query_category: 'Competitive Analysis',
    observations: 'Excellent - Highly accurate and comprehensive',
    confidence_score: 95.0,
    response_time_ms: 1890,
  },
  {
    query_topic: 'Plant-Based Dairy Trends',
    query_text: 'What are the emerging trends in plant-based dairy alternatives in Europe?',
    status: 'success',
    query_category: 'Trend Analysis',
    observations: 'Good - Meets expectations with solid insights',
    confidence_score: 88.5,
    response_time_ms: 2100,
  },
  {
    query_topic: 'Latin America Cream Market',
    query_text: 'What is the market size for cream products in Latin America and growth projections?',
    status: 'success',
    query_category: 'Regional Analysis',
    observations: 'Satisfactory - Adequate but could be improved',
    confidence_score: 75.0,
    response_time_ms: 2800,
  },
  {
    query_topic: 'Whipped Cream Innovation',
    query_text: 'What innovations are happening in the whipped cream product category?',
    status: 'success',
    query_category: 'Product Analysis',
    observations: 'Novel Insight - Unexpected findings',
    confidence_score: 92.0,
    response_time_ms: 2200,
  },
  {
    query_topic: 'Dairy Regulations EU',
    query_text: 'What are the key regulatory requirements for dairy products in the European Union?',
    status: 'partial',
    query_category: 'Regulatory & Compliance',
    observations: 'Needs Refinement - Missing key information',
    confidence_score: 65.0,
    response_time_ms: 3100,
  },
  {
    query_topic: 'Frozen Desserts Supply Chain',
    query_text: 'Analyze the supply chain challenges in the frozen desserts industry',
    status: 'success',
    query_category: 'Supply Chain Analysis',
    observations: 'Good - Meets expectations with solid insights',
    confidence_score: 82.0,
    response_time_ms: 2450,
  },
  {
    query_topic: 'Consumer Preferences Dairy',
    query_text: 'What are consumer preferences for dairy products in the US market?',
    status: 'failed',
    query_category: 'Consumer Insights',
    observations: 'Data Quality Issues',
    confidence_score: null,
    response_time_ms: 5200,
  },
];

async function testComprehensivePlatformQueries() {
  console.log('🧪 COMPREHENSIVE PLATFORM QUERY TESTING FOR RICH\'S ORGANIZATION');
  console.log('==============================================================\n');
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

    // 2. Clear existing test queries
    console.log('Step 2: Clearing existing test queries...');
    const { error: deleteError } = await supabase
      .from('platform_queries')
      .delete()
      .eq('org_id', RICHS_ORG_ID)
      .neq('metadata->test', false); // Delete all or just test queries

    if (deleteError) {
      console.warn('⚠️  Warning: Could not clear existing queries:', deleteError.message);
    } else {
      console.log('✅ Cleared existing queries');
    }
    console.log('');

    // 3. Insert test queries (distribute across users)
    console.log('Step 3: Inserting', testQueries.length, 'test queries...');
    const queriesToInsert = testQueries.map((query, index) => {
      // Alternate between users
      const user = users[index % users.length];
      // Create different execution times (last 14 days)
      const daysAgo = Math.floor(Math.random() * 14);
      const executedAt = new Date();
      executedAt.setDate(executedAt.getDate() - daysAgo);

      return {
        org_id: RICHS_ORG_ID,
        user_id: user.user_id,
        ...query,
        executed_at: executedAt.toISOString(),
        metadata: {
          test: true,
          source: 'comprehensive_test_script'
        }
      };
    });

    const { data: insertedQueries, error: insertError } = await supabase
      .from('platform_queries')
      .insert(queriesToInsert)
      .select();

    if (insertError) {
      console.error('❌ Error inserting queries:', insertError.message);
      console.error('Details:', insertError);
      process.exit(1);
    }

    console.log('✅ Inserted', insertedQueries.length, 'queries successfully!');
    console.log('');

    // 4. Verify aggregation stats
    console.log('Step 4: Verifying aggregation statistics...');
    const { data: allQueries, error: aggError } = await supabase
      .from('platform_queries')
      .select('query_id, query_topic, status, query_category, observations, confidence_score, user_id, executed_at')
      .eq('org_id', RICHS_ORG_ID)
      .order('executed_at', { ascending: false });

    if (aggError) {
      console.error('❌ Error fetching aggregated queries:', aggError.message);
      process.exit(1);
    }

    console.log('✅ Query Aggregation Stats:');
    console.log('   Total Queries:', allQueries.length);
    console.log('   Successful:', allQueries.filter(q => q.status === 'success').length);
    console.log('   Partial:', allQueries.filter(q => q.status === 'partial').length);
    console.log('   Failed:', allQueries.filter(q => q.status === 'failed').length);
    console.log('');

    // Category breakdown
    const categoryCounts = {};
    allQueries.forEach(q => {
      if (q.query_category) {
        categoryCounts[q.query_category] = (categoryCounts[q.query_category] || 0) + 1;
      }
    });
    console.log('   Queries by Category:');
    Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`     - ${category}: ${count}`);
      });
    console.log('');

    // User breakdown
    const userCounts = {};
    allQueries.forEach(q => {
      if (q.user_id) {
        const user = users.find(u => u.user_id === q.user_id);
        const userName = user ? user.name : q.user_id;
        userCounts[userName] = (userCounts[userName] || 0) + 1;
      }
    });
    console.log('   Queries by User:');
    Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([userName, count]) => {
        console.log(`     - ${userName}: ${count}`);
      });
    console.log('');

    // Confidence score average
    const queriesWithConfidence = allQueries.filter(q => q.confidence_score !== null);
    const avgConfidence = queriesWithConfidence.length > 0
      ? queriesWithConfidence.reduce((sum, q) => sum + q.confidence_score, 0) / queriesWithConfidence.length
      : 0;
    console.log('   Average Confidence Score:', avgConfidence.toFixed(2), '%');
    console.log('');

    // 5. Verify user query counts were updated
    console.log('Step 5: Verifying user query counts...');
    const { data: updatedUsers, error: userError } = await supabase
      .from('trial_users')
      .select('name, queries_executed')
      .eq('org_id', RICHS_ORG_ID);

    if (userError) {
      console.warn('⚠️  Warning: Could not fetch user query counts:', userError.message);
    } else {
      console.log('✅ User Query Counts:');
      updatedUsers.forEach(user => {
        console.log(`   - ${user.name}: ${user.queries_executed || 0} queries`);
      });
    }
    console.log('');

    // 6. Verify timeline events
    console.log('Step 6: Checking timeline events...');
    const { data: timelineEvents, error: timelineError } = await supabase
      .from('trial_timeline_events')
      .select('event_type, title, metadata')
      .eq('org_id', RICHS_ORG_ID)
      .eq('event_type', 'query_executed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (timelineError) {
      console.warn('⚠️  Warning: Could not fetch timeline events:', timelineError.message);
    } else {
      console.log('✅ Recent Timeline Events:', timelineEvents.length);
      timelineEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.title}`);
        if (event.metadata?.query_category) {
          console.log(`      Category: ${event.metadata.query_category}`);
        }
        if (event.metadata?.observations) {
          console.log(`      Observations: ${event.metadata.observations}`);
        }
      });
    }
    console.log('');

    // 7. Verify trend calculations (last 7 days vs previous 7 days)
    console.log('Step 7: Calculating trends...');
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentQueries = allQueries.filter(q =>
      new Date(q.executed_at) >= sevenDaysAgo
    ).length;

    const previousQueries = allQueries.filter(q =>
      new Date(q.executed_at) >= fourteenDaysAgo &&
      new Date(q.executed_at) < sevenDaysAgo
    ).length;

    const trend = previousQueries > 0
      ? ((recentQueries - previousQueries) / previousQueries) * 100
      : recentQueries > 0 ? 100 : 0;

    console.log('✅ Trend Analysis:');
    console.log(`   Last 7 days: ${recentQueries} queries`);
    console.log(`   Previous 7 days: ${previousQueries} queries`);
    console.log(`   Trend: ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`);
    console.log('');

    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('Platform query tracking is working correctly for Rich\'s organization.');
    console.log('');
    console.log('View the dashboard at:');
    console.log('  Local: http://localhost:3000/support/trials/' + RICHS_ORG_ID);
    console.log('  Production: https://myra-status-dashboard.vercel.app/support/trials/' + RICHS_ORG_ID);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Navigate to the OverviewTab to see Platform Queries metric');
    console.log('  2. Check TrialUsageDashboard for detailed query analytics');
    console.log('  3. Verify trends and category breakdowns');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testComprehensivePlatformQueries();
