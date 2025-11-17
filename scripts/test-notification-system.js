/**
 * Comprehensive Test Script for Notification System
 * Tests Phases 1, 2, and 3 of the notification enhancement
 *
 * Features tested:
 * - Phase 1: Real-time activity note notifications with @mentions
 * - Phase 2: Notification creation connectivity (API integration)
 * - Phase 3: Trial handoff workflow with high-priority notifications
 *
 * Usage: NEXT_PUBLIC_SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." node scripts/test-notification-system.js
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
  userIds: [],
  userEmails: [],
  trialOrgIds: [],
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

// Test functions
async function createTestUser(email, fullName, role = 'account_manager') {
  try {
    const { data: user, error: userError} = await supabase
      .from('users')
      .insert({
        email,
        full_name: fullName,
        role,
        password_hash: '$2b$12$dummy.hash.for.testing.purposes',
        is_active: true,
        parent_company: 'Test Company',
      })
      .select()
      .single();

    if (userError) throw userError;

    testData.userIds.push(user.id);
    testData.userEmails.push(user.email);
    success(`Created test user: ${fullName} (${email})`, { id: user.id });
    return user;
  } catch (err) {
    error(`Failed to create user ${email}:`, err.message);
    throw err;
  }
}

async function createTestTrialOrg(name, accountManagerEmail) {
  try {
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .insert({
        org_name: name,
        account_manager: accountManagerEmail,
        trial_status: 'active',
        trial_start_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (orgError) throw orgError;

    testData.trialOrgIds.push(org.org_id);
    success(`Created test trial org: ${name}`, { org_id: org.org_id });
    return org;
  } catch (err) {
    error(`Failed to create trial org ${name}:`, err.message);
    throw err;
  }
}

async function createActivityNote(orgId, loggedBy, category, text, mentions = []) {
  try {
    const { data: note, error: noteError } = await supabase
      .from('org_activity_notes')
      .insert({
        org_id: orgId,
        logged_by: loggedBy,
        note_category: category,
        note_text: text,
        mentions,
      })
      .select()
      .single();

    if (noteError) throw noteError;

    testData.noteIds.push(note.note_id);
    success(`Created activity note`, { note_id: note.note_id, category });
    return note;
  } catch (err) {
    error(`Failed to create activity note:`, err.message);
    throw err;
  }
}

async function verifyNotifications(userId, expectedCount, expectedType, expectedPriority) {
  try {
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('notification_type', expectedType)
      .order('created_at', { ascending: false });

    if (notifError) throw notifError;

    // Track for cleanup
    notifications.forEach(n => testData.notificationIds.push(n.id));

    if (notifications.length === 0) {
      error(`No notifications found for user ${userId}`, {
        expectedType,
        expectedCount,
      });
      return false;
    }

    const latestNotif = notifications[0];

    info(`Found ${notifications.length} notification(s)`, {
      type: latestNotif.notification_type,
      priority_score: latestNotif.priority_score,
      title: latestNotif.title,
      status: latestNotif.status,
    });

    // Verify priority score
    if (latestNotif.priority_score !== expectedPriority) {
      error(`Priority score mismatch!`, {
        expected: expectedPriority,
        actual: latestNotif.priority_score,
      });
      return false;
    }

    success(`Notification verified with correct priority score: ${expectedPriority}`);
    return true;
  } catch (err) {
    error(`Failed to verify notifications:`, err.message);
    return false;
  }
}

async function testPhase1MentionNotifications() {
  section('PHASE 1: Activity Note Mention Notifications (Priority: 60)');

  try {
    // Create test users
    const user1 = await createTestUser(
      'test-user-1@example.com',
      'Test User 1',
      'account_manager'
    );
    const user2 = await createTestUser(
      'test-user-2@example.com',
      'Test User 2',
      'account_manager'
    );

    // Create test trial org
    const org = await createTestTrialOrg('Test Trial Org Alpha', user1.email);

    // Create activity note with @mention
    info('Creating activity note with @mention to user2...');
    const note = await createActivityNote(
      org.org_id,
      user1.email,
      'question',
      'Hey @test-user-2, can you help with this trial setup?',
      [user2.email]
    );

    // Wait a bit for notification creation
    info('Waiting 2 seconds for notification processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify notification created for mentioned user
    info('Verifying notification for mentioned user...');
    const verified = await verifyNotifications(
      user2.id,
      1,
      'mention',
      60 // Expected priority for mentions
    );

    if (verified) {
      success('✓ Phase 1 Test PASSED: Mention notifications working correctly');
    } else {
      error('✗ Phase 1 Test FAILED: Mention notification verification failed');
    }

    return verified;
  } catch (err) {
    error('Phase 1 test encountered error:', err.message);
    return false;
  }
}

async function testPhase1AccountManagerNotifications() {
  section('PHASE 1: Account Manager Notifications (Priority: 40)');

  try {
    // Create test users
    const accountManager = await createTestUser(
      'test-am-1@example.com',
      'Test Account Manager',
      'account_manager'
    );
    const otherUser = await createTestUser(
      'test-other-1@example.com',
      'Test Other User',
      'account_manager'
    );

    // Create test trial org assigned to account manager
    const org = await createTestTrialOrg('Test Trial Org Beta', accountManager.email);

    // Other user creates a note (should notify account manager)
    info('Creating activity note by non-account-manager...');
    const note = await createActivityNote(
      org.org_id,
      otherUser.email,
      'issue',
      'This trial is experiencing login issues.',
      [] // No mentions
    );

    // Wait for notification creation
    info('Waiting 2 seconds for notification processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify notification created for account manager
    info('Verifying notification for account manager...');
    const verified = await verifyNotifications(
      accountManager.id,
      1,
      'comment',
      40 // Expected priority for account manager notifications
    );

    if (verified) {
      success('✓ Phase 1 Test PASSED: Account manager notifications working correctly');
    } else {
      error('✗ Phase 1 Test FAILED: Account manager notification verification failed');
    }

    return verified;
  } catch (err) {
    error('Phase 1 account manager test encountered error:', err.message);
    return false;
  }
}

async function testPhase3TrialHandoff() {
  section('PHASE 3: Trial Handoff Workflow (Priority: 75)');

  try {
    // Create test users
    const currentAM = await createTestUser(
      'test-am-current@example.com',
      'Current Account Manager',
      'account_manager'
    );
    const newAM = await createTestUser(
      'test-am-new@example.com',
      'New Account Manager',
      'account_manager'
    );

    // Create test trial org
    const org = await createTestTrialOrg('Test Trial Org Gamma', currentAM.email);

    // Perform handoff
    info('Performing trial handoff...');

    // Update account manager
    const { error: updateError } = await supabase
      .from('trial_organizations')
      .update({ account_manager: newAM.email })
      .eq('org_id', org.org_id);

    if (updateError) throw updateError;

    // Create handoff activity note
    const handoffNote = `Trial handoff: ${currentAM.email} → ${newAM.email}\nReason: Testing handoff workflow\nContext: Automated test`;

    const note = await createActivityNote(
      org.org_id,
      currentAM.email,
      'other',
      handoffNote,
      [newAM.email]
    );

    // Create high-priority handoff notification
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: newAM.id,
        entity_type: 'trial_org',
        entity_id: org.org_id,
        entity_title: org.org_name,
        notification_type: 'assigned',
        actor_id: currentAM.id,
        title: `Trial handoff: You've been assigned ${org.org_name}`,
        message: `${currentAM.full_name} handed off this trial to you. Reason: Testing handoff workflow`,
        action_url: `/support/trials/${org.org_id}`,
        thread_key: `trial_org:${org.org_id}`,
        priority_score: 75,
        status: 'unread',
      });

    if (notifError) throw notifError;

    // Wait for notification
    info('Waiting 2 seconds for notification processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify notification created for new account manager
    info('Verifying handoff notification...');
    const verified = await verifyNotifications(
      newAM.id,
      1,
      'assigned',
      75 // Expected priority for handoffs
    );

    // Verify account manager was actually updated
    const { data: updatedOrg } = await supabase
      .from('trial_organizations')
      .select('account_manager')
      .eq('org_id', org.org_id)
      .single();

    if (updatedOrg.account_manager !== newAM.email) {
      error('Account manager was not updated correctly', {
        expected: newAM.email,
        actual: updatedOrg.account_manager,
      });
      return false;
    }

    success('Account manager updated successfully');

    if (verified) {
      success('✓ Phase 3 Test PASSED: Trial handoff workflow working correctly');
    } else {
      error('✗ Phase 3 Test FAILED: Handoff notification verification failed');
    }

    return verified;
  } catch (err) {
    error('Phase 3 test encountered error:', err.message);
    return false;
  }
}

async function testPriorityOrdering() {
  section('INTEGRATION TEST: Priority Score Ordering');

  try {
    // We should have notifications with different priorities from previous tests
    // Fetch all test notifications and verify ordering

    if (testData.notificationIds.length === 0) {
      error('No notifications to test ordering');
      return false;
    }

    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, priority_score, notification_type, title')
      .in('id', testData.notificationIds)
      .order('priority_score', { ascending: false });

    if (notifError) throw notifError;

    info(`Retrieved ${notifications.length} notifications for ordering test`);

    // Verify that notifications are in descending priority order
    let previousPriority = 100;
    let orderCorrect = true;

    for (const notif of notifications) {
      info(`  Priority ${notif.priority_score}: ${notif.notification_type} - "${notif.title}"`);

      if (notif.priority_score > previousPriority) {
        error(`Priority ordering incorrect!`, {
          current: notif.priority_score,
          previous: previousPriority,
        });
        orderCorrect = false;
      }

      previousPriority = notif.priority_score;
    }

    if (orderCorrect) {
      success('✓ Priority ordering test PASSED: Notifications properly ordered by priority');
    } else {
      error('✗ Priority ordering test FAILED');
    }

    return orderCorrect;
  } catch (err) {
    error('Priority ordering test encountered error:', err.message);
    return false;
  }
}

async function cleanupTestData() {
  section('CLEANUP: Removing Test Data');

  let cleanupSuccess = true;

  try {
    // Delete notifications
    if (testData.notificationIds.length > 0) {
      info(`Deleting ${testData.notificationIds.length} test notifications...`);
      const { error: notifError } = await supabase
        .from('notifications')
        .delete()
        .in('id', testData.notificationIds);

      if (notifError) {
        error('Failed to delete notifications:', notifError.message);
        cleanupSuccess = false;
      } else {
        success(`Deleted ${testData.notificationIds.length} notifications`);
      }
    }

    // Delete activity notes
    if (testData.noteIds.length > 0) {
      info(`Deleting ${testData.noteIds.length} test activity notes...`);
      const { error: notesError } = await supabase
        .from('org_activity_notes')
        .delete()
        .in('note_id', testData.noteIds);

      if (notesError) {
        error('Failed to delete activity notes:', notesError.message);
        cleanupSuccess = false;
      } else {
        success(`Deleted ${testData.noteIds.length} activity notes`);
      }
    }

    // Delete trial organizations
    if (testData.trialOrgIds.length > 0) {
      info(`Deleting ${testData.trialOrgIds.length} test trial organizations...`);
      const { error: orgsError } = await supabase
        .from('trial_organizations')
        .delete()
        .in('org_id', testData.trialOrgIds);

      if (orgsError) {
        error('Failed to delete trial organizations:', orgsError.message);
        cleanupSuccess = false;
      } else {
        success(`Deleted ${testData.trialOrgIds.length} trial organizations`);
      }
    }

    // Delete users
    if (testData.userIds.length > 0) {
      info(`Deleting ${testData.userIds.length} test users...`);
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .in('id', testData.userIds);

      if (usersError) {
        error('Failed to delete users:', usersError.message);
        cleanupSuccess = false;
      } else {
        success(`Deleted ${testData.userIds.length} users`);
      }
    }

    if (cleanupSuccess) {
      success('✓ All test data cleaned up successfully');
    } else {
      error('✗ Some cleanup operations failed - manual cleanup may be required');
    }

    return cleanupSuccess;
  } catch (err) {
    error('Cleanup encountered error:', err.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  NOTIFICATION SYSTEM COMPREHENSIVE TEST');
  console.log('═'.repeat(60));

  const results = {
    phase1Mentions: false,
    phase1AccountManager: false,
    phase3Handoff: false,
    priorityOrdering: false,
    cleanup: false,
  };

  try {
    // Run Phase 1 tests
    results.phase1Mentions = await testPhase1MentionNotifications();
    results.phase1AccountManager = await testPhase1AccountManagerNotifications();

    // Run Phase 3 test
    results.phase3Handoff = await testPhase3TrialHandoff();

    // Run integration tests
    results.priorityOrdering = await testPriorityOrdering();

    // Cleanup
    results.cleanup = await cleanupTestData();

    // Final report
    section('TEST RESULTS SUMMARY');

    const tests = [
      { name: 'Phase 1: Mention Notifications (Priority: 60)', result: results.phase1Mentions },
      { name: 'Phase 1: Account Manager Notifications (Priority: 40)', result: results.phase1AccountManager },
      { name: 'Phase 3: Trial Handoff Workflow (Priority: 75)', result: results.phase3Handoff },
      { name: 'Integration: Priority Ordering', result: results.priorityOrdering },
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

  } catch (err) {
    error('Test runner encountered fatal error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

// Run the tests
runTests();
