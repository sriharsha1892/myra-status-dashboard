import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(step: string, status: 'PASS' | 'FAIL', message: string, details?: any) {
  results.push({ step, status, message, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${step}: ${message}`);
  if (details && status === 'FAIL') {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

async function testTrialOrgFlow() {
  console.log('🧪 Testing Trial Organizations Flow\n');
  console.log('='.repeat(80) + '\n');

  let createdOrgId: string | null = null;
  let testUserId: string | null = null;

  try {
    // Step 1: Get a test user
    console.log('📋 Step 1: Finding test user...\n');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('role', 'admin')
      .limit(1);

    if (userError || !users || users.length === 0) {
      logResult('Find Test User', 'FAIL', 'Could not find admin user', userError);
      return;
    }

    testUserId = users[0].id;
    logResult('Find Test User', 'PASS', `Found admin: ${users[0].email}`);

    // Step 2: Create a trial organization
    console.log('\n📋 Step 2: Creating trial organization...\n');
    const testOrg = {
      org_name: `Test Org ${Date.now()}`,
      domain: 'TMT',
      org_url: `https://test${Date.now()}.com`,
      logo_url: `https://logo.clearbit.com/test${Date.now()}.com`,
      description: 'Automated test organization for flow testing',
      org_lifecycle_stage: 'prospect',
      trial_status: 'requested',
      account_manager_id: testUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdOrg, error: createError } = await supabase
      .from('trial_organizations')
      .insert(testOrg)
      .select('org_id, org_name')
      .single();

    if (createError || !createdOrg) {
      logResult('Create Trial Org', 'FAIL', 'Failed to create trial org', createError);
      return;
    }

    createdOrgId = createdOrg.org_id;
    logResult('Create Trial Org', 'PASS', `Created org: ${createdOrg.org_name} (ID: ${createdOrgId})`);

    // Step 3: Read the created organization
    console.log('\n📋 Step 3: Reading trial organization...\n');
    const { data: readOrg, error: readError } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('org_id', createdOrgId)
      .single();

    if (readError || !readOrg) {
      logResult('Read Trial Org', 'FAIL', 'Failed to read trial org', readError);
    } else {
      logResult('Read Trial Org', 'PASS', `Successfully read org: ${readOrg.org_name}`);
    }

    // Step 4: Update the organization
    console.log('\n📋 Step 4: Updating trial organization...\n');
    const { data: updatedOrg, error: updateError } = await supabase
      .from('trial_organizations')
      .update({
        org_lifecycle_stage: 'trial_active',
        trial_status: 'active',
        trial_start_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('org_id', createdOrgId)
      .select('org_id, org_lifecycle_stage, trial_status')
      .single();

    if (updateError || !updatedOrg) {
      logResult('Update Trial Org', 'FAIL', 'Failed to update trial org', updateError);
    } else {
      logResult('Update Trial Org', 'PASS', `Updated stage to: ${updatedOrg.org_lifecycle_stage}, status: ${updatedOrg.trial_status}`);
    }

    // Step 5: Test filtering by lifecycle stage
    console.log('\n📋 Step 5: Testing filter by lifecycle stage...\n');
    const { data: prospectOrgs, error: filterError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, org_lifecycle_stage')
      .eq('org_lifecycle_stage', 'trial_active')
      .limit(10);

    if (filterError) {
      logResult('Filter by Stage', 'FAIL', 'Failed to filter orgs', filterError);
    } else {
      logResult('Filter by Stage', 'PASS', `Found ${prospectOrgs?.length || 0} trial orgs`);
    }

    // Step 6: Test filtering by account manager
    console.log('\n📋 Step 6: Testing filter by account manager...\n');
    const { data: managerOrgs, error: managerError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, account_manager_id')
      .eq('account_manager_id', testUserId)
      .limit(10);

    if (managerError) {
      logResult('Filter by Manager', 'FAIL', 'Failed to filter by manager', managerError);
    } else {
      logResult('Filter by Manager', 'PASS', `Found ${managerOrgs?.length || 0} orgs for this manager`);
    }

    // Step 7: Test filtering by domain
    console.log('\n📋 Step 7: Testing filter by domain...\n');
    const { data: domainOrgs, error: domainError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, domain')
      .eq('domain', 'TMT')
      .limit(10);

    if (domainError) {
      logResult('Filter by Domain', 'FAIL', 'Failed to filter by domain', domainError);
    } else {
      logResult('Filter by Domain', 'PASS', `Found ${domainOrgs?.length || 0} TMT domain orgs`);
    }

    // Step 8: Test search by name
    console.log('\n📋 Step 8: Testing search by name...\n');
    const { data: searchOrgs, error: searchError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .ilike('org_name', '%Test%')
      .limit(10);

    if (searchError) {
      logResult('Search by Name', 'FAIL', 'Failed to search orgs', searchError);
    } else {
      logResult('Search by Name', 'PASS', `Found ${searchOrgs?.length || 0} orgs matching "Test"`);
    }

    // Step 9: Test ordering (most recent first)
    console.log('\n📋 Step 9: Testing ordering...\n');
    const { data: recentOrgs, error: orderError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (orderError) {
      logResult('Order Orgs', 'FAIL', 'Failed to order orgs', orderError);
    } else {
      logResult('Order Orgs', 'PASS', `Retrieved ${recentOrgs?.length || 0} most recent orgs`);
    }

    // Step 10: Clean up - Delete test data
    console.log('\n📋 Step 10: Cleaning up test data...\n');

    if (createdOrgId) {
      const { error: deleteError } = await supabase
        .from('trial_organizations')
        .delete()
        .eq('org_id', createdOrgId);

      if (deleteError) {
        logResult('Cleanup', 'FAIL', 'Failed to delete test org', deleteError);
      } else {
        logResult('Cleanup', 'PASS', 'Successfully cleaned up test data');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    logResult('Unexpected Error', 'FAIL', 'Test failed with unexpected error', error);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 TEST SUMMARY\n');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All trial organization tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed. Review the details above.\n');
  }

  console.log('='.repeat(80) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

testTrialOrgFlow().catch(console.error);
