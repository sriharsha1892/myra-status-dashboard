/**
 * Comprehensive Test Script for Platform Queries Feature
 *
 * Tests:
 * 1. parent_organization field (Mordor Intelligence vs GMI)
 * 2. platform_queries table and triggers
 * 3. Automatic timeline event generation
 * 4. RPC function with queries_data parameter
 *
 * Usage: NEXT_PUBLIC_SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." node scripts/test-platform-queries.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data IDs for cleanup
const testData = {
  orgIds: [],
  userIds: [],
  queryIds: [],
  timelineEventIds: [],
};

async function main() {
  console.log('\n🚀 Platform Queries Feature - Comprehensive Test\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Create test organizations with parent_organization
    await testParentOrganization();

    // Test 2: Create users for the organizations
    await testUserCreation();

    // Test 3: Create platform queries directly
    await testPlatformQueries();

    // Test 4: Verify timeline events were auto-created
    await testTimelineIntegration();

    // Test 5: Test atomic RPC with queries_data
    await testAtomicRPC();

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('=' .repeat(60));

    // Cleanup
    await cleanup();

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);

    // Cleanup on error
    await cleanup();
    process.exit(1);
  }
}

async function testParentOrganization() {
  console.log('\n📊 Test 1: Parent Organization Field');
  console.log('-'.repeat(60));

  // Create Mordor Intelligence org
  const { data: miOrg, error: miError } = await supabase
    .from('trial_organizations')
    .insert({
      org_name: 'Test MI Corp',
      domain: 'TMT',
      parent_organization: 'Mordor Intelligence',
      org_lifecycle_stage: 'trial_active',
      trial_start_date: new Date().toISOString(),
      trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (miError) throw miError;
  testData.orgIds.push(miOrg.org_id);
  console.log(`✓ Created Mordor Intelligence org: ${miOrg.org_id}`);

  // Create GMI org
  const { data: gmiOrg, error: gmiError } = await supabase
    .from('trial_organizations')
    .insert({
      org_name: 'Test GMI Corp',
      domain: 'E&C',
      parent_organization: 'GMI',
      org_lifecycle_stage: 'trial_active',
      trial_start_date: new Date().toISOString(),
      trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (gmiError) throw gmiError;
  testData.orgIds.push(gmiOrg.org_id);
  console.log(`✓ Created GMI org: ${gmiOrg.org_id}`);

  // Verify parent_organization values
  if (miOrg.parent_organization !== 'Mordor Intelligence') {
    throw new Error('Mordor Intelligence parent_organization mismatch');
  }
  if (gmiOrg.parent_organization !== 'GMI') {
    throw new Error('GMI parent_organization mismatch');
  }

  console.log('✓ Parent organization field working correctly');
}

async function testUserCreation() {
  console.log('\n👥 Test 2: User Creation');
  console.log('-'.repeat(60));

  for (const orgId of testData.orgIds) {
    const { data: user, error } = await supabase
      .from('trial_users')
      .insert({
        org_id: orgId,
        name: `Test User for ${orgId.slice(0, 8)}`,
        email: `test-${orgId.slice(0, 8)}@example.com`,
        current_stage: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    testData.userIds.push(user.user_id);
    console.log(`✓ Created user: ${user.user_id} for org ${orgId.slice(0, 8)}`);
  }
}

async function testPlatformQueries() {
  console.log('\n🔍 Test 3: Platform Queries');
  console.log('-'.repeat(60));

  const queries = [
    {
      org_id: testData.orgIds[0],
      user_id: testData.userIds[0],
      query_topic: 'Market Size for Semiconductors',
      query_text: 'What is the global market size for semiconductor manufacturing?',
      status: 'success',
      confidence_score: 95.5,
      response_time_ms: 1250,
      session_id: 'test-session-001',
      executed_at: new Date().toISOString(),
    },
    {
      org_id: testData.orgIds[1],
      user_id: testData.userIds[1],
      query_topic: 'Industry Trends',
      query_text: 'What are the latest trends in renewable energy?',
      status: 'success',
      confidence_score: 88.2,
      response_time_ms: 1580,
      session_id: 'test-session-002',
      executed_at: new Date().toISOString(),
    },
    {
      org_id: testData.orgIds[0],
      user_id: testData.userIds[0],
      query_topic: 'Failed Query Test',
      query_text: 'This query should fail',
      status: 'failed',
      confidence_score: 12.5,
      response_time_ms: 500,
      session_id: 'test-session-003',
      executed_at: new Date().toISOString(),
    },
  ];

  for (const query of queries) {
    const { data, error } = await supabase
      .from('platform_queries')
      .insert(query)
      .select()
      .single();

    if (error) throw error;
    testData.queryIds.push(data.query_id);
    console.log(`✓ Created ${query.status} query: ${data.query_id}`);
    console.log(`  Topic: "${query.query_topic}"`);
    console.log(`  Confidence: ${query.confidence_score}%, Time: ${query.response_time_ms}ms`);
  }

  // Verify queries_executed counter updated
  for (let i = 0; i < testData.userIds.length; i++) {
    const { data: user, error } = await supabase
      .from('trial_users')
      .select('queries_executed')
      .eq('user_id', testData.userIds[i])
      .single();

    if (error) throw error;
    const expectedCount = i === 0 ? 2 : 1; // First user has 2 queries
    if (user.queries_executed !== expectedCount) {
      throw new Error(`Expected ${expectedCount} queries for user ${i}, got ${user.queries_executed}`);
    }
    console.log(`✓ User ${testData.userIds[i].slice(0, 8)} queries_executed counter: ${user.queries_executed}`);
  }
}

async function testTimelineIntegration() {
  console.log('\n📅 Test 4: Timeline Integration');
  console.log('-'.repeat(60));

  // Wait a moment for triggers to execute
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check timeline events were created
  for (const queryId of testData.queryIds) {
    const { data: events, error } = await supabase
      .from('trial_timeline_events')
      .select('*')
      .eq('metadata->>query_id', queryId);

    if (error) throw error;

    if (events.length === 0) {
      throw new Error(`No timeline event found for query ${queryId}`);
    }

    const event = events[0];
    testData.timelineEventIds.push(event.event_id);

    console.log(`✓ Timeline event created for query ${queryId.slice(0, 8)}`);
    console.log(`  Event Type: ${event.event_type}`);
    console.log(`  Title: ${event.title}`);
    console.log(`  Sentiment: ${event.sentiment}`);
  }

  console.log(`✓ All ${testData.queryIds.length} queries generated timeline events`);
}

async function testAtomicRPC() {
  console.log('\n⚡ Test 5: Atomic RPC with Queries Data');
  console.log('-'.repeat(60));

  const result = await supabase.rpc('create_trial_organization_atomic', {
    org_data: {
      org_name: 'Test RPC Org',
      domain: 'AAD',
      parent_company: 'Mordor Intelligence',
      parent_organization: 'Mordor Intelligence',
      org_lifecycle_stage: 'trial_active',
      trial_start_date: new Date().toISOString(),
      trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    users_data: [
      { name: 'RPC Test User', email: 'rpc-test@example.com', current_stage: 'active' },
    ],
    activities_data: [],
    queries_data: [
      {
        query_topic: 'RPC Test Query',
        query_text: 'Testing atomic RPC with queries_data parameter',
        status: 'success',
        confidence_score: 92.0,
        response_time_ms: 1100,
        executed_at: new Date().toISOString(),
        user_id: null, // Will be set by RPC to created user
      },
    ],
  });

  if (result.error) throw result.error;

  const rpcResult = result.data;

  // Store for cleanup
  testData.orgIds.push(rpcResult.org_id);
  testData.userIds.push(...rpcResult.user_ids);
  testData.queryIds.push(...(rpcResult.query_ids || []));

  console.log(`✓ RPC created org: ${rpcResult.org_id}`);
  console.log(`✓ Created ${rpcResult.created_user_count} users`);
  console.log(`✓ Created ${rpcResult.created_query_count || 0} queries`);

  // Verify counts
  if (rpcResult.created_user_count !== 1) {
    throw new Error('Expected 1 user created');
  }
  if (rpcResult.created_query_count !== 1) {
    throw new Error('Expected 1 query created');
  }

  console.log('✓ Atomic RPC with queries_data working correctly');
}

async function cleanup() {
  console.log('\n🧹 Cleaning Up Test Data');
  console.log('-'.repeat(60));

  let deletedCount = 0;

  // Delete timeline events (before orgs due to FK constraints)
  if (testData.timelineEventIds.length > 0) {
    const { error } = await supabase
      .from('trial_timeline_events')
      .delete()
      .in('event_id', testData.timelineEventIds);
    if (!error) {
      console.log(`✓ Deleted ${testData.timelineEventIds.length} timeline events`);
      deletedCount += testData.timelineEventIds.length;
    }
  }

  // Delete platform queries
  if (testData.queryIds.length > 0) {
    const { error } = await supabase
      .from('platform_queries')
      .delete()
      .in('query_id', testData.queryIds);
    if (!error) {
      console.log(`✓ Deleted ${testData.queryIds.length} platform queries`);
      deletedCount += testData.queryIds.length;
    }
  }

  // Delete users
  if (testData.userIds.length > 0) {
    const { error } = await supabase
      .from('trial_users')
      .delete()
      .in('user_id', testData.userIds);
    if (!error) {
      console.log(`✓ Deleted ${testData.userIds.length} users`);
      deletedCount += testData.userIds.length;
    }
  }

  // Delete organizations
  if (testData.orgIds.length > 0) {
    const { error } = await supabase
      .from('trial_organizations')
      .delete()
      .in('org_id', testData.orgIds);
    if (!error) {
      console.log(`✓ Deleted ${testData.orgIds.length} organizations`);
      deletedCount += testData.orgIds.length;
    }
  }

  console.log(`\n✓ Cleanup complete! Deleted ${deletedCount} total records`);
}

main();
