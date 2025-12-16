/**
 * Test Action Execution
 * Tests that the new action handlers are correctly integrated
 */

import { ACTION_SCHEMAS } from '../lib/command/actionSchemas';

// Test results tracking
const results: { test: string; passed: boolean; details: string }[] = [];

function logTest(test: string, passed: boolean, details: string = '') {
  results.push({ test, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}${details ? `: ${details}` : ''}`);
}

console.log('\n========================================');
console.log('TESTING ACTION SCHEMA INTEGRATION');
console.log('========================================\n');

// Test 1: Check that all new action schemas exist
console.log('--- Action Schema Existence ---');
{
  const hasLogMeeting = 'LOG_MEETING' in ACTION_SCHEMAS;
  logTest('LOG_MEETING schema exists', hasLogMeeting, '');
}

{
  const hasAddDealNote = 'ADD_DEAL_NOTE' in ACTION_SCHEMAS;
  logTest('ADD_DEAL_NOTE schema exists', hasAddDealNote, '');
}

{
  const hasCreateFollowup = 'CREATE_FOLLOWUP' in ACTION_SCHEMAS;
  logTest('CREATE_FOLLOWUP schema exists', hasCreateFollowup, '');
}

// Test 2: Check schema configuration
console.log('\n--- Schema Configuration ---');
{
  const schema = ACTION_SCHEMAS.LOG_MEETING;
  const hasRequiredFields = schema?.fields?.meeting_type != null;
  logTest('LOG_MEETING has meeting_type field', hasRequiredFields, '');
}

{
  const schema = ACTION_SCHEMAS.ADD_DEAL_NOTE;
  const hasRequiredFields = schema?.required?.includes('deal_note');
  logTest('ADD_DEAL_NOTE requires deal_note', hasRequiredFields, '');
}

{
  const schema = ACTION_SCHEMAS.CREATE_FOLLOWUP;
  const hasRequiredFields = schema?.required?.includes('followup_title');
  logTest('CREATE_FOLLOWUP requires followup_title', hasRequiredFields, '');
}

// Test 3: Check target tables
console.log('\n--- Target Tables ---');
{
  const schema = ACTION_SCHEMAS.LOG_MEETING;
  logTest('LOG_MEETING targets meeting_notes',
    schema?.targetTable === 'meeting_notes',
    `table=${schema?.targetTable}`
  );
}

{
  const schema = ACTION_SCHEMAS.ADD_DEAL_NOTE;
  logTest('ADD_DEAL_NOTE targets org_activity_notes',
    schema?.targetTable === 'org_activity_notes',
    `table=${schema?.targetTable}`
  );
}

{
  const schema = ACTION_SCHEMAS.CREATE_FOLLOWUP;
  logTest('CREATE_FOLLOWUP targets follow_ups',
    schema?.targetTable === 'follow_ups',
    `table=${schema?.targetTable}`
  );
}

// Test 4: Check CREATE_USER has influence field
console.log('\n--- CREATE_USER Enhancement ---');
{
  const schema = ACTION_SCHEMAS.CREATE_USER;
  const hasInfluence = schema?.optional?.includes('influence');
  logTest('CREATE_USER has influence field', hasInfluence, '');
}

{
  const schema = ACTION_SCHEMAS.CREATE_USER;
  const influenceField = schema?.fields?.influence;
  const hasInfluenceEnum = influenceField?.enumValues?.includes('champion');
  logTest('CREATE_USER influence has champion value', hasInfluenceEnum, '');
}

// Test 5: Check schema completeness
console.log('\n--- Schema Completeness ---');
{
  const schema = ACTION_SCHEMAS.LOG_MEETING;
  const hasAllParts = schema?.action && schema?.description && schema?.fields && schema?.targetTable != null;
  logTest('LOG_MEETING schema is complete', hasAllParts, '');
}

{
  const schema = ACTION_SCHEMAS.ADD_DEAL_NOTE;
  const hasAllParts = schema?.action && schema?.description && schema?.fields && schema?.targetTable != null;
  logTest('ADD_DEAL_NOTE schema is complete', hasAllParts, '');
}

{
  const schema = ACTION_SCHEMAS.CREATE_FOLLOWUP;
  const hasAllParts = schema?.action && schema?.description && schema?.fields && schema?.targetTable != null;
  logTest('CREATE_FOLLOWUP schema is complete', hasAllParts, '');
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
