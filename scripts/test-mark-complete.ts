import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Test marking a notification from the demo as complete
 * Pass the thread_key as an argument
 */
async function testMarkComplete() {
  const threadKey = process.argv[2];

  if (!threadKey) {
    console.error('❌ Please provide a thread_key as an argument');
    console.log('Usage: npx tsx scripts/test-mark-complete.ts <thread_key>');
    console.log('Example: npx tsx scripts/test-mark-complete.ts trial_org:8400279c-e5a2-4d7f-acb2-b4b4788031da');
    process.exit(1);
  }

  console.log('🧪 Testing Notification Completion\n');
  console.log('='.repeat(80) + '\n');
  console.log(`Thread Key: ${threadKey}\n`);

  // Step 1: Get all notifications in the thread
  console.log('📋 Step 1: Fetching all notifications in thread...\n');

  const { data: notifications, error: fetchError } = await supabase
    .from('notifications')
    .select('*')
    .eq('thread_key', threadKey);

  if (fetchError) {
    console.error('❌ Error fetching notifications:', fetchError);
    return;
  }

  if (!notifications || notifications.length === 0) {
    console.error('❌ No notifications found with that thread_key');
    return;
  }

  console.log(`✅ Found ${notifications.length} notifications\n`);
  notifications.forEach((n: any, idx: number) => {
    console.log(`   ${idx + 1}. ID: ${n.id.substring(0, 8)}... Status: ${n.status}`);
  });
  console.log('');

  // Step 2: Select first admin to mark as complete
  const firstNotification = notifications[0];
  const { data: admin } = await supabase.auth.admin.getUserById(firstNotification.user_id);

  console.log('📋 Step 2: Simulating admin marking as complete...\n');
  console.log(`   Admin: ${admin.user?.email || 'Unknown'}`);
  console.log(`   Notification ID: ${firstNotification.id}\n`);

  // Step 3: Mark the entire thread as complete
  console.log('📋 Step 3: Marking thread as complete...\n');

  const handlerName = admin.user?.user_metadata?.full_name || admin.user?.email || 'Test Admin';
  const completionNote = `Handled by ${handlerName} - Demo trial approved and assigned`;

  const { data: updated, error: updateError } = await supabase
    .from('notifications')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      category: 'archived',
      archived_reason: completionNote,
      read_at: new Date().toISOString()
    })
    .eq('thread_key', threadKey)
    .select();

  if (updateError) {
    console.error('❌ Error updating notifications:', updateError);
    return;
  }

  console.log(`✅ Updated ${updated.length} notifications\n`);

  // Step 4: Verify all are now archived
  console.log('📋 Step 4: Verifying all notifications are archived...\n');

  const { data: verified } = await supabase
    .from('notifications')
    .select('*')
    .eq('thread_key', threadKey);

  const allArchived = verified?.every((n: any) => n.status === 'archived');
  const allHaveReason = verified?.every((n: any) => n.archived_reason === completionNote);

  if (allArchived && allHaveReason) {
    console.log('✅ SUCCESS! All notifications properly updated\n');
    verified?.forEach((n: any, idx: number) => {
      console.log(`   ${idx + 1}. Status: ${n.status}, Reason: "${n.archived_reason}"`);
    });
  } else {
    console.error('❌ FAILED! Some notifications not properly updated');
  }

  console.log('\n' + '='.repeat(80) + '\n');
  console.log('✨ Test Complete!\n');
  console.log('Key Observations:');
  console.log(`  • Started with ${notifications.length} unread notifications`);
  console.log(`  • Marked entire thread as complete`);
  console.log(`  • All ${verified?.length} notifications now show as handled`);
  console.log(`  • Completion message: "${completionNote}"`);
  console.log('\n' + '='.repeat(80) + '\n');
}

testMarkComplete().catch(console.error);
