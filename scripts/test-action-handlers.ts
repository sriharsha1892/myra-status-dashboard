/**
 * Test Action Handler Integration
 * Verifies that the new action handlers are properly exported
 */

import * as actions from '../lib/actions';

// Test results tracking
const results: { test: string; passed: boolean; details: string }[] = [];

function logTest(test: string, passed: boolean, details: string = '') {
  results.push({ test, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}${details ? `: ${details}` : ''}`);
}

console.log('\n========================================');
console.log('TESTING ACTION HANDLER EXPORTS');
console.log('========================================\n');

// Test 1: Check that new action handlers are exported
console.log('--- Action Handler Exports ---');
{
  const hasLogMeeting = 'logMeeting' in actions;
  logTest('logMeeting exported', hasLogMeeting, '');
}

{
  const hasAddDealNote = 'addDealNote' in actions;
  logTest('addDealNote exported', hasAddDealNote, '');
}

{
  const hasCreateFollowup = 'createFollowup' in actions;
  logTest('createFollowup exported', hasCreateFollowup, '');
}

// Test 2: Check that types are exported
console.log('\n--- Type Exports ---');
{
  const hasType = 'LogMeetingInput' in actions;
  logTest('LogMeetingInput type exported', hasType, '');
}

{
  const hasType = 'AddDealNoteInput' in actions;
  logTest('AddDealNoteInput type exported', hasType, '');
}

{
  const hasType = 'CreateFollowupInput' in actions;
  logTest('CreateFollowupInput type exported', hasType, '');
}

// Test 3: Check that constants are exported
console.log('\n--- Constant Exports ---');
{
  const hasConst = 'MEETING_TYPES' in actions;
  logTest('MEETING_TYPES exported', hasConst, '');
}

{
  const hasConst = 'FOLLOWUP_PRIORITIES' in actions;
  logTest('FOLLOWUP_PRIORITIES exported', hasConst, '');
}

// Test 4: Check action handler structure
console.log('\n--- Action Handler Structure ---');
{
  const handler = (actions as any).logMeeting;
  const hasExecute = typeof handler?.execute === 'function';
  const hasSchema = handler?.schema != null;
  logTest('logMeeting has execute function', hasExecute, '');
  logTest('logMeeting has schema', hasSchema, '');
}

{
  const handler = (actions as any).addDealNote;
  const hasExecute = typeof handler?.execute === 'function';
  const hasSchema = handler?.schema != null;
  logTest('addDealNote has execute function', hasExecute, '');
  logTest('addDealNote has schema', hasSchema, '');
}

{
  const handler = (actions as any).createFollowup;
  const hasExecute = typeof handler?.execute === 'function';
  const hasSchema = handler?.schema != null;
  logTest('createFollowup has execute function', hasExecute, '');
  logTest('createFollowup has schema', hasSchema, '');
}

// Test 5: Check executeAction recognizes new actions
console.log('\n--- executeAction Integration ---');
{
  const isActionMigrated = (actions as any).isActionMigrated;
  if (isActionMigrated) {
    logTest('LOG_MEETING is migrated', isActionMigrated('LOG_MEETING'), '');
    logTest('ADD_DEAL_NOTE is migrated', isActionMigrated('ADD_DEAL_NOTE'), '');
    logTest('CREATE_FOLLOWUP is migrated', isActionMigrated('CREATE_FOLLOWUP'), '');
  } else {
    logTest('isActionMigrated not exported', false, 'function not found');
  }
}

// ============ SUMMARY ============
console.log('\n========================================');
console.log('TEST SUMMARY');
console.log('========================================');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`);
console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

if (failed > 0) {
  console.log('Failed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.test}: ${r.details}`);
  });
}

process.exit(failed > 0 ? 1 : 0);
