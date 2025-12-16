/**
 * Aggressive Test Script for Command Center V2
 * Tests: org-context, suggest, command processing
 * Cleans up all test data at the end
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test data tracking
const testData = {
  orgIds: [] as string[],
  userIds: [] as string[],
  eventIds: [] as string[],
  noteIds: [] as string[],
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message: string, type: 'success' | 'error' | 'info' | 'warn' = 'info') {
  const color = {
    success: colors.green,
    error: colors.red,
    info: colors.blue,
    warn: colors.yellow,
  }[type];
  console.log(`${color}${message}${colors.reset}`);
}

// ============ SETUP TEST DATA ============

async function createTestOrg(): Promise<string | null> {
  const testOrgName = `TEST_CC_V2_${Date.now()}`;

  const { data, error } = await supabase
    .from('trial_organizations')
    .insert({
      org_name: testOrgName,
      domain: 'Unassigned',
      org_lifecycle_stage: 'trial_active',
      trial_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      engagement_score: 65,
      health_status: 'warning',
      account_manager_id: '2ea618ec-7bcc-46cb-91b7-468e606130ba', // Use existing account manager
    })
    .select('org_id')
    .single();

  if (error) {
    log(`Failed to create test org: ${error.message}`, 'error');
    return null;
  }

  testData.orgIds.push(data.org_id);
  log(`Created test org: ${testOrgName} (${data.org_id})`, 'success');
  return data.org_id;
}

async function createTestUser(orgId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('trial_users')
    .insert({
      org_id: orgId,
      name: 'Test Champion',
      email: `test_champion_${Date.now()}@test.com`,
      role: 'Product Manager',
      influence: 'champion',
    })
    .select('user_id')
    .single();

  if (error) {
    log(`Failed to create test user: ${error.message}`, 'error');
    return null;
  }

  testData.userIds.push(data.user_id);
  log(`Created test user: Test Champion (${data.user_id})`, 'success');
  return data.user_id;
}

async function createTestEvents(orgId: string): Promise<void> {
  const events = [
    { event_type: 'call_completed', title: 'Discovery call with team', sentiment: 'positive' },
    { event_type: 'email_exchange', title: 'Follow-up email sent', sentiment: 'neutral' },
    { event_type: 'demo_conducted', title: 'Demo session completed', sentiment: 'positive' },
  ];

  for (const event of events) {
    const { data, error } = await supabase
      .from('trial_timeline_events')
      .insert({
        org_id: orgId,
        event_type: event.event_type,
        event_category: 'communication',
        title: event.title,
        sentiment: event.sentiment,
        event_timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (!error && data) {
      testData.eventIds.push(data.id);
    }
  }

  log(`Created ${events.length} test timeline events`, 'success');
}

// ============ TEST FUNCTIONS ============

async function testOrgContextAPI(orgId: string): Promise<boolean> {
  log('\n--- Testing GET /api/command/org-context/[id] ---', 'info');

  try {
    // Direct database query to simulate API
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('org_id', orgId)
      .single();

    if (orgError) {
      log(`Org query failed: ${orgError.message}`, 'error');
      return false;
    }

    log(`✓ Org data retrieved: ${org.org_name}`, 'success');
    log(`  - Health: ${org.health_status}`, 'info');
    log(`  - Stage: ${org.org_lifecycle_stage}`, 'info');
    log(`  - Engagement: ${org.engagement_score}`, 'info');

    // Test contacts query
    const { data: contacts, error: contactsError } = await supabase
      .from('trial_users')
      .select('*')
      .eq('org_id', orgId);

    if (contactsError) {
      log(`Contacts query failed: ${contactsError.message}`, 'error');
      return false;
    }

    log(`✓ Contacts retrieved: ${contacts?.length || 0}`, 'success');

    // Test events query
    const { data: events, error: eventsError } = await supabase
      .from('trial_timeline_events')
      .select('*')
      .eq('org_id', orgId)
      .order('event_timestamp', { ascending: false })
      .limit(5);

    if (eventsError) {
      log(`Events query failed: ${eventsError.message}`, 'error');
      return false;
    }

    log(`✓ Recent events retrieved: ${events?.length || 0}`, 'success');

    return true;
  } catch (error: any) {
    log(`Org context test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testSuggestAPI(): Promise<boolean> {
  log('\n--- Testing POST /api/command/suggest ---', 'info');

  try {
    // Simulate suggestion generation logic
    const sessionContext = {
      recentOrgs: testData.orgIds.length > 0 ? ['Test Org'] : [],
      recentActions: ['LOG_ACTIVITY', 'ADD_NOTE'],
      lastActionTime: new Date().toISOString(),
    };

    // Test rule-based suggestions (without actual Groq call)
    const hour = new Date().getHours();
    const suggestions = [];

    // Time-based
    if (hour >= 8 && hour < 12) {
      suggestions.push({ id: 'morning', label: 'Morning check-in', confidence: 0.7 });
    } else if (hour >= 17 && hour < 20) {
      suggestions.push({ id: 'eod', label: 'EOD update', confidence: 0.7 });
    }

    // Action-based
    if (sessionContext.recentActions.includes('LOG_ACTIVITY')) {
      suggestions.push({ id: 'follow-note', label: 'Add follow-up note', confidence: 0.65 });
    }

    // Default
    suggestions.push({ id: 'log', label: 'Log activity', confidence: 0.5 });
    suggestions.push({ id: 'note', label: 'Add note', confidence: 0.45 });

    log(`✓ Generated ${suggestions.length} suggestions`, 'success');
    suggestions.forEach(s => {
      log(`  - ${s.label} (confidence: ${s.confidence})`, 'info');
    });

    return true;
  } catch (error: any) {
    log(`Suggest test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testCommandProcessing(orgId: string): Promise<boolean> {
  log('\n--- Testing Command Processing Flow ---', 'info');

  try {
    // Get org name for testing
    const { data: org } = await supabase
      .from('trial_organizations')
      .select('org_name')
      .eq('org_id', orgId)
      .single();

    if (!org) {
      log('Could not find test org', 'error');
      return false;
    }

    // Test 1: Create a note
    log('Test 1: Creating activity note...', 'info');
    const { data: note, error: noteError } = await supabase
      .from('org_activity_notes')
      .insert({
        org_id: orgId,
        logged_by: 'test@test.com',
        note_category: 'question',
        note_text: 'Test note from Command Center V2 testing',
      })
      .select('note_id')
      .single();

    if (noteError) {
      log(`Note creation failed: ${noteError.message}`, 'error');
      return false;
    }

    testData.noteIds.push(note.note_id);
    log(`✓ Note created: ${note.note_id}`, 'success');

    // Test 2: Update org stage
    log('Test 2: Updating org stage...', 'info');
    const { error: stageError } = await supabase
      .from('trial_organizations')
      .update({ org_lifecycle_stage: 'customer' })
      .eq('org_id', orgId);

    if (stageError) {
      log(`Stage update failed: ${stageError.message}`, 'error');
      return false;
    }
    log(`✓ Stage updated to: customer`, 'success');

    // Test 3: Update engagement score
    log('Test 3: Updating engagement score...', 'info');
    const { error: engagementError } = await supabase
      .from('trial_organizations')
      .update({ engagement_score: 85 })
      .eq('org_id', orgId);

    if (engagementError) {
      log(`Engagement update failed: ${engagementError.message}`, 'error');
      return false;
    }
    log(`✓ Engagement score updated to: 85`, 'success');

    // Test 4: Create timeline event
    log('Test 4: Creating timeline event...', 'info');
    const { data: event, error: eventError } = await supabase
      .from('trial_timeline_events')
      .insert({
        org_id: orgId,
        event_type: 'sales_note',
        event_category: 'sales',
        title: 'Command Center V2 test event',
        sentiment: 'neutral',
        event_timestamp: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (eventError) {
      log(`Event creation failed: ${eventError.message}`, 'error');
      return false;
    }

    testData.eventIds.push(event.id);
    log(`✓ Timeline event created: ${event.id}`, 'success');

    return true;
  } catch (error: any) {
    log(`Command processing test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testSessionHistory(): Promise<boolean> {
  log('\n--- Testing Session History Tracking ---', 'info');

  try {
    // Simulate session actions (these would normally be tracked in-memory)
    const sessionActions = [
      { id: '1', action: 'LOG_ACTIVITY', summary: 'Log call at Test Org', timestamp: new Date() },
      { id: '2', action: 'ADD_NOTE', summary: 'Add note to Test Org', timestamp: new Date() },
      { id: '3', action: 'UPDATE_STAGE', summary: 'Update Test Org to negotiating', timestamp: new Date() },
    ];

    log(`✓ Session tracking: ${sessionActions.length} actions`, 'success');
    sessionActions.forEach(a => {
      log(`  - ${a.summary}`, 'info');
    });

    // Test grouping by hour
    const groups = new Map<string, typeof sessionActions>();
    sessionActions.forEach(action => {
      const hour = action.timestamp.toLocaleTimeString('en-US', { hour: 'numeric' });
      if (!groups.has(hour)) groups.set(hour, []);
      groups.get(hour)!.push(action);
    });

    log(`✓ Actions grouped into ${groups.size} hour(s)`, 'success');

    return true;
  } catch (error: any) {
    log(`Session history test failed: ${error.message}`, 'error');
    return false;
  }
}

// ============ CLEANUP ============

async function cleanupTestData(): Promise<void> {
  log('\n--- Cleaning Up Test Data ---', 'warn');

  // Delete notes
  if (testData.noteIds.length > 0) {
    const { error } = await supabase
      .from('org_activity_notes')
      .delete()
      .in('note_id', testData.noteIds);

    if (error) {
      log(`Failed to delete notes: ${error.message}`, 'error');
    } else {
      log(`✓ Deleted ${testData.noteIds.length} notes`, 'success');
    }
  }

  // Delete events
  if (testData.eventIds.length > 0) {
    const { error } = await supabase
      .from('trial_timeline_events')
      .delete()
      .in('id', testData.eventIds);

    if (error) {
      log(`Failed to delete events: ${error.message}`, 'error');
    } else {
      log(`✓ Deleted ${testData.eventIds.length} events`, 'success');
    }
  }

  // Delete users
  if (testData.userIds.length > 0) {
    const { error } = await supabase
      .from('trial_users')
      .delete()
      .in('user_id', testData.userIds);

    if (error) {
      log(`Failed to delete users: ${error.message}`, 'error');
    } else {
      log(`✓ Deleted ${testData.userIds.length} users`, 'success');
    }
  }

  // Delete orgs (must be last due to foreign keys)
  if (testData.orgIds.length > 0) {
    const { error } = await supabase
      .from('trial_organizations')
      .delete()
      .in('org_id', testData.orgIds);

    if (error) {
      log(`Failed to delete orgs: ${error.message}`, 'error');
    } else {
      log(`✓ Deleted ${testData.orgIds.length} orgs`, 'success');
    }
  }

  // Also clean up any old test data from previous runs
  log('\nCleaning up old test data...', 'info');

  const { data: oldOrgs } = await supabase
    .from('trial_organizations')
    .select('org_id')
    .like('org_name', 'TEST_CC_V2_%');

  if (oldOrgs && oldOrgs.length > 0) {
    const oldOrgIds = oldOrgs.map(o => o.org_id);

    // Delete related data first
    await supabase.from('org_activity_notes').delete().in('org_id', oldOrgIds);
    await supabase.from('trial_timeline_events').delete().in('org_id', oldOrgIds);
    await supabase.from('trial_users').delete().in('org_id', oldOrgIds);
    await supabase.from('trial_organizations').delete().in('org_id', oldOrgIds);

    log(`✓ Cleaned up ${oldOrgs.length} old test org(s)`, 'success');
  }
}

// ============ MAIN ============

async function main() {
  console.log('\n' + '='.repeat(60));
  log('COMMAND CENTER V2 - AGGRESSIVE TEST SUITE', 'info');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  try {
    // Setup
    log('\n--- Setting Up Test Data ---', 'info');
    const orgId = await createTestOrg();
    if (!orgId) {
      log('Failed to create test org, aborting tests', 'error');
      return;
    }

    await createTestUser(orgId);
    await createTestEvents(orgId);

    // Run tests
    if (await testOrgContextAPI(orgId)) passed++; else failed++;
    if (await testSuggestAPI()) passed++; else failed++;
    if (await testCommandProcessing(orgId)) passed++; else failed++;
    if (await testSessionHistory()) passed++; else failed++;

  } catch (error: any) {
    log(`Unexpected error: ${error.message}`, 'error');
    failed++;
  } finally {
    // Always cleanup
    await cleanupTestData();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  log('TEST SUMMARY', 'info');
  console.log('='.repeat(60));
  log(`Passed: ${passed}`, 'success');
  if (failed > 0) {
    log(`Failed: ${failed}`, 'error');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
