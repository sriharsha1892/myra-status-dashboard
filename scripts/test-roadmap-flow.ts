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

async function testRoadmapFlow() {
  console.log('🧪 Testing Roadmap Flow\n');
  console.log('='.repeat(80) + '\n');

  let createdItemId: string | null = null;
  let testUserId: string | null = null;

  try {
    // Step 1: Get a test user (admin)
    console.log('📋 Step 1: Finding test admin user...\n');
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

    // Step 2: Create a roadmap item
    console.log('\n📋 Step 2: Creating roadmap item...\n');
    const testRoadmapItem = {
      title: `Test Feature ${Date.now()}`,
      description: 'This is a test roadmap item created via automation',
      status: 'planned',
      priority: 'high',
      category: 'feature',
      quarter: 'Q1',
      estimated_effort: 'medium',
      created_by: testUserId,
      updated_by: testUserId
    };

    const { data: createdItem, error: createError } = await supabase
      .from('roadmap_items')
      .insert(testRoadmapItem)
      .select()
      .single();

    if (createError || !createdItem) {
      logResult('Create Roadmap Item', 'FAIL', 'Failed to create roadmap item', createError);
      return;
    }

    createdItemId = createdItem.id;
    logResult('Create Roadmap Item', 'PASS', `Created item: ${createdItem.title} (ID: ${createdItemId})`);

    // Step 3: Read the created roadmap item
    console.log('\n📋 Step 3: Reading roadmap item...\n');
    const { data: readItem, error: readError } = await supabase
      .from('roadmap_items')
      .select('*')
      .eq('id', createdItemId)
      .single();

    if (readError || !readItem) {
      logResult('Read Roadmap Item', 'FAIL', 'Failed to read roadmap item', readError);
    } else {
      logResult('Read Roadmap Item', 'PASS', `Successfully read item: ${readItem.title}`);
    }

    // Step 4: Update roadmap item status
    console.log('\n📋 Step 4: Updating roadmap item status...\n');
    const { data: updatedItem, error: updateError } = await supabase
      .from('roadmap_items')
      .update({
        status: 'in_progress',
        updated_by: testUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', createdItemId)
      .select()
      .single();

    if (updateError || !updatedItem) {
      logResult('Update Roadmap Item', 'FAIL', 'Failed to update roadmap item', updateError);
    } else {
      logResult('Update Roadmap Item', 'PASS', `Updated status to: ${updatedItem.status}`);
    }

    // Step 5: Test filtering by status
    console.log('\n📋 Step 5: Testing filter by status...\n');
    const { data: plannedItems, error: statusError } = await supabase
      .from('roadmap_items')
      .select('*')
      .in('status', ['planned', 'in_progress'])
      .limit(10);

    if (statusError) {
      logResult('Filter by Status', 'FAIL', 'Failed to filter by status', statusError);
    } else {
      logResult('Filter by Status', 'PASS', `Found ${plannedItems?.length || 0} planned/in-progress items`);
    }

    // Step 6: Test filtering by quarter
    console.log('\n📋 Step 6: Testing filter by quarter...\n');
    const { data: q1Items, error: quarterError } = await supabase
      .from('roadmap_items')
      .select('*')
      .eq('quarter', 'Q1')
      .limit(10);

    if (quarterError) {
      logResult('Filter by Quarter', 'FAIL', 'Failed to filter by quarter', quarterError);
    } else {
      logResult('Filter by Quarter', 'PASS', `Found ${q1Items?.length || 0} Q1 items`);
    }

    // Step 7: Test filtering by priority
    console.log('\n📋 Step 7: Testing filter by priority...\n');
    const { data: highPriorityItems, error: priorityError } = await supabase
      .from('roadmap_items')
      .select('*')
      .eq('priority', 'high')
      .limit(10);

    if (priorityError) {
      logResult('Filter by Priority', 'FAIL', 'Failed to filter by priority', priorityError);
    } else {
      logResult('Filter by Priority', 'PASS', `Found ${highPriorityItems?.length || 0} high priority items`);
    }

    // Step 8: Test filtering by category
    console.log('\n📋 Step 8: Testing filter by category...\n');
    const { data: featureItems, error: categoryError } = await supabase
      .from('roadmap_items')
      .select('*')
      .eq('category', 'feature')
      .limit(10);

    if (categoryError) {
      logResult('Filter by Category', 'FAIL', 'Failed to filter by category', categoryError);
    } else {
      logResult('Filter by Category', 'PASS', `Found ${featureItems?.length || 0} feature items`);
    }

    // Step 9: Test ordering (by priority, then date)
    console.log('\n📋 Step 9: Testing ordering...\n');
    const { data: orderedItems, error: orderError } = await supabase
      .from('roadmap_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (orderError) {
      logResult('Order Items', 'FAIL', 'Failed to order items', orderError);
    } else {
      logResult('Order Items', 'PASS', `Retrieved ${orderedItems?.length || 0} ordered items`);
    }

    // Step 10: Clean up - Delete test data
    console.log('\n📋 Step 10: Cleaning up test data...\n');

    if (createdItemId) {
      const { error: deleteError } = await supabase
        .from('roadmap_items')
        .delete()
        .eq('id', createdItemId);

      if (deleteError) {
        logResult('Cleanup', 'FAIL', 'Failed to delete test roadmap item', deleteError);
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
    console.log('🎉 All roadmap tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed. Review the details above.\n');
  }

  console.log('='.repeat(80) + '\n');
}

testRoadmapFlow().catch(console.error);
