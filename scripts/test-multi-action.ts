/**
 * Test Multi-Action Extraction
 * Verifies the multi-action extractor correctly extracts various signals
 */

import { extractMultipleActions } from '../lib/command/multiActionExtractor';
import { parseNaturalDate } from '../lib/utils/dateTime';

// ============ TESTS ============

interface TestCase {
  name: string;
  input: string;
  expectedActions: string[];
  context?: {
    orgId?: string;
    orgName?: string;
    userId?: string;
    userName?: string;
  };
}

const testCases: TestCase[] = [
  // Follow-up tests
  {
    name: 'Follow-up with date',
    input: 'Had a great demo with Acme. Need to follow up next Tuesday about pricing.',
    expectedActions: ['SCHEDULE_FOLLOWUP'],
  },
  {
    name: 'Follow-up with call back',
    input: 'Call back Sarah tomorrow to discuss the proposal',
    expectedActions: ['SCHEDULE_FOLLOWUP'],
  },
  {
    name: 'Follow-up implicit',
    input: "Let's check in with them in 2 weeks about the POC",
    expectedActions: ['SCHEDULE_FOLLOWUP'],
  },

  // Stakeholder tests
  {
    name: 'Champion detection',
    input: 'John is a huge champion for us internally. He is really pushing for our solution.',
    expectedActions: ['UPDATE_STAKEHOLDER'],
  },
  {
    name: 'Blocker detection',
    input: 'The CTO seems skeptical and is pushing back on the implementation timeline.',
    expectedActions: ['UPDATE_STAKEHOLDER'],
  },
  {
    name: 'Decision maker detection',
    input: 'Sarah is the decision maker who signs off on all purchases.',
    expectedActions: ['UPDATE_STAKEHOLDER'],
  },

  // Competitor tests
  {
    name: 'Competitor evaluation',
    input: 'They are currently evaluating Salesforce and considering switching from HubSpot.',
    expectedActions: ['LOG_COMPETITOR'],
  },
  {
    name: 'Competitor comparison',
    input: 'Compared to Zendesk, we offer better integration options.',
    expectedActions: ['LOG_COMPETITOR'],
  },

  // Feature interest tests
  {
    name: 'Feature need',
    input: 'They need SSO integration for their enterprise security requirements.',
    expectedActions: ['TRACK_FEATURE_INTEREST'],
  },
  {
    name: 'Feature question',
    input: 'Asked if we can support custom dashboards with real-time data?',
    expectedActions: ['TRACK_FEATURE_INTEREST'],
  },
  {
    name: 'Critical feature',
    input: 'GDPR compliance is a critical requirement for them to proceed.',
    expectedActions: ['TRACK_FEATURE_INTEREST'],
  },

  // Momentum tests
  {
    name: 'Positive momentum',
    input: 'Deal is moving forward quickly. They want to close by end of quarter.',
    expectedActions: ['UPDATE_MOMENTUM'],
  },
  {
    name: 'Stalled deal',
    input: 'No response for 3 weeks. The deal seems to have stalled.',
    expectedActions: ['UPDATE_MOMENTUM'],
  },
  {
    name: 'At risk deal',
    input: 'Budget got cut. The project might be cancelled.',
    expectedActions: ['UPDATE_MOMENTUM'],
  },

  // Multi-action tests
  {
    name: 'Multiple actions - follow-up and champion',
    input: 'Great call with Mike. He is definitely our champion. Need to follow up tomorrow with the proposal.',
    expectedActions: ['SCHEDULE_FOLLOWUP', 'UPDATE_STAKEHOLDER'],
  },
  {
    name: 'Multiple actions - competitor and feature',
    input: 'They are comparing us to Datadog. Asked about our alerting capabilities.',
    expectedActions: ['LOG_COMPETITOR', 'TRACK_FEATURE_INTEREST'],
  },
  {
    name: 'Complex sentence with multiple signals',
    input: 'Sarah, their decision maker, mentioned they are evaluating Tableau. They need real-time dashboards. Follow up next week to discuss pricing. The deal is progressing well.',
    expectedActions: ['UPDATE_STAKEHOLDER', 'LOG_COMPETITOR', 'TRACK_FEATURE_INTEREST', 'SCHEDULE_FOLLOWUP', 'UPDATE_MOMENTUM'],
  },
];

// Date parsing tests
const dateParseCases = [
  { input: 'tomorrow', expected: 1 },
  { input: 'next Tuesday', expected: null }, // Depends on current day
  { input: 'in 2 weeks', expected: 14 },
  { input: 'end of week', expected: null }, // Depends on current day
  { input: 'Dec 25', expected: null }, // Specific date
];

// ============ RUN TESTS ============

console.log('═══════════════════════════════════════════════════════');
console.log('  Multi-Action Extraction Tests');
console.log('═══════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

// Test multi-action extraction
console.log('📋 Action Extraction Tests\n');

for (const test of testCases) {
  const result = extractMultipleActions(test.input, test.context);
  const extractedTypes = result.extractedActions.map(a => a.action);

  // Check if all expected actions are present
  const allExpectedFound = test.expectedActions.every(expected =>
    extractedTypes.includes(expected as any)
  );

  if (allExpectedFound) {
    console.log(`  ✅ ${test.name}`);
    console.log(`     Input: "${test.input.substring(0, 60)}..."`);
    console.log(`     Extracted: [${extractedTypes.join(', ')}]`);
    passed++;
  } else {
    console.log(`  ❌ ${test.name}`);
    console.log(`     Input: "${test.input.substring(0, 60)}..."`);
    console.log(`     Expected: [${test.expectedActions.join(', ')}]`);
    console.log(`     Got: [${extractedTypes.join(', ')}]`);
    failed++;
  }
  console.log('');
}

// Test date parsing
console.log('\n📅 Date Parsing Tests\n');

const today = new Date();
today.setHours(0, 0, 0, 0);

for (const test of dateParseCases) {
  const result = parseNaturalDate(test.input);

  if (result) {
    const daysDiff = Math.round((result.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`  ✅ "${test.input}" → ${result.date.toDateString()} (${daysDiff} days)`);
    passed++;
  } else {
    console.log(`  ❌ "${test.input}" → Failed to parse`);
    failed++;
  }
}

// Summary
console.log('\n═══════════════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════\n');

// Exit with error code if any tests failed
process.exit(failed > 0 ? 1 : 0);
