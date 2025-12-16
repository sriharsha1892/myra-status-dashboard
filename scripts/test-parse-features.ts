/**
 * Comprehensive Test Script for Parse Feature Enhancement
 * Tests: Slash commands, Session context, Preference learning
 *
 * Run with: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/test-parse-features.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Test Configuration
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

// Test data identifiers
const TEST_PREFIX = 'TEST_PARSE_';
const TEST_ORG_NAME = `${TEST_PREFIX}Org_${Date.now()}`;
const TEST_USER_NAME = `${TEST_PREFIX}User`;
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'; // Fake UUID for testing

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];
let testOrgId: string | null = null;

// ============================================
// Test Utilities
// ============================================

function log(msg: string) {
  console.log(`[TEST] ${msg}`);
}

function logSuccess(name: string) {
  console.log(`  ✅ ${name}`);
}

function logFail(name: string, error: string) {
  console.log(`  ❌ ${name}: ${error}`);
}

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    logSuccess(name);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message, duration: Date.now() - start });
    logFail(name, error.message);
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertContains(str: string, substr: string, message?: string) {
  if (!str.includes(substr)) {
    throw new Error(message || `Expected "${str}" to contain "${substr}"`);
  }
}

function assertTruthy(value: any, message?: string) {
  if (!value) {
    throw new Error(message || `Expected truthy value, got ${value}`);
  }
}

// ============================================
// 1. SLASH COMMAND TESTS (Unit)
// ============================================

async function testSlashCommands() {
  log('\n========== SLASH COMMAND TESTS ==========\n');

  // Import the slash parser
  const { isSlashCommand, parseSlashCommand } = await import('../lib/command/slashParser');

  await runTest('/q command parses to LOG_ACTIVITY with query', async () => {
    const result = parseSlashCommand('/q Acme 5');
    assertTruthy(result, 'Should parse /q command');
    assertEqual(result!.action, 'LOG_ACTIVITY');
    assertEqual(result!.fields.activity_type, 'query');
    assertContains(result!.org_name || '', 'Acme');
  });

  await runTest('/call command parses to LOG_ACTIVITY with call', async () => {
    const result = parseSlashCommand('/call Acme - pricing discussed');
    assertTruthy(result, 'Should parse /call command');
    assertEqual(result!.action, 'LOG_ACTIVITY');
    assertEqual(result!.fields.activity_type, 'call');
  });

  await runTest('/checkin command parses to LOG_ACTIVITY with check_in', async () => {
    const result = parseSlashCommand('/checkin Acme');
    assertTruthy(result, 'Should parse /checkin command');
    assertEqual(result!.action, 'LOG_ACTIVITY');
    assertEqual(result!.fields.activity_type, 'check_in');
  });

  await runTest('/ci alias works for checkin', async () => {
    const result = parseSlashCommand('/ci Acme');
    assertTruthy(result, 'Should parse /ci command');
    assertEqual(result!.action, 'LOG_ACTIVITY');
    assertEqual(result!.fields.activity_type, 'check_in');
  });

  await runTest('/fu command parses to LOG_ACTIVITY with follow_up', async () => {
    const result = parseSlashCommand('/fu Acme next week');
    assertTruthy(result, 'Should parse /fu command');
    assertEqual(result!.action, 'LOG_ACTIVITY');
    assertEqual(result!.fields.activity_type, 'follow_up');
  });

  await runTest('/followup alias works', async () => {
    const result = parseSlashCommand('/followup Acme');
    assertTruthy(result, 'Should parse /followup command');
    assertEqual(result!.action, 'LOG_ACTIVITY');
    assertEqual(result!.fields.activity_type, 'follow_up');
  });

  await runTest('/win command parses to UPDATE_STAGE customer', async () => {
    const result = parseSlashCommand('/win Acme $50k');
    assertTruthy(result, 'Should parse /win command');
    assertEqual(result!.action, 'UPDATE_STAGE');
    assertEqual(result!.fields.lifecycle_stage, 'customer');
  });

  await runTest('/lost command parses to UPDATE_STAGE lost', async () => {
    const result = parseSlashCommand('/lost Acme - no budget');
    assertTruthy(result, 'Should parse /lost command');
    assertEqual(result!.action, 'UPDATE_STAGE');
    assertEqual(result!.fields.lifecycle_stage, 'lost');
  });

  await runTest('/churn alias works for lost', async () => {
    const result = parseSlashCommand('/churn Acme');
    assertTruthy(result, 'Should parse /churn command');
    assertEqual(result!.action, 'UPDATE_STAGE');
    assertEqual(result!.fields.lifecycle_stage, 'lost');
  });

  await runTest('/status command parses to QUICK_STATUS_UPDATE', async () => {
    const result = parseSlashCommand('/status Acme demo went well');
    assertTruthy(result, 'Should parse /status command');
    assertEqual(result!.action, 'QUICK_STATUS_UPDATE');
  });

  await runTest('/su alias works for status', async () => {
    const result = parseSlashCommand('/su Acme positive update');
    assertTruthy(result, 'Should parse /su command');
    assertEqual(result!.action, 'QUICK_STATUS_UPDATE');
  });

  await runTest('/update alias works for status', async () => {
    const result = parseSlashCommand('/update Acme things looking good');
    assertTruthy(result, 'Should parse /update command');
    assertEqual(result!.action, 'QUICK_STATUS_UPDATE');
  });

  await runTest('isSlashCommand detects slash commands', async () => {
    assertEqual(isSlashCommand('/q test'), true);
    assertEqual(isSlashCommand('/call test'), true);
    assertEqual(isSlashCommand('not a slash'), false);
    assertEqual(isSlashCommand(''), false);
  });

  await runTest('Slash commands have high confidence (0.95)', async () => {
    const result = parseSlashCommand('/q Acme 5');
    assertTruthy(result, 'Should parse command');
    assertEqual(result!.confidence >= 0.95, true, `Confidence should be >= 0.95, got ${result!.confidence}`);
  });
}

// ============================================
// 2. SESSION CONTEXT TESTS (Unit)
// ============================================

async function testSessionContext() {
  log('\n========== SESSION CONTEXT TESTS ==========\n');

  const {
    getSession,
    recordOrgUsage,
    recordUserUsage,
    recordAction,
    getMostRecentOrg,
    getMostRecentUser,
    findUserInSession,
    resolveContextualReferences,
    buildContextPrompt,
    clearSession,
    getSessionSummary,
  } = await import('../lib/command/sessionContext');

  const testUserId = TEST_USER_ID;

  // Clear any existing session first
  clearSession(testUserId);

  await runTest('getSession creates new session', async () => {
    const session = getSession(testUserId);
    assertTruthy(session, 'Should create session');
    assertEqual(session.userId, testUserId);
    assertEqual(session.recentOrgs.length, 0);
  });

  await runTest('recordOrgUsage adds org to session', async () => {
    recordOrgUsage(testUserId, 'org-1', 'Acme Corp');
    const mostRecent = getMostRecentOrg(testUserId);
    assertTruthy(mostRecent, 'Should have recent org');
    assertEqual(mostRecent!.orgName, 'Acme Corp');
    assertEqual(mostRecent!.commandCount, 1);
  });

  await runTest('recordOrgUsage increments count for same org', async () => {
    recordOrgUsage(testUserId, 'org-1', 'Acme Corp');
    const mostRecent = getMostRecentOrg(testUserId);
    assertEqual(mostRecent!.commandCount, 2);
  });

  await runTest('recordOrgUsage puts new org at front', async () => {
    recordOrgUsage(testUserId, 'org-2', 'Beta Inc');
    const mostRecent = getMostRecentOrg(testUserId);
    assertEqual(mostRecent!.orgName, 'Beta Inc');
  });

  await runTest('recordUserUsage adds user to session', async () => {
    recordUserUsage(testUserId, 'user-1', 'John Doe', 'org-2', 'Beta Inc');
    const mostRecent = getMostRecentUser(testUserId);
    assertTruthy(mostRecent, 'Should have recent user');
    assertEqual(mostRecent!.userName, 'John Doe');
  });

  await runTest('findUserInSession finds user by partial name', async () => {
    const found = findUserInSession(testUserId, 'John');
    assertTruthy(found, 'Should find John');
    assertEqual(found!.userName, 'John Doe');
  });

  await runTest('resolveContextualReferences handles "same org"', async () => {
    const result = resolveContextualReferences(testUserId, 'log call for same org');
    assertTruthy(result.resolvedOrg, 'Should resolve org');
    assertEqual(result.resolvedOrg!.orgName, 'Beta Inc');
    assertEqual(result.confidenceAdjustment, 0.05);
    assertContains(result.resolutionNote || '', 'same org');
  });

  await runTest('resolveContextualReferences handles "them again"', async () => {
    const result = resolveContextualReferences(testUserId, 'email them again');
    assertTruthy(result.resolvedOrg, 'Should resolve org');
    assertEqual(result.resolvedOrg!.orgName, 'Beta Inc');
  });

  await runTest('resolveContextualReferences handles "[Name] again"', async () => {
    const result = resolveContextualReferences(testUserId, 'call John again');
    assertTruthy(result.resolvedUser, 'Should resolve user');
    assertEqual(result.resolvedUser!.userName, 'John Doe');
  });

  await runTest('buildContextPrompt returns context string', async () => {
    const prompt = buildContextPrompt(testUserId);
    assertContains(prompt, 'SESSION CONTEXT');
    assertContains(prompt, 'Beta Inc');
  });

  await runTest('recordAction increments command count', async () => {
    const beforeSummary = getSessionSummary(testUserId);
    const beforeCount = beforeSummary.commandCount;
    recordAction(testUserId, 'LOG_ACTIVITY', 'org-2', 'Beta Inc', null);
    const afterSummary = getSessionSummary(testUserId);
    assertEqual(afterSummary.commandCount, beforeCount + 1);
  });

  await runTest('getSessionSummary returns correct summary', async () => {
    const summary = getSessionSummary(testUserId);
    assertEqual(summary.hasContext, true);
    assertEqual(summary.mostRecentOrg, 'Beta Inc');
    assertEqual(summary.recentOrgCount >= 2, true);
    assertEqual(summary.recentUserCount >= 1, true);
  });

  await runTest('clearSession removes all context', async () => {
    clearSession(testUserId);
    const summary = getSessionSummary(testUserId);
    assertEqual(summary.hasContext, false);
    assertEqual(summary.recentOrgCount, 0);
    assertEqual(summary.commandCount, 0);
  });
}

// ============================================
// 3. PREFERENCE SERVICE TESTS (Integration)
// ============================================

async function testPreferenceService() {
  log('\n========== PREFERENCE SERVICE TESTS ==========\n');

  const {
    getUserThreshold,
    recordExecution,
    getUserPreferences,
    getFrequentOrgBoost,
    getCachedUserThreshold,
    clearThresholdCache,
  } = await import('../lib/command/preferenceService');

  await runTest('getUserThreshold returns default 0.90 for new user', async () => {
    const threshold = await getUserThreshold(supabase, TEST_USER_ID);
    assertEqual(threshold, 0.90);
  });

  await runTest('getCachedUserThreshold caches result', async () => {
    clearThresholdCache(TEST_USER_ID);
    const t1 = await getCachedUserThreshold(supabase, TEST_USER_ID);
    const t2 = await getCachedUserThreshold(supabase, TEST_USER_ID);
    assertEqual(t1, t2);
    assertEqual(t1, 0.90);
  });

  await runTest('getFrequentOrgBoost returns 0 for null preferences', async () => {
    const boost = getFrequentOrgBoost(null, 'org-123');
    assertEqual(boost, 0);
  });

  await runTest('getFrequentOrgBoost returns 0 for unknown org', async () => {
    const prefs = {
      userId: TEST_USER_ID,
      totalCommands: 10,
      successfulCommands: 10,
      successRate: 1.0,
      autoExecuteThreshold: 0.90,
      thresholdAdjusted: false,
      frequentOrgs: [{ orgId: 'org-1', orgName: 'Acme', count: 5, lastUsed: new Date().toISOString() }],
    };
    const boost = getFrequentOrgBoost(prefs, 'org-unknown');
    assertEqual(boost, 0);
  });

  await runTest('getFrequentOrgBoost returns 0.04 for count >= 5', async () => {
    const prefs = {
      userId: TEST_USER_ID,
      totalCommands: 10,
      successfulCommands: 10,
      successRate: 1.0,
      autoExecuteThreshold: 0.90,
      thresholdAdjusted: false,
      frequentOrgs: [{ orgId: 'org-1', orgName: 'Acme', count: 5, lastUsed: new Date().toISOString() }],
    };
    const boost = getFrequentOrgBoost(prefs, 'org-1');
    assertEqual(boost, 0.04);
  });

  await runTest('getFrequentOrgBoost returns 0.05 for count >= 10', async () => {
    const prefs = {
      userId: TEST_USER_ID,
      totalCommands: 20,
      successfulCommands: 20,
      successRate: 1.0,
      autoExecuteThreshold: 0.90,
      thresholdAdjusted: false,
      frequentOrgs: [{ orgId: 'org-1', orgName: 'Acme', count: 10, lastUsed: new Date().toISOString() }],
    };
    const boost = getFrequentOrgBoost(prefs, 'org-1');
    assertEqual(boost, 0.05);
  });
}

// ============================================
// 4. DATABASE INTEGRATION TESTS
// ============================================

async function testDatabaseIntegration() {
  log('\n========== DATABASE INTEGRATION TESTS ==========\n');

  await runTest('command_user_preferences table exists', async () => {
    const { data, error } = await supabase
      .from('command_user_preferences')
      .select('id')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      throw new Error('Table command_user_preferences does not exist');
    }
    // Empty result is fine, just need table to exist
  });

  await runTest('command_execution_history table exists', async () => {
    const { data, error } = await supabase
      .from('command_execution_history')
      .select('id')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      throw new Error('Table command_execution_history does not exist');
    }
  });

  await runTest('get_user_auto_execute_threshold function works', async () => {
    const { data, error } = await supabase
      .rpc('get_user_auto_execute_threshold', { p_user_id: TEST_USER_ID });

    if (error) throw new Error(`RPC failed: ${error.message}`);
    assertEqual(data, 0.90);
  });

  // Note: record_command_execution requires a valid user_id due to FK constraint
  // This will be tested with real data in E2E tests
  await runTest('record_command_execution function exists and is callable', async () => {
    // Test that the function exists by calling with invalid UUID
    // The error should be about FK constraint, not function not found
    const { data, error } = await supabase
      .rpc('record_command_execution', {
        p_user_id: TEST_USER_ID,
        p_org_id: null,
        p_org_name: TEST_ORG_NAME,
        p_action: 'LOG_ACTIVITY',
        p_command_text: '/q test 5',
        p_confidence: 0.95,
        p_confidence_tier: 'high',
        p_auto_executed: true,
        p_success: true,
        p_execution_time_ms: 100,
        p_error_message: null,
      });

    // We expect a foreign key error (function exists but user doesn't)
    if (error && error.message.includes('foreign key')) {
      // This is expected - function exists but requires real user
      return;
    }
    if (error && error.message.includes('does not exist')) {
      throw new Error('Function record_command_execution does not exist');
    }
    // If no error, the function worked (unlikely with fake user)
  });

  await runTest('maybe_adjust_threshold function exists', async () => {
    // Test that function exists (will do nothing with fake user)
    const { error } = await supabase
      .rpc('maybe_adjust_threshold', { p_user_id: TEST_USER_ID });

    if (error && error.message.includes('does not exist')) {
      throw new Error('Function maybe_adjust_threshold does not exist');
    }
    // No error or permission error is fine
  });

  await runTest('update_user_frequent_orgs function exists', async () => {
    const { error } = await supabase
      .rpc('update_user_frequent_orgs', { p_user_id: TEST_USER_ID });

    if (error && error.message.includes('does not exist')) {
      throw new Error('Function update_user_frequent_orgs does not exist');
    }
  });

  await runTest('cleanup_old_execution_history function exists', async () => {
    const { data, error } = await supabase
      .rpc('cleanup_old_execution_history');

    if (error && error.message.includes('does not exist')) {
      throw new Error('Function cleanup_old_execution_history does not exist');
    }
    // Returns number of deleted rows (likely 0 in test)
  });
}

// ============================================
// 5. QUICK STATUS UPDATE TESTS
// ============================================

async function testQuickStatusUpdate() {
  log('\n========== QUICK STATUS UPDATE TESTS ==========\n');

  // Import the action
  const { quickStatusUpdate } = await import('../lib/actions/quickStatusUpdate');

  await runTest('quickStatusUpdate schema validates correctly (camelCase)', async () => {
    const validInput = {
      orgId: 'test-org-id',
      statusText: 'demo went well',
    };
    // Schema should accept valid input
    const result = quickStatusUpdate.schema.safeParse(validInput);
    assertEqual(result.success, true);
  });

  await runTest('quickStatusUpdate rejects empty orgId', async () => {
    const input = { orgId: '', statusText: 'demo went well' };
    const result = quickStatusUpdate.schema.safeParse(input);
    assertEqual(result.success, false);
  });

  await runTest('quickStatusUpdate rejects empty statusText', async () => {
    const input = { orgId: 'test-org-id', statusText: '' };
    const result = quickStatusUpdate.schema.safeParse(input);
    assertEqual(result.success, false);
  });

  await runTest('/status slash command sets correct action', async () => {
    const { parseSlashCommand } = await import('../lib/command/slashParser');
    const result = parseSlashCommand('/status TestOrg demo went great');
    assertEqual(result?.action, 'QUICK_STATUS_UPDATE');
    assertTruthy(result?.fields.status_text);
  });

  await runTest('/su alias parses correctly', async () => {
    const { parseSlashCommand } = await import('../lib/command/slashParser');
    // Use "@Acme" pattern which extractOrg recognizes
    const result = parseSlashCommand('/su @Acme positive update');
    assertEqual(result?.action, 'QUICK_STATUS_UPDATE');
    assertTruthy(result?.org_name);
    assertEqual(result?.org_name, 'Acme');
  });
}

// ============================================
// 6. CLEANUP
// ============================================

async function cleanup() {
  log('\n========== CLEANUP ==========\n');

  // Delete test execution history
  await runTest('Delete test execution history', async () => {
    const { error } = await supabase
      .from('command_execution_history')
      .delete()
      .like('org_name', `${TEST_PREFIX}%`);

    if (error) throw new Error(`Delete failed: ${error.message}`);
  });

  // Delete test user preferences
  await runTest('Delete test user preferences', async () => {
    const { error } = await supabase
      .from('command_user_preferences')
      .delete()
      .eq('user_id', TEST_USER_ID);

    if (error) throw new Error(`Delete failed: ${error.message}`);
  });

  // Clear session context
  await runTest('Clear session context', async () => {
    const { clearSession } = await import('../lib/command/sessionContext');
    clearSession(TEST_USER_ID);
  });

  log('\n✅ All test data cleaned up!\n');
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     PARSE FEATURE ENHANCEMENT - AUTOMATED TEST SUITE       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    await testSlashCommands();
    await testSessionContext();
    await testPreferenceService();
    await testDatabaseIntegration();
    await testQuickStatusUpdate();
  } catch (error: any) {
    console.error('\n💥 Test suite crashed:', error.message);
  }

  // Always run cleanup
  await cleanup();

  // Print summary
  const totalTime = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                       TEST SUMMARY                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`  Total tests: ${results.length}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏱️  Duration: ${totalTime}ms\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    console.log('');
    process.exit(1);
  }

  console.log('🎉 All tests passed!\n');
  process.exit(0);
}

main();
