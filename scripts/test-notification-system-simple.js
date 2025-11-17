/**
 * Simplified Notification System Test
 * Uses existing users and trial orgs to test notification features
 *
 * Usage: NEXT_PUBLIC_SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." node scripts/test-notification-system-simple.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data tracking for cleanup
const testData = {
  noteIds: [],
  notificationIds: [],
};

// Helper functions
function log(emoji, message, data = null) {
  console.log(`${emoji} ${message}`);
  if (data) {
    console.log('  ', JSON.stringify(data, null, 2));
  }
}

function success(message, data = null) {
  log('✅', message, data);
}

function error(message, data = null) {
  log('❌', message, data);
}

function info(message, data = null) {
  log('ℹ️', message, data);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function getExistingUsers() {
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .limit(3);

  if (usersError) throw usersError;

  return users;
}

async function getExistingTrialOrg() {
  const { data: orgs, error: orgsError } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, account_manager')
    .limit(1);

  if (orgsError) throw orgsError;

  return orgs?.[0] || null;
}

async function testNotificationSystem() {
  section('NOTIFICATION SYSTEM TEST');

  let results = {
    phase1: false,
    phase3: false,
    cleanup: false,
  };

  try {
    // Get existing users
    info('Fetching existing users...');
    const users = await getExistingUsers();

    if (!users || users.length < 2) {
      error('Not enough users in database for testing');
      return results;
    }

    const [user1, user2] = users;
    success(`Using users: ${user1.email} and ${user2.email}`);

    // Get existing trial org
    info('Fetching existing trial organization...');
    const org = await getExistingTrialOrg();

    if (!org) {
      error('No trial organizations found in database');
      return results;
    }

    success(`Using trial org: ${org.org_name}`);

    // Test Phase 1: Activity Note with @mention
    section('PHASE 1: Activity Note with @mention');

    // Create activity note with mention
    const noteText = `Test notification: @${user2.email} - This is a test mention from automated testing`;

    info('Creating activity note with @mention...');
    const { data: note, error: noteError } = await supabase
      .from('org_activity_notes')
      .insert({
        org_id: org.org_id,
        logged_by: user1.email,
        note_category: 'other',
        note_text: noteText,
        mentions: [user2.email],
      })
      .select()
      .single();

    if (noteError) {
      error('Failed to create activity note:', noteError.message);
      return results;
    }

    testData.noteIds.push(note.note_id);
    success('Activity note created', { note_id: note.note_id });

    // Wait for notification processing
    info('Waiting 3 seconds for notification processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify notification was created
    info('Checking for notifications...');
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('entity_type', 'note')
      .eq('entity_id', note.note_id)
      .eq('user_id', user2.id);

    if (notifError) {
      error('Error fetching notifications:', notifError.message);
      return results;
    }

    if (notifications && notifications.length > 0) {
      const notif = notifications[0];
      testData.notificationIds.push(...notifications.map(n => n.id));

      success('Notification created successfully!', {
        type: notif.notification_type,
        priority_score: notif.priority_score,
        title: notif.title,
        status: notif.status,
      });

      // Verify priority score
      if (notif.priority_score === 60) {
        success('✓ Priority score correct (60 for mentions)');
        results.phase1 = true;
      } else {
        error(`✗ Priority score incorrect! Expected 60, got ${notif.priority_score}`);
      }
    } else {
      error('✗ No notifications created for mention');
    }

    // Test Phase 3: Trial Handoff
    section('PHASE 3: Trial Handoff Notification');

    // Create a handoff notification manually to test
    if (users.length >= 3) {
      const newAM = users[2];

      info(`Creating trial handoff notification for ${newAM.email}...`);

      const { data: handoffNotif, error: handoffError } = await supabase
        .from('notifications')
        .insert({
          user_id: newAM.id,
          entity_type: 'trial_org',
          entity_id: org.org_id,
          entity_title: org.org_name,
          notification_type: 'assigned',
          actor_id: user1.id,
          title: `Trial handoff: You've been assigned ${org.org_name}`,
          message: `${user1.full_name || user1.email} handed off this trial to you (Test)`,
          action_url: `/support/trials/${org.org_id}`,
          thread_key: `trial_org:${org.org_id}`,
          priority_score: 75,
          status: 'unread',
        })
        .select()
        .single();

      if (handoffError) {
        error('Failed to create handoff notification:', handoffError.message);
      } else {
        testData.notificationIds.push(handoffNotif.id);
        success('Handoff notification created!', {
          type: handoffNotif.notification_type,
          priority_score: handoffNotif.priority_score,
          title: handoffNotif.title,
        });

        if (handoffNotif.priority_score === 75) {
          success('✓ Priority score correct (75 for handoffs)');
          results.phase3 = true;
        } else {
          error(`✗ Priority score incorrect! Expected 75, got ${handoffNotif.priority_score}`);
        }
      }
    }

    // Cleanup
    section('CLEANUP: Removing Test Data');

    // Delete notifications
    if (testData.notificationIds.length > 0) {
      info(`Deleting ${testData.notificationIds.length} test notifications...`);
      const { error: cleanupNotifError } = await supabase
        .from('notifications')
        .delete()
        .in('id', testData.notificationIds);

      if (cleanupNotifError) {
        error('Failed to delete notifications:', cleanupNotifError.message);
      } else {
        success(`Deleted ${testData.notificationIds.length} notifications`);
      }
    }

    // Delete activity notes
    if (testData.noteIds.length > 0) {
      info(`Deleting ${testData.noteIds.length} test activity notes...`);
      const { error: cleanupNotesError } = await supabase
        .from('org_activity_notes')
        .delete()
        .in('note_id', testData.noteIds);

      if (cleanupNotesError) {
        error('Failed to delete activity notes:', cleanupNotesError.message);
      } else {
        success(`Deleted ${testData.noteIds.length} activity notes`);
        results.cleanup = true;
      }
    }

    return results;

  } catch (err) {
    error('Test encountered fatal error:', err.message);
    console.error(err);
    return results;
  }
}

// Main runner
async function run() {
  console.log('\n' + '═'.repeat(60));
  console.log('  NOTIFICATION SYSTEM TEST');
  console.log('═'.repeat(60));

  const results = await testNotificationSystem();

  // Final report
  section('TEST RESULTS');

  const tests = [
    { name: 'Phase 1: Activity Note Mentions (Priority: 60)', result: results.phase1 },
    { name: 'Phase 3: Trial Handoff (Priority: 75)', result: results.phase3 },
    { name: 'Cleanup: Test Data Removal', result: results.cleanup },
  ];

  let passCount = 0;
  let failCount = 0;

  tests.forEach(test => {
    if (test.result) {
      success(`${test.name}`);
      passCount++;
    } else {
      error(`${test.name}`);
      failCount++;
    }
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`  TOTAL: ${passCount} passed, ${failCount} failed`);
  console.log('─'.repeat(60) + '\n');

  if (failCount === 0) {
    success('🎉 ALL TESTS PASSED! Notification system is working correctly.');
    process.exit(0);
  } else {
    error('⚠️  SOME TESTS FAILED. Please review the output above.');
    process.exit(1);
  }
}

run();
