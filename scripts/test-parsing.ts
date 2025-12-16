/**
 * Comprehensive Parsing Tests
 * Tests all new slash commands and NLP parsing features
 */

import { parseSlashCommand } from '../lib/command/slashParser';

// Test results tracking
const results: { test: string; passed: boolean; details: string }[] = [];

function logTest(test: string, passed: boolean, details: string = '') {
  results.push({ test, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}${details ? `: ${details}` : ''}`);
}

// ============ SLASH COMMAND TESTS ============

console.log('\n========================================');
console.log('TESTING SLASH COMMANDS');
console.log('========================================\n');

// Test 1: Meeting command
console.log('--- Meeting Commands (/meeting, /mtg) ---');
{
  const result = parseSlashCommand('/meeting @Acme demo 60min - discussed pricing and roadmap');
  logTest('/meeting basic',
    result?.action === 'LOG_MEETING' && result?.org_name === 'Acme' && result?.fields?.meeting_type === 'demo',
    `action=${result?.action}, org=${result?.org_name}, type=${result?.fields?.meeting_type}`
  );
}

{
  const result = parseSlashCommand('/mtg @TechCorp check_in - quarterly review');
  logTest('/mtg alias',
    result?.action === 'LOG_MEETING' && result?.org_name === 'TechCorp',
    `action=${result?.action}, org=${result?.org_name}`
  );
}

{
  const result = parseSlashCommand('/meeting @CloudSoft technical 90min - deep dive on architecture');
  logTest('/meeting with duration',
    result?.fields?.meeting_duration === 90,
    `duration=${result?.fields?.meeting_duration}min`
  );
}

// Test 2: Deal note commands
console.log('\n--- Deal Note Commands (/deal-note, /dn) ---');
{
  const result = parseSlashCommand('/deal-note @Acme Budget approved by CFO');
  logTest('/deal-note basic',
    result?.action === 'ADD_DEAL_NOTE' && result?.org_name === 'Acme' && result?.fields?.deal_note?.includes('Budget'),
    `action=${result?.action}, note="${result?.fields?.deal_note?.substring(0, 30)}"`
  );
}

{
  const result = parseSlashCommand('/dn @TechCorp Contract negotiations progressing well');
  logTest('/dn alias',
    result?.action === 'ADD_DEAL_NOTE' && result?.org_name === 'TechCorp',
    `action=${result?.action}, org=${result?.org_name}`
  );
}

// Test 3: Champion/Blocker commands
console.log('\n--- Stakeholder Commands (/champion, /blocker, /stakeholder) ---');
{
  const result = parseSlashCommand('/champion @Acme bob@acme.com "Bob Wilson" CEO');
  logTest('/champion command',
    result?.action === 'CREATE_USER' && result?.fields?.influence === 'champion' && result?.fields?.email === 'bob@acme.com',
    `influence=${result?.fields?.influence}, email=${result?.fields?.email}`
  );
}

{
  const result = parseSlashCommand('/blocker @TechCorp sam@tech.com "Sam Brown" Procurement');
  logTest('/blocker command',
    result?.action === 'CREATE_USER' && result?.fields?.influence === 'blocker',
    `influence=${result?.fields?.influence}`
  );
}

{
  const result = parseSlashCommand('/stakeholder @CloudCo jane@cloud.com "Jane Doe" CTO decision_maker');
  logTest('/stakeholder with influence',
    result?.action === 'CREATE_USER' && result?.fields?.influence === 'decision_maker',
    `influence=${result?.fields?.influence}`
  );
}

// Test 4: Follow-up/Reminder commands
console.log('\n--- Follow-up Commands (/remind, /reminder) ---');
{
  const result = parseSlashCommand('/remind @Acme "Send proposal" tomorrow high');
  logTest('/remind basic',
    result?.action === 'CREATE_FOLLOWUP' && result?.org_name === 'Acme' && result?.fields?.followup_title === 'Send proposal',
    `action=${result?.action}, title=${result?.fields?.followup_title}, priority=${result?.fields?.followup_priority}`
  );
}

{
  const result = parseSlashCommand('/reminder @TechCorp "Schedule demo" next_week');
  logTest('/reminder alias',
    result?.action === 'CREATE_FOLLOWUP' && result?.fields?.followup_due_date != null,
    `due_date=${result?.fields?.followup_due_date}`
  );
}

{
  const result = parseSlashCommand('/remind @DataFlow "Review contract" friday urgent');
  logTest('/remind with day name',
    result?.action === 'CREATE_FOLLOWUP' && result?.fields?.followup_priority === 'urgent',
    `priority=${result?.fields?.followup_priority}, date=${result?.fields?.followup_due_date}`
  );
}

// Test 5: Activity shortcuts
console.log('\n--- Activity Shortcuts (/email, /demo) ---');
{
  const result = parseSlashCommand('/email @Acme - sent pricing proposal');
  logTest('/email command',
    result?.action === 'LOG_ACTIVITY' && result?.fields?.activity_type === 'email',
    `activity_type=${result?.fields?.activity_type}`
  );
}

{
  const result = parseSlashCommand('/demo @TechCorp 45min - showed new analytics features');
  logTest('/demo command',
    result?.action === 'LOG_ACTIVITY' && result?.fields?.activity_type === 'demo',
    `activity_type=${result?.fields?.activity_type}, details=${result?.fields?.details?.substring(0, 40)}`
  );
}

// Test 6: Existing commands still work
console.log('\n--- Existing Commands (Regression) ---');
{
  const result = parseSlashCommand('/call @Acme 30min - discussed timeline');
  logTest('/call still works',
    result?.action === 'LOG_ACTIVITY' && result?.fields?.activity_type === 'call',
    `activity_type=${result?.fields?.activity_type}`
  );
}

{
  const result = parseSlashCommand('/user john@acme.com "John Smith" at Acme');
  logTest('/user still works',
    result?.action === 'CREATE_USER' && result?.fields?.email === 'john@acme.com',
    `action=${result?.action}, email=${result?.fields?.email}`
  );
}

{
  const result = parseSlashCommand('/note @Acme Great feedback from the demo today');
  logTest('/note still works',
    result?.action === 'ADD_NOTE' && result?.fields?.note_text?.includes('feedback'),
    `action=${result?.action}`
  );
}

{
  const result = parseSlashCommand('/deal @Acme won 50000');
  logTest('/deal still works',
    result?.action === 'UPDATE_DEAL',
    `action=${result?.action}`
  );
}

{
  const result = parseSlashCommand('/org "New Company" www.newco.com');
  logTest('/org still works',
    result?.action === 'CREATE_ORG',
    `action=${result?.action}`
  );
}

// ============ EDGE CASES ============

console.log('\n--- Edge Cases ---');
{
  const result = parseSlashCommand('/meeting @"Company With Spaces" demo 30min - test');
  logTest('Org with spaces',
    result?.org_name === 'Company With Spaces',
    `org="${result?.org_name}"`
  );
}

{
  const result = parseSlashCommand('/remind @Acme Send proposal friday urgent');
  logTest('Unquoted title',
    result?.action === 'CREATE_FOLLOWUP' && result?.fields?.followup_title != null,
    `title="${result?.fields?.followup_title}"`
  );
}

{
  const result = parseSlashCommand('/champion @Acme john@acme.com "John" VP Sales');
  logTest('Champion with title',
    result?.fields?.influence === 'champion' && result?.fields?.role === 'VP Sales',
    `role="${result?.fields?.role}"`
  );
}

{
  const result = parseSlashCommand('/meeting @Test');
  logTest('Minimal meeting command',
    result?.action === 'LOG_MEETING' && result?.org_name === 'Test',
    `org="${result?.org_name}"`
  );
}

// Test meeting type variations
console.log('\n--- Meeting Type Variations ---');
{
  const result = parseSlashCommand('/meeting @Acme demo - product demo');
  logTest('Meeting type: demo',
    result?.fields?.meeting_type === 'demo',
    `type=${result?.fields?.meeting_type}`
  );
}

{
  const result = parseSlashCommand('/meeting @Acme follow_up - check on progress');
  logTest('Meeting type: follow_up',
    result?.fields?.meeting_type === 'follow_up_call',
    `type=${result?.fields?.meeting_type}`
  );
}

{
  const result = parseSlashCommand('/meeting @Acme executive - board presentation');
  logTest('Meeting type: executive',
    result?.fields?.meeting_type === 'executive_briefing',
    `type=${result?.fields?.meeting_type}`
  );
}

// Test duration parsing
console.log('\n--- Duration Parsing ---');
{
  const result = parseSlashCommand('/meeting @Acme demo 30min - quick call');
  logTest('Duration: 30min',
    result?.fields?.meeting_duration === 30,
    `duration=${result?.fields?.meeting_duration}`
  );
}

{
  const result = parseSlashCommand('/meeting @Acme demo 1hr - long meeting');
  logTest('Duration: 1hr',
    result?.fields?.meeting_duration === 60,
    `duration=${result?.fields?.meeting_duration}`
  );
}

{
  const result = parseSlashCommand('/meeting @Acme demo 90m - extended session');
  logTest('Duration: 90m',
    result?.fields?.meeting_duration === 90,
    `duration=${result?.fields?.meeting_duration}`
  );
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

// Exit with error code if tests failed
process.exit(failed > 0 ? 1 : 0);
