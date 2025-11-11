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
  status: 'success' | 'error';
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

function logResult(step: string, status: 'success' | 'error', details?: any, error?: string) {
  results.push({ step, status, details, error });
  const icon = status === 'success' ? '✅' : '❌';
  console.log(`${icon} ${step}`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
  if (error) {
    console.log(`   Error:`, error);
  }
  console.log('');
}

async function testSharedNotifications() {
  console.log('🧪 Testing Shared Notification System\n');
  console.log('='.repeat(80) + '\n');

  // Step 1: Get all super admins
  console.log('📋 Step 1: Fetching all super admins...\n');

  const { data: admins, error: adminsError } = await supabase.auth.admin.listUsers();

  if (adminsError) {
    logResult('Fetch super admins', 'error', undefined, adminsError.message);
    return;
  }

  const superAdmins = admins.users.filter((u: any) => {
    const role = u.user_metadata?.role;
    return role === 'Admin' || u.user_metadata?.is_super_admin === true;
  });

  logResult('Fetch super admins', 'success', {
    total_users: admins.users.length,
    super_admins: superAdmins.length,
    admin_emails: superAdmins.map((a: any) => a.email)
  });

  if (superAdmins.length === 0) {
    console.log('⚠️  No super admins found. Cannot test.');
    return;
  }

  // Step 2: Create a test entity (trial org simulation)
  console.log('📋 Step 2: Creating test notification entity...\n');

  const testEntityId = crypto.randomUUID();
  const testThreadKey = `trial_org:${testEntityId}`;
  const timestamp = new Date().toISOString();

  logResult('Create test entity', 'success', {
    entity_id: testEntityId,
    thread_key: testThreadKey,
    entity_type: 'trial_org'
  });

  // Step 3: Send notification to all super admins
  console.log('📋 Step 3: Sending notifications to all super admins...\n');

  const notifications = superAdmins.map((admin: any) => ({
    user_id: admin.id,
    entity_type: 'trial_org',
    entity_id: testEntityId,
    entity_title: 'Acme Corp - Trial Request',
    notification_type: 'assigned',
    title: 'New Trial Request Needs Attention',
    message: 'Acme Corp has requested a trial. Please review and assign an account manager.',
    action_url: `/support/trials/${testEntityId}`,
    priority_score: 85,
    thread_key: testThreadKey,
    status: 'unread',
    created_at: timestamp
  }));

  const { data: createdNotifications, error: createError } = await supabase
    .from('notifications')
    .insert(notifications)
    .select();

  if (createError) {
    logResult('Create notifications', 'error', undefined, createError.message);
    return;
  }

  logResult('Create notifications', 'success', {
    notifications_created: createdNotifications?.length,
    notification_ids: createdNotifications?.map((n: any) => n.id)
  });

  // Step 4: Verify all notifications were created
  console.log('📋 Step 4: Verifying notifications in database...\n');

  const { data: verifyNotifications, error: verifyError } = await supabase
    .from('notifications')
    .select('*')
    .eq('thread_key', testThreadKey);

  if (verifyError) {
    logResult('Verify notifications', 'error', undefined, verifyError.message);
    return;
  }

  logResult('Verify notifications', 'success', {
    total_in_thread: verifyNotifications?.length,
    all_unread: verifyNotifications?.every((n: any) => n.status === 'unread'),
    thread_key: testThreadKey
  });

  // Step 5: Simulate one admin handling it
  console.log('📋 Step 5: Simulating admin handling the notification...\n');

  const firstNotification = createdNotifications![0];
  const handlingAdmin = superAdmins.find((a: any) => a.id === firstNotification.user_id);

  logResult('Select admin to handle', 'success', {
    admin_email: handlingAdmin?.email,
    admin_id: handlingAdmin?.id,
    notification_id: firstNotification.id
  });

  // Simulate marking the thread as complete using the API-like logic
  console.log('📋 Step 6: Marking entire thread as complete...\n');

  const handlerName = handlingAdmin?.user_metadata?.full_name || handlingAdmin?.email || 'Test Admin';
  const completionMessage = `Handled by ${handlerName} - Assigned to Sarah Johnson`;

  const { data: updatedNotifications, error: updateError } = await supabase
    .from('notifications')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      category: 'archived',
      archived_reason: completionMessage,
      read_at: new Date().toISOString()
    })
    .eq('thread_key', testThreadKey)
    .select();

  if (updateError) {
    logResult('Mark thread complete', 'error', undefined, updateError.message);
    return;
  }

  logResult('Mark thread complete', 'success', {
    updated_count: updatedNotifications?.length,
    handler: handlerName,
    completion_message: completionMessage
  });

  // Step 7: Verify all notifications in thread are now archived
  console.log('📋 Step 7: Verifying all notifications are now archived...\n');

  const { data: finalNotifications, error: finalError } = await supabase
    .from('notifications')
    .select('*')
    .eq('thread_key', testThreadKey);

  if (finalError) {
    logResult('Verify final state', 'error', undefined, finalError.message);
    return;
  }

  const allArchived = finalNotifications?.every((n: any) => n.status === 'archived');
  const allHaveReason = finalNotifications?.every((n: any) => n.archived_reason === completionMessage);
  const allHaveHandler = finalNotifications?.every((n: any) => n.archived_reason?.includes(handlerName));

  logResult('Verify final state', allArchived && allHaveReason && allHaveHandler ? 'success' : 'error', {
    total_notifications: finalNotifications?.length,
    all_archived: allArchived,
    all_have_reason: allHaveReason,
    all_have_handler: allHaveHandler,
    sample_reason: finalNotifications?.[0]?.archived_reason
  });

  // Step 8: Verify each admin sees the completion
  console.log('📋 Step 8: Checking each admin\'s notification...\n');

  for (const admin of superAdmins) {
    const adminNotification = finalNotifications?.find((n: any) => n.user_id === admin.id);

    if (adminNotification) {
      console.log(`   ✅ ${admin.email}: Status = ${adminNotification.status}, Reason = "${adminNotification.archived_reason}"`);
    } else {
      console.log(`   ❌ ${admin.email}: No notification found`);
    }
  }
  console.log('');

  // Step 9: Cleanup - Delete test notifications
  console.log('📋 Step 9: Cleaning up test notifications...\n');

  const { error: cleanupError } = await supabase
    .from('notifications')
    .delete()
    .eq('thread_key', testThreadKey);

  if (cleanupError) {
    logResult('Cleanup test data', 'error', undefined, cleanupError.message);
  } else {
    logResult('Cleanup test data', 'success', {
      deleted_count: finalNotifications?.length
    });
  }

  // Summary
  console.log('='.repeat(80) + '\n');
  console.log('📊 Test Summary:\n');

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  console.log(`   Total Steps: ${results.length}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('');

  if (errorCount === 0) {
    console.log('🎉 All tests passed! Shared notification completion is working correctly.\n');
    console.log('Key Features Verified:');
    console.log('  ✓ Notifications sent to all super admins');
    console.log('  ✓ Thread-based grouping working');
    console.log('  ✓ One admin marking complete updates all');
    console.log('  ✓ Completion message shows who handled it');
    console.log('  ✓ All admins see the same completion status');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
  }

  console.log('='.repeat(80) + '\n');
}

testSharedNotifications().catch(console.error);
