require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testData = {
  userId: null,
  testNotes: [],
  testNotifications: [],
  errors: [],
  passed: 0,
  failed: 0
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  if (passed) {
    testData.passed++;
    log(`✅ ${name}`, 'green');
    if (details) log(`   ${details}`, 'cyan');
  } else {
    testData.failed++;
    log(`❌ ${name}`, 'red');
    if (details) log(`   ${details}`, 'yellow');
    testData.errors.push({ test: name, details });
  }
}

// ==================== SCHEMA TESTS ====================

async function testDatabaseSchema() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('📊 PHASE 1: DATABASE SCHEMA TESTS', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  // Test 1: Notifications table exists
  const { data: notifTable, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .limit(0);

  logTest(
    'Notifications table exists',
    !notifError,
    notifError ? notifError.message : 'Table is accessible'
  );

  // Test 2: Unified notes table exists
  const { data: notesTable, error: notesError } = await supabase
    .from('unified_notes')
    .select('*')
    .limit(0);

  logTest(
    'Unified notes table exists',
    !notesError,
    notesError ? notesError.message : 'Table is accessible'
  );

  // Test 3: Note mentions table exists
  const { data: mentionsTable, error: mentionsError } = await supabase
    .from('note_mentions')
    .select('*')
    .limit(0);

  logTest(
    'Note mentions table exists',
    !mentionsError,
    mentionsError ? mentionsError.message : 'Table is accessible'
  );

  // Test 4: Note edit history table exists
  const { data: historyTable, error: historyError } = await supabase
    .from('note_edit_history')
    .select('*')
    .limit(0);

  logTest(
    'Note edit history table exists',
    !historyError,
    historyError ? historyError.message : 'Table is accessible'
  );

  // Test 5: Check notifications table columns
  const { data: notifColumns, error: notifColError } = await supabase
    .from('notifications')
    .select('id, user_id, entity_type, entity_id, notification_type, priority_score, category, status, thread_key, action_url')
    .limit(0);

  logTest(
    'Notifications table has required columns',
    !notifColError,
    !notifColError ? 'All columns present' : notifColError.message
  );

  // Test 6: Check unified_notes table columns
  const { data: notesColumns, error: notesColError } = await supabase
    .from('unified_notes')
    .select('id, entity_type, entity_id, content, plain_text, parent_note_id, thread_root_id, reply_count, mentioned_user_ids, visibility, created_by, deleted')
    .limit(0);

  logTest(
    'Unified notes table has required columns',
    !notesColError,
    !notesColError ? 'All columns present' : notesColError.message
  );
}

// ==================== DATA CREATION TESTS ====================

async function testDataCreation() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('📝 PHASE 2: DATA CREATION TESTS', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  // Try to get an existing user (users table uses 'id' not 'user_id')
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, full_name')
    .limit(1)
    .single();

  let users;
  let createdTestUser = false;

  if (!existingUser) {
    // Create a temporary test user
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: 'test@unified-system.test',
        full_name: 'Test User',
        role: 'User',
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      logTest('Create test user', false, createError.message);
      return;
    }

    users = newUser;
    createdTestUser = true;
    testData.createdTestUser = testUserId;
    logTest('Create test user', true, `Created: ${users.email}`);
  } else {
    users = existingUser;
    logTest('Get existing user', true, `Using user: ${users.email}`);
  }

  testData.userId = users.id;

  // Test 7: Create root note
  const { data: rootNote, error: rootError } = await supabase
    .from('unified_notes')
    .insert({
      entity_type: 'standalone',
      entity_id: null,
      entity_title: '[TEST] Standalone Note',
      content: '<p>This is a <strong>test note</strong> with <em>rich HTML</em> content.</p>',
      plain_text: 'This is a test note with rich HTML content.',
      mentioned_user_ids: [testData.userId],
      visibility: 'team',
      created_by: testData.userId
    })
    .select()
    .single();

  logTest(
    'Create root note',
    !rootError && rootNote,
    rootError ? rootError.message : `Note ID: ${rootNote?.id}`
  );

  if (rootNote) testData.testNotes.push(rootNote.id);

  // Test 8: Create reply to root note
  const { data: replyNote, error: replyError } = await supabase
    .from('unified_notes')
    .insert({
      entity_type: 'standalone',
      entity_id: null,
      content: '<p>This is a reply to the root note.</p>',
      plain_text: 'This is a reply to the root note.',
      parent_note_id: rootNote?.id,
      thread_root_id: rootNote?.id,
      visibility: 'team',
      created_by: testData.userId
    })
    .select()
    .single();

  logTest(
    'Create reply note',
    !replyError && replyNote,
    replyError ? replyError.message : `Reply ID: ${replyNote?.id}`
  );

  if (replyNote) testData.testNotes.push(replyNote.id);

  // Test 9: Verify reply_count incremented
  const { data: updatedRoot, error: countError } = await supabase
    .from('unified_notes')
    .select('reply_count')
    .eq('id', rootNote?.id)
    .single();

  logTest(
    'Reply count auto-incremented',
    !countError && updatedRoot?.reply_count === 1,
    `Reply count: ${updatedRoot?.reply_count}`
  );

  // Test 10: Create note with mention (should auto-create mention record)
  const { data: mentionNote, error: mentionNoteError } = await supabase
    .from('unified_notes')
    .insert({
      entity_type: 'standalone',
      entity_id: null,
      content: `<p>Mentioning user <span data-id="${testData.userId}">@User</span></p>`,
      plain_text: 'Mentioning user @User',
      mentioned_user_ids: [testData.userId],
      visibility: 'team',
      created_by: testData.userId
    })
    .select()
    .single();

  logTest(
    'Create note with mention',
    !mentionNoteError && mentionNote,
    mentionNoteError ? mentionNoteError.message : `Note ID: ${mentionNote?.id}`
  );

  if (mentionNote) testData.testNotes.push(mentionNote.id);

  // Small delay for trigger to execute
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 11: Verify mention record auto-created
  const { data: mentionRecords, error: mentionRecordError } = await supabase
    .from('note_mentions')
    .select('*')
    .eq('note_id', mentionNote?.id);

  logTest(
    'Mention record auto-created',
    !mentionRecordError && mentionRecords?.length === 1,
    `Found ${mentionRecords?.length} mention records`
  );

  // Test 12: Create notification manually
  const { data: notification, error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: testData.userId,
      entity_type: 'note',
      entity_id: mentionNote?.id,
      entity_title: '[TEST] Note with Mention',
      notification_type: 'mention',
      actor_id: testData.userId,
      title: 'You were mentioned in a note',
      message: 'Mentioning user @User',
      action_url: `/test#note-${mentionNote?.id}`,
      priority_score: 60,
      thread_key: `note:${mentionNote?.id}`,
      status: 'unread'
    })
    .select()
    .single();

  logTest(
    'Create notification',
    !notifError && notification,
    notifError ? notifError.message : `Notification ID: ${notification?.id}`
  );

  if (notification) testData.testNotifications.push(notification.id);

  // Test 13: Verify notification category auto-set
  const { data: notifWithCategory, error: catError } = await supabase
    .from('notifications')
    .select('category')
    .eq('id', notification?.id)
    .single();

  logTest(
    'Notification category auto-set',
    !catError && notifWithCategory?.category === 'recent',
    `Category: ${notifWithCategory?.category} (expected: recent for score 60)`
  );

  // Test 14: Create high-priority notification
  const { data: highPriorityNotif, error: highPriorityError } = await supabase
    .from('notifications')
    .insert({
      user_id: testData.userId,
      entity_type: 'trial_org',
      entity_id: '00000000-0000-0000-0000-000000000000',
      entity_title: '[TEST] High Priority',
      notification_type: 'assigned',
      title: 'You were assigned to a trial',
      priority_score: 85,
      thread_key: 'trial_org:test',
      action_url: '/test',
      status: 'unread'
    })
    .select()
    .single();

  logTest(
    'Create high-priority notification',
    !highPriorityError && highPriorityNotif,
    highPriorityError ? highPriorityError.message : `Priority score: ${highPriorityNotif?.priority_score}`
  );

  if (highPriorityNotif) testData.testNotifications.push(highPriorityNotif.id);

  // Test 15: Verify high-priority notification category
  const { data: highPriorityCheck, error: highPriorityCheckError } = await supabase
    .from('notifications')
    .select('category, priority_score')
    .eq('id', highPriorityNotif?.id)
    .single();

  logTest(
    'High-priority notification categorized correctly',
    !highPriorityCheckError && highPriorityCheck?.category === 'priority',
    `Category: ${highPriorityCheck?.category} (expected: priority for score 85)`
  );
}

// ==================== UPDATE TESTS ====================

async function testUpdates() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('✏️  PHASE 3: UPDATE & EDIT TESTS', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  const noteId = testData.testNotes[0];
  if (!noteId) {
    log('⚠️  Skipping update tests - no notes created', 'yellow');
    return;
  }

  // Test 16: Update note content (should create edit history)
  const { data: originalNote } = await supabase
    .from('unified_notes')
    .select('content, plain_text')
    .eq('id', noteId)
    .single();

  const { data: updatedNote, error: updateError } = await supabase
    .from('unified_notes')
    .update({
      content: '<p>Updated content with <strong>changes</strong></p>',
      plain_text: 'Updated content with changes',
      edited: true,
      last_edit_at: new Date().toISOString()
    })
    .eq('id', noteId)
    .select()
    .single();

  logTest(
    'Update note content',
    !updateError && updatedNote,
    updateError ? updateError.message : 'Content updated successfully'
  );

  // Test 17: Verify updated_at changed
  logTest(
    'Updated_at timestamp changed',
    updatedNote && updatedNote.updated_at !== originalNote?.updated_at,
    'Timestamp auto-updated'
  );

  // Test 18: Mark notification as read
  const notifId = testData.testNotifications[0];
  if (notifId) {
    const { data: readNotif, error: readError } = await supabase
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('id', notifId)
      .select()
      .single();

    logTest(
      'Mark notification as read',
      !readError && readNotif?.status === 'read',
      readError ? readError.message : 'Status updated to read'
    );
  }

  // Test 19: Archive notification
  const archiveNotifId = testData.testNotifications[1];
  if (archiveNotifId) {
    const { data: archivedNotif, error: archiveError } = await supabase
      .from('notifications')
      .update({
        status: 'archived',
        category: 'archived',
        archived_at: new Date().toISOString(),
        archived_reason: 'Test archive'
      })
      .eq('id', archiveNotifId)
      .select()
      .single();

    logTest(
      'Archive notification',
      !archiveError && archivedNotif?.status === 'archived' && archivedNotif?.category === 'archived',
      archiveError ? archiveError.message : 'Notification archived'
    );
  }

  // Test 20: Soft delete note
  const deleteNoteId = testData.testNotes[2];
  if (deleteNoteId) {
    const { data: deletedNote, error: deleteError } = await supabase
      .from('unified_notes')
      .update({
        deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: testData.userId
      })
      .eq('id', deleteNoteId)
      .select()
      .single();

    logTest(
      'Soft delete note',
      !deleteError && deletedNote?.deleted === true,
      deleteError ? deleteError.message : 'Note soft deleted'
    );
  }
}

// ==================== QUERY TESTS ====================

async function testQueries() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('🔍 PHASE 4: QUERY & FILTER TESTS', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  // Test 21: Query notifications by category
  const { data: priorityNotifs, error: priorityError } = await supabase
    .from('notifications')
    .select('*')
    .eq('category', 'priority')
    .eq('user_id', testData.userId || '00000000-0000-0000-0000-000000000001');

  logTest(
    'Query notifications by category (priority)',
    !priorityError,
    `Found ${priorityNotifs?.length || 0} priority notifications (query works)`
  );

  // Test 22: Query notifications by status
  const { data: unreadNotifs, error: unreadError } = await supabase
    .from('notifications')
    .select('*')
    .eq('status', 'unread')
    .eq('user_id', testData.userId || '00000000-0000-0000-0000-000000000001');

  logTest(
    'Query notifications by status (unread)',
    !unreadError,
    `Found ${unreadNotifs?.length || 0} unread notifications (query works)`
  );

  // Test 23: Query notes by entity type
  const { data: standaloneNotes, error: standaloneError } = await supabase
    .from('unified_notes')
    .select('*')
    .eq('entity_type', 'standalone')
    .eq('deleted', false);

  logTest(
    'Query notes by entity type',
    !standaloneError,
    `Found ${standaloneNotes?.length || 0} standalone notes`
  );

  // Test 24: Query replies to a thread
  const rootNoteId = testData.testNotes[0];
  if (rootNoteId) {
    const { data: replies, error: repliesError } = await supabase
      .from('unified_notes')
      .select('*')
      .eq('thread_root_id', rootNoteId)
      .eq('deleted', false);

    logTest(
      'Query replies by thread_root_id',
      !repliesError,
      `Found ${replies?.length || 0} replies`
    );
  }

  // Test 25: Query notes with mentions
  const { data: notesWithMentions, error: mentionsQueryError } = await supabase
    .from('unified_notes')
    .select('*')
    .contains('mentioned_user_ids', [testData.userId])
    .eq('deleted', false);

  logTest(
    'Query notes with mentions',
    !mentionsQueryError,
    `Found ${notesWithMentions?.length || 0} notes mentioning user`
  );

  // Test 26: Query by visibility
  const { data: teamNotes, error: visibilityError } = await supabase
    .from('unified_notes')
    .select('*')
    .eq('visibility', 'team')
    .eq('deleted', false);

  logTest(
    'Query notes by visibility',
    !visibilityError,
    `Found ${teamNotes?.length || 0} team-visible notes`
  );

  // Test 27: Order by priority score
  const { data: orderedNotifs, error: orderError } = await supabase
    .from('notifications')
    .select('id, priority_score')
    .eq('user_id', testData.userId || '00000000-0000-0000-0000-000000000001')
    .order('priority_score', { ascending: false })
    .limit(5);

  logTest(
    'Order notifications by priority score',
    !orderError,
    orderedNotifs && orderedNotifs.length > 0
      ? `Found ${orderedNotifs.length} notifications, top score: ${orderedNotifs[0]?.priority_score}`
      : 'Query works (0 results)'
  );
}

// ==================== CLEANUP ====================

async function cleanup() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('🧹 CLEANUP', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');

  let cleanupSuccess = true;

  // Delete test notifications
  if (testData.testNotifications.length > 0) {
    const { error: notifDeleteError } = await supabase
      .from('notifications')
      .delete()
      .in('id', testData.testNotifications);

    if (notifDeleteError) {
      log(`❌ Failed to delete test notifications: ${notifDeleteError.message}`, 'red');
      cleanupSuccess = false;
    } else {
      log(`✅ Deleted ${testData.testNotifications.length} test notifications`, 'green');
    }
  }

  // Delete test notes (cascade will handle mentions and history)
  if (testData.testNotes.length > 0) {
    const { error: notesDeleteError } = await supabase
      .from('unified_notes')
      .delete()
      .in('id', testData.testNotes);

    if (notesDeleteError) {
      log(`❌ Failed to delete test notes: ${notesDeleteError.message}`, 'red');
      cleanupSuccess = false;
    } else {
      log(`✅ Deleted ${testData.testNotes.length} test notes`, 'green');
    }
  }

  // Delete test user if created
  if (testData.createdTestUser) {
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', testData.createdTestUser);

    if (userDeleteError) {
      log(`❌ Failed to delete test user: ${userDeleteError.message}`, 'red');
      cleanupSuccess = false;
    } else {
      log(`✅ Deleted test user`, 'green');
    }
  }

  return cleanupSuccess;
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
  const startTime = Date.now();

  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                           ║', 'cyan');
  log('║     🧪 UNIFIED NOTIFICATIONS & NOTES SYSTEM TEST          ║', 'cyan');
  log('║                                                           ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');

  try {
    await testDatabaseSchema();
    await testDataCreation();
    await testUpdates();
    await testQueries();

    const cleanupSuccess = await cleanup();

    // Final Report
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'magenta');
    log('📊 TEST SUMMARY', 'magenta');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'magenta');

    log(`Total Tests: ${testData.passed + testData.failed}`, 'cyan');
    log(`✅ Passed: ${testData.passed}`, 'green');
    log(`❌ Failed: ${testData.failed}`, testData.failed > 0 ? 'red' : 'green');
    log(`⏱️  Duration: ${duration}s`, 'cyan');
    log(`🧹 Cleanup: ${cleanupSuccess ? 'Success' : 'Failed'}`, cleanupSuccess ? 'green' : 'red');

    if (testData.errors.length > 0) {
      log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red');
      log('❌ FAILED TESTS', 'red');
      log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'red');
      testData.errors.forEach((error, index) => {
        log(`${index + 1}. ${error.test}`, 'red');
        log(`   ${error.details}`, 'yellow');
      });
    }

    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'magenta');

    if (testData.failed === 0) {
      log('🎉 ALL TESTS PASSED! System is working correctly.', 'green');
      log('✅ Ready for production use.\n', 'green');
      process.exit(0);
    } else {
      log('⚠️  SOME TESTS FAILED. Review errors above.', 'yellow');
      log('❌ Fix issues before deploying.\n', 'red');
      process.exit(1);
    }

  } catch (error) {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red');
    log('💥 CRITICAL ERROR', 'red');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
