/**
 * Comprehensive Prospect Pipeline Test
 * Tests all prospect flows to ensure optimal functionality
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test utilities
const TEST_PREFIX = 'TEST_FLOW_';
let testOrgId: string | null = null;
let testActivityId: string | null = null;
let defaultAccountManagerId: string | null = null;
const results: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ test: name, status: 'PASS' });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ test: name, status: 'FAIL', details: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');

  // Delete test activities
  await supabase
    .from('prospect_activities')
    .delete()
    .like('org_id', `${TEST_PREFIX}%`);

  // Delete test orgs
  await supabase
    .from('trial_organizations')
    .delete()
    .like('org_name', `${TEST_PREFIX}%`);

  console.log('✅ Cleanup complete');
}

async function runTests() {
  console.log('🚀 Starting Prospect Pipeline Tests\n');
  console.log('=' .repeat(50));

  // Setup: Get a default account manager ID
  console.log('📋 Setup: Getting default account manager...');
  const { data: users } = await supabase.from('users').select('id').limit(1);
  defaultAccountManagerId = users?.[0]?.id || null;
  if (!defaultAccountManagerId) {
    console.log('⚠️  No users found in database, some tests may fail');
  } else {
    console.log(`✅ Using account manager: ${defaultAccountManagerId}\n`);
  }

  // =====================================================
  // TEST 1: Create Prospect Organization
  // =====================================================
  await test('1. Create prospect organization', async () => {
    testOrgId = generateUUID();
    const orgName = `${TEST_PREFIX}Acme Corp ${Date.now()}`;

    const { error } = await supabase
      .from('trial_organizations')
      .insert({
        org_id: testOrgId,
        org_name: orgName,
        domain: 'TMT',
        is_prospect: true,
        prospect_stage: 'cold_lead',
        prospect_source: 'cold_outreach',
        icp_fit_score: 75,
        org_lifecycle_stage: 'prospect',
        trial_status: 'requested',
        account_manager_id: defaultAccountManagerId,
      });

    if (error) throw new Error(error.message);
  });

  // =====================================================
  // TEST 2: Query prospect by is_prospect flag
  // =====================================================
  await test('2. Query prospects (is_prospect=true)', async () => {
    const { data, error } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('org_id', testOrgId)
      .eq('is_prospect', true)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Prospect not found');
    if (data.prospect_stage !== 'cold_lead') throw new Error(`Wrong stage: ${data.prospect_stage}`);
  });

  // =====================================================
  // TEST 3: Update prospect stage (simulate drag-drop)
  // =====================================================
  await test('3. Update prospect stage (cold_lead → contacted)', async () => {
    const { error } = await supabase
      .from('trial_organizations')
      .update({ prospect_stage: 'contacted' })
      .eq('org_id', testOrgId);

    if (error) throw new Error(error.message);

    // Verify the update
    const { data } = await supabase
      .from('trial_organizations')
      .select('prospect_stage')
      .eq('org_id', testOrgId)
      .single();

    if (data?.prospect_stage !== 'contacted') {
      throw new Error(`Stage not updated: ${data?.prospect_stage}`);
    }
  });

  // =====================================================
  // TEST 4: Log outreach activity
  // =====================================================
  await test('4. Log outreach activity', async () => {
    testActivityId = generateUUID();

    const { error } = await supabase
      .from('prospect_activities')
      .insert({
        id: testActivityId,
        org_id: testOrgId,
        activity_type: 'email_sent',
        direction: 'outbound',
        subject: 'Introduction to MyRA AI',
        content: 'Sent initial outreach email discussing platform benefits',
        activity_date: new Date().toISOString(),
      });

    if (error) throw new Error(error.message);
  });

  // =====================================================
  // TEST 5: Query activities for prospect
  // =====================================================
  await test('5. Query activities for prospect', async () => {
    const { data, error } = await supabase
      .from('prospect_activities')
      .select('*')
      .eq('org_id', testOrgId);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('No activities found');
    if (data[0].activity_type !== 'email_sent') throw new Error('Wrong activity type');
  });

  // =====================================================
  // TEST 6: Progress through full pipeline
  // =====================================================
  await test('6. Progress through stages (contacted → responded → screening)', async () => {
    const stages = ['responded', 'screening'];

    for (const stage of stages) {
      const { error } = await supabase
        .from('trial_organizations')
        .update({ prospect_stage: stage })
        .eq('org_id', testOrgId);

      if (error) throw new Error(`Failed at ${stage}: ${error.message}`);
    }

    const { data } = await supabase
      .from('trial_organizations')
      .select('prospect_stage')
      .eq('org_id', testOrgId)
      .single();

    if (data?.prospect_stage !== 'screening') {
      throw new Error(`Final stage wrong: ${data?.prospect_stage}`);
    }
  });

  // =====================================================
  // TEST 7: Update ICP score
  // =====================================================
  await test('7. Update ICP fit score', async () => {
    const { error } = await supabase
      .from('trial_organizations')
      .update({ icp_fit_score: 85 })
      .eq('org_id', testOrgId);

    if (error) throw new Error(error.message);

    const { data } = await supabase
      .from('trial_organizations')
      .select('icp_fit_score')
      .eq('org_id', testOrgId)
      .single();

    if (data?.icp_fit_score !== 85) {
      throw new Error(`ICP score not updated: ${data?.icp_fit_score}`);
    }
  });

  // =====================================================
  // TEST 8: Schedule demo (stage change)
  // =====================================================
  await test('8. Move to demo_scheduled stage', async () => {
    const { error } = await supabase
      .from('trial_organizations')
      .update({ prospect_stage: 'demo_scheduled' })
      .eq('org_id', testOrgId);

    if (error) throw new Error(error.message);
  });

  // =====================================================
  // TEST 9: Log demo activity
  // =====================================================
  await test('9. Log demo activity', async () => {
    const { error } = await supabase
      .from('prospect_activities')
      .insert({
        id: generateUUID(),
        org_id: testOrgId,
        activity_type: 'demo',
        direction: 'outbound',
        subject: 'Product Demo',
        content: 'Completed 45-minute demo with decision maker',
        activity_date: new Date().toISOString(),
      });

    if (error) throw new Error(error.message);
  });

  // =====================================================
  // TEST 10: Convert to trial
  // =====================================================
  await test('10. Convert prospect to trial', async () => {
    const { error } = await supabase
      .from('trial_organizations')
      .update({
        is_prospect: false,
        prospect_stage: null,
        trial_status: 'active',
        org_lifecycle_stage: 'trial_active',
        trial_start_date: new Date().toISOString(),
      })
      .eq('org_id', testOrgId);

    if (error) throw new Error(error.message);

    // Verify conversion
    const { data } = await supabase
      .from('trial_organizations')
      .select('is_prospect, trial_status, org_lifecycle_stage')
      .eq('org_id', testOrgId)
      .single();

    if (data?.is_prospect !== false) throw new Error('Still marked as prospect');
    if (data?.trial_status !== 'active') throw new Error(`Wrong trial status: ${data?.trial_status}`);
  });

  // =====================================================
  // TEST 11: Verify prospect no longer appears in prospect queries
  // =====================================================
  await test('11. Converted org no longer in prospect list', async () => {
    const { data } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('org_id', testOrgId)
      .eq('is_prospect', true);

    if (data && data.length > 0) {
      throw new Error('Converted org still appears as prospect');
    }
  });

  // =====================================================
  // TEST 12: Activities preserved after conversion
  // =====================================================
  await test('12. Activities preserved after conversion', async () => {
    const { data, error } = await supabase
      .from('prospect_activities')
      .select('*')
      .eq('org_id', testOrgId);

    if (error) throw new Error(error.message);
    if (!data || data.length < 2) {
      throw new Error(`Expected 2+ activities, got ${data?.length}`);
    }
  });

  // =====================================================
  // TEST 13: Create and disqualify prospect
  // =====================================================
  await test('13. Create and disqualify prospect', async () => {
    const disqualifyOrgId = generateUUID();

    // Create
    await supabase
      .from('trial_organizations')
      .insert({
        org_id: disqualifyOrgId,
        org_name: `${TEST_PREFIX}Disqualify Test`,
        domain: 'TMT',
        is_prospect: true,
        prospect_stage: 'contacted',
        prospect_source: 'inbound',
        org_lifecycle_stage: 'prospect',
        trial_status: 'requested',
        account_manager_id: defaultAccountManagerId,
      });

    // Disqualify
    const { error } = await supabase
      .from('trial_organizations')
      .update({ prospect_stage: 'disqualified' })
      .eq('org_id', disqualifyOrgId);

    if (error) throw new Error(error.message);

    const { data } = await supabase
      .from('trial_organizations')
      .select('prospect_stage')
      .eq('org_id', disqualifyOrgId)
      .single();

    if (data?.prospect_stage !== 'disqualified') {
      throw new Error('Disqualify failed');
    }
  });

  // =====================================================
  // TEST 14: Bulk create prospects
  // =====================================================
  await test('14. Bulk create prospects (simulating CSV import)', async () => {
    const prospects = [
      { org_id: generateUUID(), org_name: `${TEST_PREFIX}Bulk 1`, prospect_source: 'linkedin' },
      { org_id: generateUUID(), org_name: `${TEST_PREFIX}Bulk 2`, prospect_source: 'event' },
      { org_id: generateUUID(), org_name: `${TEST_PREFIX}Bulk 3`, prospect_source: 'referral' },
    ];

    const { error } = await supabase
      .from('trial_organizations')
      .insert(prospects.map(p => ({
        ...p,
        domain: 'TMT',
        is_prospect: true,
        prospect_stage: 'cold_lead',
        org_lifecycle_stage: 'prospect',
        trial_status: 'requested',
        account_manager_id: defaultAccountManagerId,
      })));

    if (error) throw new Error(error.message);

    // Verify all created
    const { data } = await supabase
      .from('trial_organizations')
      .select('org_id')
      .in('org_id', prospects.map(p => p.org_id));

    if (data?.length !== 3) {
      throw new Error(`Expected 3 prospects, got ${data?.length}`);
    }
  });

  // =====================================================
  // TEST 15: Filter prospects by source
  // =====================================================
  await test('15. Filter prospects by source', async () => {
    const { data, error } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('is_prospect', true)
      .eq('prospect_source', 'linkedin')
      .like('org_name', `${TEST_PREFIX}%`);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error('No LinkedIn prospects found');
    }
  });

  // =====================================================
  // SUMMARY
  // =====================================================
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${results.length}`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.test}: ${r.details}`);
    });
  }

  // Cleanup
  await cleanup();

  console.log('\n' + (failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed'));
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
