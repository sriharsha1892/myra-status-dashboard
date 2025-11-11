import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Demo script to send a notification to all super admins
 * This simulates a real scenario where an urgent trial request needs attention
 */
async function sendDemoNotification() {
  console.log('🚀 Sending Demo Notification to All Super Admins\n');
  console.log('='.repeat(80) + '\n');

  // Get all super admins
  const { data: admins } = await supabase.auth.admin.listUsers();
  const superAdmins = admins.users.filter((u: any) => {
    const role = u.user_metadata?.role;
    return role === 'Admin' || u.user_metadata?.is_super_admin === true;
  });

  console.log(`📧 Found ${superAdmins.length} super admins:\n`);
  superAdmins.forEach((admin: any, idx: number) => {
    console.log(`   ${idx + 1}. ${admin.email} (${admin.user_metadata?.full_name || 'No name'})`);
  });
  console.log('');

  // Create a demo entity
  const demoEntityId = crypto.randomUUID();
  const threadKey = `trial_org:${demoEntityId}`;

  console.log(`🔑 Creating notification with thread_key: ${threadKey}\n`);

  // Create notifications for all admins
  const notifications = superAdmins.map((admin: any) => ({
    user_id: admin.id,
    entity_type: 'trial_org',
    entity_id: demoEntityId,
    entity_title: 'GlobalTech Solutions - URGENT Trial Request',
    notification_type: 'assigned',
    title: '🚨 High-Priority Trial Request',
    message: 'GlobalTech Solutions (Fortune 500 company) has requested an urgent trial demo for their 500-person team. They need a response within 24 hours.',
    action_url: `/support/trials/${demoEntityId}`,
    priority_score: 95,
    thread_key: threadKey,
    status: 'unread'
  }));

  const { data: created, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select();

  if (error) {
    console.error('❌ Error creating notifications:', error);
    return;
  }

  console.log(`✅ Sent notification to ${created.length} admins\n`);
  console.log('📋 Notification Details:\n');
  console.log(`   Entity ID: ${demoEntityId}`);
  console.log(`   Thread Key: ${threadKey}`);
  console.log(`   Title: ${notifications[0].title}`);
  console.log(`   Message: ${notifications[0].message}`);
  console.log(`   Priority Score: ${notifications[0].priority_score}`);
  console.log('');

  console.log('='.repeat(80) + '\n');
  console.log('✨ Demo Notification Sent Successfully!\n');
  console.log('Next Steps:');
  console.log('  1. Log in as any of the super admins listed above');
  console.log('  2. Check your notifications (bell icon in the top right)');
  console.log('  3. Click on the notification to view details');
  console.log('  4. Click "Mark as Complete" to handle it');
  console.log('  5. All other admins will see it marked as handled by you!\n');
  console.log('To test the shared completion:');
  console.log('  - Open the app in multiple browsers (one for each admin)');
  console.log('  - Have one admin mark it complete');
  console.log('  - Refresh other browsers to see it auto-archived\n');
  console.log(`Thread Key for manual testing: ${threadKey}\n`);
  console.log(`Notification IDs:`);
  created.forEach((n: any, idx: number) => {
    const admin = superAdmins.find((a: any) => a.id === n.user_id);
    console.log(`  - ${admin?.email}: ${n.id}`);
  });
  console.log('\n' + '='.repeat(80) + '\n');
}

sendDemoNotification().catch(console.error);
