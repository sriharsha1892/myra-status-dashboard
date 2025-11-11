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
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

async function testTrialOrgFlow() {
  console.log('🧪 Testing Trial Organizations Flow\n');
  console.log('='.repeat(80) + '\n');

  let createdOrgId: string | null = null;
  let testUserId: string | null = null;

  try {
    // Step 1: Get a test user (super admin)
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
      org_domain: `test${Date.now()}.com`,
      org_description: 'Automated test organization',
      org_lifecycle_stage: 'trial_requested',
      org_industry: 'Technology',
      org_size: '50-200',
      org_country: 'United States',
      org_website: `https://test${Date.now()}.com`,
      trial_start_date: new Date().toISOString(),
      primary_contact_name: 'Test Contact',
      primary_contact_email: `test${Date.now()}@example.com`,
      primary_contact_role: 'CEO',
      created_by: testUserId,
      updated_by: testUserId
    };

    const { data: createdOrg, error: createError } = await supabase
      .from('trial_organizations')
      .insert(testOrg)
      .select()
      .single();

    if (createError || !createdOrg) {
      logResult('Create Trial Org', 'FAIL', 'Failed to create trial org', createError);
      return;
    }

    createdOrgId = createdOrg.id;
    logResult('Create Trial Org', 'PASS', `Created org: ${createdOrg.org_name} (ID: ${createdOrgId})`);

    // Step 3: Read the created organization
    console.log('\n📋 Step 3: Reading trial organization...\n');
    const { data: readOrg, error: readError } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('id', createdOrgId)
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
        account_manager: testUserId,
        notes: 'Updated via automated test',
        updated_by: testUserId
      })
      .eq('id', createdOrgId)
      .select()
      .single();

    if (updateError || !updatedOrg) {
      logResult('Update Trial Org', 'FAIL', 'Failed to update trial org', updateError);
    } else {
      logResult('Update Trial Org', 'PASS', `Updated stage to: ${updatedOrg.org_lifecycle_stage}`);
    }

    // Step 5: Create an activity for the trial org
    console.log('\n📋 Step 5: Creating activity for trial org...\n');
    const { data: activity, error: activityError } = await supabase
      .from('trial_org_activities')
      .insert({
        trial_org_id: createdOrgId,
        activity_type: 'note',
        activity_description: 'Test activity created via automation',
        created_by: testUserId
      })
      .select()
      .single();

    if (activityError || !activity) {
      logResult('Create Activity', 'FAIL', 'Failed to create activity', activityError);
    } else {
      logResult('Create Activity', 'PASS', `Created activity: ${activity.activity_type}`);
    }

    // Step 6: Query activities for the org
    console.log('\n📋 Step 6: Reading activities for trial org...\n');
    const { data: activities, error: activitiesError } = await supabase
      .from('trial_org_activities')
      .select('*')
      .eq('trial_org_id', createdOrgId);

    if (activitiesError || !activities) {
      logResult('Read Activities', 'FAIL', 'Failed to read activities', activitiesError);
    } else {
      logResult('Read Activities', 'PASS', `Found ${activities.length} activities`);
    }

    // Step 7: Create a todo for the trial org
    console.log('\n📋 Step 7: Creating todo for trial org...\n');
    const { data: todo, error: todoError } = await supabase
      .from('user_todos')
      .insert({
        user_id: testUserId,
        trial_org_id: createdOrgId,
        title: 'Test todo for trial org',
        description: 'This is a test todo',
        status: 'pending',
        priority: 'high'
      })
      .select()
      .single();

    if (todoError || !todo) {
      logResult('Create Todo', 'FAIL', 'Failed to create todo', todoError);
    } else {
      logResult('Create Todo', 'PASS', `Created todo: ${todo.title}`);
    }

    // Step 8: Test filtering and search
    console.log('\n📋 Step 8: Testing filters and search...\n');
    const { data: filteredOrgs, error: filterError } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('org_lifecycle_stage', 'trial_active')
      .limit(10);

    if (filterError) {
      logResult('Filter by Stage', 'FAIL', 'Failed to filter orgs', filterError);
    } else {
      logResult('Filter by Stage', 'PASS', `Found ${filteredOrgs?.length || 0} active trials`);
    }

    // Step 9: Test account manager filter
    console.log('\n📋 Step 9: Testing account manager filter...\n');
    const { data: managerOrgs, error: managerError } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('account_manager', testUserId);

    if (managerError) {
      logResult('Filter by Manager', 'FAIL', 'Failed to filter by manager', managerError);
    } else {
      logResult('Filter by Manager', 'PASS', `Found ${managerOrgs?.length || 0} orgs for this manager`);
    }

    // Step 10: Clean up - Delete test data
    console.log('\n📋 Step 10: Cleaning up test data...\n');

    // Delete todo
    if (todo) {
      await supabase.from('user_todos').delete().eq('id', todo.id);
    }

    // Delete activity
    if (activity) {
      await supabase.from('trial_org_activities').delete().eq('id', activity.id);
    }

    // Delete trial org
    if (createdOrgId) {
      const { error: deleteError } = await supabase
        .from('trial_organizations')
        .delete()
        .eq('id', createdOrgId);

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
}

testTrialOrgFlow().catch(console.error);
