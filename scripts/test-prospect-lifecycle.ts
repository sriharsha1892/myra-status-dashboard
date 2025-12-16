/**
 * Comprehensive test for prospect lifecycle features
 * Tests: Create prospects, log outreach, update stages, convert to trial
 * Runs tests in parallel for volume testing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data prefix for easy cleanup
const TEST_PREFIX = 'TEST_PROSPECT_';
const TEST_ORG_IDS: string[] = [];
let TEST_USER_ID = '';

// Generate a proper UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get a valid user ID for account_manager_id
async function getTestUserId(): Promise<string> {
  const { data } = await supabase.from('users').select('id').limit(1);
  return data?.[0]?.id || '';
}

interface TestResult {
  test: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await fn();
    const result = { test: name, passed: true, duration: Date.now() - start };
    results.push(result);
    console.log(`✅ ${name} (${result.duration}ms)`);
    return result;
  } catch (error: any) {
    const result = { test: name, passed: false, duration: Date.now() - start, error: error.message };
    results.push(result);
    console.log(`❌ ${name}: ${error.message}`);
    return result;
  }
}

// ============ TEST FUNCTIONS ============

async function testCreateProspectOrg(index: number): Promise<string> {
  const orgId = generateUUID(); // Use proper UUID
  const orgData = {
    org_id: orgId,
    org_name: `${TEST_PREFIX}Company_${index}`,
    domain: 'TMT', // Use valid domain format (matching existing data)
    account_manager_id: TEST_USER_ID, // Required column
    is_prospect: true,
    prospect_stage: 'cold_lead',
    prospect_source: ['cold_outreach', 'inbound', 'referral', 'linkedin'][index % 4],
    icp_fit_score: 50 + (index * 5) % 50,
    org_lifecycle_stage: 'prospect',
  };

  const { error } = await supabase.from('trial_organizations').insert(orgData);
  if (error) throw new Error(`Failed to create prospect: ${error.message}`);

  TEST_ORG_IDS.push(orgId);
  return orgId;
}

async function testUpdateProspectStage(orgId: string, newStage: string): Promise<void> {
  const { error } = await supabase
    .from('trial_organizations')
    .update({ prospect_stage: newStage })
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to update stage: ${error.message}`);

  // Verify the update
  const { data } = await supabase
    .from('trial_organizations')
    .select('prospect_stage')
    .eq('org_id', orgId)
    .single();

  if (data?.prospect_stage !== newStage) {
    throw new Error(`Stage not updated: expected ${newStage}, got ${data?.prospect_stage}`);
  }
}

async function testLogOutreachActivity(orgId: string, activityType: string): Promise<void> {
  // Try to insert into prospect_activities (if table exists)
  const activityData = {
    id: generateUUID(), // Use proper UUID
    org_id: orgId,
    activity_type: activityType,
    direction: 'outbound',
    subject: `Test ${activityType} subject`,
    content: `Test ${activityType} content for ${orgId}`,
    activity_date: new Date().toISOString(),
  };

  // First check if table exists by trying to query it
  const { error: tableError } = await supabase
    .from('prospect_activities')
    .select('id')
    .limit(1);

  if (tableError?.message?.includes('does not exist')) {
    // Table doesn't exist yet, use timeline_events instead
    const timelineData = {
      id: generateUUID(), // Use proper UUID
      org_id: orgId,
      event_type: 'outreach_logged',
      event_category: 'engagement',
      title: `Outreach: ${activityType}`,
      description: `Test ${activityType} logged`,
      sentiment: 'neutral',
      severity: 'low',
      event_timestamp: new Date().toISOString(),
    };

    const { error } = await supabase.from('timeline_events').insert(timelineData);
    if (error) throw new Error(`Failed to log outreach via timeline: ${error.message}`);
  } else {
    const { error } = await supabase.from('prospect_activities').insert(activityData);
    if (error) throw new Error(`Failed to log outreach: ${error.message}`);
  }
}

async function testConvertToTrial(orgId: string): Promise<void> {
  const { error } = await supabase
    .from('trial_organizations')
    .update({
      is_prospect: false,
      trial_status: 'active',
      trial_start_date: new Date().toISOString().split('T')[0],
      trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      org_lifecycle_stage: 'trial_active',
    })
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to convert to trial: ${error.message}`);

  // Verify conversion
  const { data } = await supabase
    .from('trial_organizations')
    .select('is_prospect, trial_status')
    .eq('org_id', orgId)
    .single();

  if (data?.is_prospect !== false || data?.trial_status !== 'active') {
    throw new Error(`Conversion failed: is_prospect=${data?.is_prospect}, trial_status=${data?.trial_status}`);
  }
}

async function testUpdateDealStage(orgId: string, dealStage: string): Promise<void> {
  const { error } = await supabase
    .from('trial_organizations')
    .update({ deal_stage: dealStage })
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to update deal stage: ${error.message}`);
}

async function testCloseDealWon(orgId: string): Promise<void> {
  const { error } = await supabase
    .from('trial_organizations')
    .update({
      deal_outcome: 'won',
      org_lifecycle_stage: 'customer',
    })
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to close deal won: ${error.message}`);
}

async function testCloseDealLost(orgId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('trial_organizations')
    .update({
      deal_outcome: 'lost',
      deal_outcome_reason: reason,
      org_lifecycle_stage: 'lost',
    })
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to close deal lost: ${error.message}`);
}

async function testDeferDeal(orgId: string): Promise<void> {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { error } = await supabase
    .from('trial_organizations')
    .update({
      deal_outcome: 'deferred',
      deal_deferred_until: futureDate,
      deal_outcome_reason: 'Budget review next quarter',
    })
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to defer deal: ${error.message}`);
}

async function testQueryProspectsByStage(): Promise<void> {
  const stages = ['cold_lead', 'contacted', 'responded', 'screening', 'demo_scheduled', 'demo_done'];

  for (const stage of stages) {
    const { data, error } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, prospect_stage')
      .eq('is_prospect', true)
      .eq('prospect_stage', stage)
      .like('org_name', `${TEST_PREFIX}%`);

    if (error) throw new Error(`Failed to query prospects by stage ${stage}: ${error.message}`);
  }
}

async function testQueryProspectsBySource(): Promise<void> {
  const sources = ['cold_outreach', 'inbound', 'referral', 'linkedin'];

  for (const source of sources) {
    const { data, error } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, prospect_source')
      .eq('is_prospect', true)
      .eq('prospect_source', source)
      .like('org_name', `${TEST_PREFIX}%`);

    if (error) throw new Error(`Failed to query prospects by source ${source}: ${error.message}`);
  }
}

// ============ CLEANUP ============

async function cleanupTestData(): Promise<void> {
  console.log('\n🧹 Cleaning up test data...');

  // Delete timeline events for test orgs
  const { error: timelineError } = await supabase
    .from('timeline_events')
    .delete()
    .in('org_id', TEST_ORG_IDS);

  if (timelineError) {
    console.log(`⚠️ Timeline cleanup warning: ${timelineError.message}`);
  }

  // Try to delete prospect_activities if table exists
  const { error: activityError } = await supabase
    .from('prospect_activities')
    .delete()
    .in('org_id', TEST_ORG_IDS);

  if (activityError && !activityError.message?.includes('does not exist')) {
    console.log(`⚠️ Activity cleanup warning: ${activityError.message}`);
  }

  // Delete test organizations
  const { error: orgError, count } = await supabase
    .from('trial_organizations')
    .delete()
    .like('org_name', `${TEST_PREFIX}%`);

  if (orgError) {
    console.log(`⚠️ Org cleanup warning: ${orgError.message}`);
  } else {
    console.log(`✅ Deleted test organizations`);
  }
}

// ============ MAIN TEST RUNNER ============

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting comprehensive prospect lifecycle tests\n');
  console.log('=' .repeat(60));

  const startTime = Date.now();

  // Initialize test user ID (required for account_manager_id)
  TEST_USER_ID = await getTestUserId();
  if (!TEST_USER_ID) {
    console.log('❌ No users found in database. Cannot run tests.');
    process.exit(1);
  }
  console.log(`Using test user ID: ${TEST_USER_ID}`);

  try {
    // Phase 1: Create prospects in parallel (10 prospects)
    console.log('\n📦 Phase 1: Creating prospect organizations (parallel)...');
    const createPromises = Array.from({ length: 10 }, (_, i) =>
      runTest(`Create prospect ${i + 1}`, async () => {
        await testCreateProspectOrg(i);
      })
    );
    await Promise.all(createPromises);

    // Phase 2: Update stages in parallel
    console.log('\n🔄 Phase 2: Updating prospect stages (parallel)...');
    const stages = ['contacted', 'responded', 'screening', 'demo_scheduled', 'demo_done'];
    const stagePromises = TEST_ORG_IDS.slice(0, 5).map((orgId, i) =>
      runTest(`Update stage to ${stages[i]}`, async () => {
        await testUpdateProspectStage(orgId, stages[i]);
      })
    );
    await Promise.all(stagePromises);

    // Phase 3: Log outreach activities in parallel
    console.log('\n📧 Phase 3: Logging outreach activities (parallel)...');
    const activityTypes = ['email_sent', 'call', 'linkedin', 'meeting', 'note'];
    const outreachPromises = TEST_ORG_IDS.slice(0, 5).map((orgId, i) =>
      runTest(`Log ${activityTypes[i]} for org ${i + 1}`, async () => {
        await testLogOutreachActivity(orgId, activityTypes[i]);
      })
    );
    await Promise.all(outreachPromises);

    // Phase 4: Test conversion flow
    console.log('\n🔀 Phase 4: Testing conversion to trial...');
    await runTest('Convert prospect to trial', async () => {
      await testConvertToTrial(TEST_ORG_IDS[0]);
    });

    // Phase 5: Test deal stages and outcomes in parallel
    console.log('\n💼 Phase 5: Testing deal stages and outcomes (parallel)...');
    const dealPromises = [
      runTest('Update deal stage to negotiation', async () => {
        await testUpdateDealStage(TEST_ORG_IDS[1], 'negotiation');
      }),
      runTest('Close deal as won', async () => {
        await testCloseDealWon(TEST_ORG_IDS[2]);
      }),
      runTest('Close deal as lost', async () => {
        await testCloseDealLost(TEST_ORG_IDS[3], 'Went with competitor');
      }),
      runTest('Defer deal', async () => {
        await testDeferDeal(TEST_ORG_IDS[4]);
      }),
    ];
    await Promise.all(dealPromises);

    // Phase 6: Query tests
    console.log('\n🔍 Phase 6: Testing queries...');
    await Promise.all([
      runTest('Query prospects by stage', testQueryProspectsByStage),
      runTest('Query prospects by source', testQueryProspectsBySource),
    ]);

  } catch (error: any) {
    console.error('Test execution error:', error.message);
  }

  // Print summary
  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️ Total duration: ${totalDuration}ms`);
  console.log(`📈 Avg test duration: ${Math.round(totalDuration / results.length)}ms`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}: ${r.error}`);
    });
  }

  // Cleanup
  await cleanupTestData();

  console.log('\n✨ Test run complete!');
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);
