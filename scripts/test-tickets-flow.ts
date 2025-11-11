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

async function testTicketsFlow() {
  console.log('🧪 Testing Tickets Flow\n');
  console.log('='.repeat(80) + '\n');

  let createdTicketId: string | null = null;
  let testUserId: string | null = null;
  let testOrgId: string | null = null;

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

    // Step 2: Get or create a test trial org
    console.log('\n📋 Step 2: Finding test trial org...\n');
    const { data: orgs } = await supabase
      .from('trial_organizations')
      .select('id, org_name')
      .limit(1);

    if (orgs && orgs.length > 0) {
      testOrgId = orgs[0].id;
      logResult('Find Test Org', 'PASS', `Found org: ${orgs[0].org_name}`);
    } else {
      // Create a test org
      const { data: newOrg } = await supabase
        .from('trial_organizations')
        .insert({
          org_name: `Test Org for Tickets ${Date.now()}`,
          org_domain: `testtickets${Date.now()}.com`,
          created_by: testUserId,
          updated_by: testUserId
        })
        .select()
        .single();

      if (newOrg) {
        testOrgId = newOrg.id;
        logResult('Create Test Org', 'PASS', `Created org: ${newOrg.org_name}`);
      } else {
        logResult('Find/Create Org', 'FAIL', 'Could not find or create test org');
        return;
      }
    }

    // Step 3: Create a ticket
    console.log('\n📋 Step 3: Creating ticket...\n');
    const testTicket = {
      title: `Test Ticket ${Date.now()}`,
      description: 'This is a test ticket created via automation',
      status: 'open',
      priority: 'high',
      category: 'bug',
      created_by: testUserId,
      assigned_to: testUserId,
      trial_org_id: testOrgId
    };

    const { data: createdTicket, error: createError } = await supabase
      .from('tickets')
      .insert(testTicket)
      .select()
      .single();

    if (createError || !createdTicket) {
      logResult('Create Ticket', 'FAIL', 'Failed to create ticket', createError);
      return;
    }

    createdTicketId = createdTicket.id;
    logResult('Create Ticket', 'PASS', `Created ticket: ${createdTicket.title} (ID: ${createdTicketId})`);

    // Step 4: Read the created ticket
    console.log('\n📋 Step 4: Reading ticket...\n');
    const { data: readTicket, error: readError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', createdTicketId)
      .single();

    if (readError || !readTicket) {
      logResult('Read Ticket', 'FAIL', 'Failed to read ticket', readError);
    } else {
      logResult('Read Ticket', 'PASS', `Successfully read ticket: ${readTicket.title}`);
    }

    // Step 5: Update ticket status
    console.log('\n📋 Step 5: Updating ticket status...\n');
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', createdTicketId)
      .select()
      .single();

    if (updateError || !updatedTicket) {
      logResult('Update Ticket', 'FAIL', 'Failed to update ticket', updateError);
    } else {
      logResult('Update Ticket', 'PASS', `Updated status to: ${updatedTicket.status}`);
    }

    // Step 6: Create a comment
    console.log('\n📋 Step 6: Creating ticket comment...\n');
    const { data: comment, error: commentError } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: createdTicketId,
        user_id: testUserId,
        comment: 'This is a test comment'
      })
      .select()
      .single();

    if (commentError || !comment) {
      logResult('Create Comment', 'FAIL', 'Failed to create comment', commentError);
    } else {
      logResult('Create Comment', 'PASS', `Created comment on ticket`);
    }

    // Step 7: Read comments for ticket
    console.log('\n📋 Step 7: Reading ticket comments...\n');
    const { data: comments, error: commentsError } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', createdTicketId);

    if (commentsError || !comments) {
      logResult('Read Comments', 'FAIL', 'Failed to read comments', commentsError);
    } else {
      logResult('Read Comments', 'PASS', `Found ${comments.length} comments`);
    }

    // Step 8: Test filtering by status
    console.log('\n📋 Step 8: Testing filter by status...\n');
    const { data: openTickets, error: filterError } = await supabase
      .from('tickets')
      .select('*')
      .in('status', ['open', 'in_progress'])
      .limit(10);

    if (filterError) {
      logResult('Filter by Status', 'FAIL', 'Failed to filter tickets', filterError);
    } else {
      logResult('Filter by Status', 'PASS', `Found ${openTickets?.length || 0} open/in-progress tickets`);
    }

    // Step 9: Test filtering by priority
    console.log('\n📋 Step 9: Testing filter by priority...\n');
    const { data: highPriorityTickets, error: priorityError } = await supabase
      .from('tickets')
      .select('*')
      .eq('priority', 'high')
      .limit(10);

    if (priorityError) {
      logResult('Filter by Priority', 'FAIL', 'Failed to filter by priority', priorityError);
    } else {
      logResult('Filter by Priority', 'PASS', `Found ${highPriorityTickets?.length || 0} high priority tickets`);
    }

    // Step 10: Test filtering by assignee
    console.log('\n📋 Step 10: Testing filter by assignee...\n');
    const { data: assignedTickets, error: assigneeError } = await supabase
      .from('tickets')
      .select('*')
      .eq('assigned_to', testUserId)
      .limit(10);

    if (assigneeError) {
      logResult('Filter by Assignee', 'FAIL', 'Failed to filter by assignee', assigneeError);
    } else {
      logResult('Filter by Assignee', 'PASS', `Found ${assignedTickets?.length || 0} tickets assigned to user`);
    }

    // Step 11: Clean up - Delete test data
    console.log('\n📋 Step 11: Cleaning up test data...\n');

    // Delete comment
    if (comment) {
      await supabase.from('ticket_comments').delete().eq('id', comment.id);
    }

    // Delete ticket
    if (createdTicketId) {
      const { error: deleteError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', createdTicketId);

      if (deleteError) {
        logResult('Cleanup', 'FAIL', 'Failed to delete test ticket', deleteError);
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
    console.log('🎉 All ticket tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed. Review the details above.\n');
  }

  console.log('='.repeat(80) + '\n');
}

testTicketsFlow().catch(console.error);
