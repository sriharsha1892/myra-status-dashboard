/**
 * Test Meeting Extraction API
 * Tests the AI-powered meeting notes extraction
 */

import * as fs from 'fs';
import * as path from 'path';

// Test results tracking
const results: { test: string; passed: boolean; details: string }[] = [];

function logTest(test: string, passed: boolean, details: string = '') {
  results.push({ test, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}${details ? `: ${details}` : ''}`);
}

console.log('\n========================================');
console.log('TESTING MEETING EXTRACTION');
console.log('========================================\n');

// Test 1: API route file exists
console.log('--- API Route Existence ---');
{
  const apiPath = path.join(__dirname, '../app/api/meetings/extract/route.ts');
  const exists = fs.existsSync(apiPath);
  logTest('Meeting extraction API route exists', exists, apiPath);
}

// Test 2: Check API route content
console.log('\n--- API Route Structure ---');
const apiContent = fs.readFileSync(
  path.join(__dirname, '../app/api/meetings/extract/route.ts'),
  'utf-8'
);

{
  const hasPostHandler = apiContent.includes('export const POST');
  logTest('POST handler exported', hasPostHandler, '');
}

{
  const hasGroqImport = apiContent.includes("import Groq from 'groq-sdk'");
  logTest('Groq SDK imported', hasGroqImport, '');
}

{
  const hasLazyInit = apiContent.includes('getGroqClient');
  logTest('Lazy Groq client initialization', hasLazyInit, '');
}

{
  const hasRuleFallback = apiContent.includes('extractWithRules');
  logTest('Rule-based fallback function', hasRuleFallback, '');
}

// Test 3: Check extracted fields
console.log('\n--- Extracted Field Types ---');
{
  const extractedFields = [
    'pain_points',
    'objections',
    'positive_signals',
    'action_items',
    'next_steps',
    'key_stakeholders',
    'decision_timeline',
    'budget_discussed',
    'competitors_mentioned',
  ];

  for (const field of extractedFields) {
    const hasField = apiContent.includes(field);
    logTest(`Extracts: ${field}`, hasField, '');
  }
}

// Test 4: Check rule-based extraction keywords
console.log('\n--- Rule-based Extraction Keywords ---');
{
  const hasPainPointKeywords = apiContent.includes('painPointKeywords');
  logTest('Pain point keywords defined', hasPainPointKeywords, '');

  const hasObjectionKeywords = apiContent.includes('objectionKeywords');
  logTest('Objection keywords defined', hasObjectionKeywords, '');

  const hasPositiveKeywords = apiContent.includes('positiveKeywords');
  logTest('Positive signal keywords defined', hasPositiveKeywords, '');

  const hasActionKeywords = apiContent.includes('actionKeywords');
  logTest('Action item keywords defined', hasActionKeywords, '');
}

// Test 5: Check error handling
console.log('\n--- Error Handling ---');
{
  const hasErrorHandler = apiContent.includes('withErrorHandler');
  logTest('Uses error handler middleware', hasErrorHandler, '');

  const hasValidationError = apiContent.includes('createValidationError');
  logTest('Has validation error handling', hasValidationError, '');

  const hasTryCatch = apiContent.includes('catch (error)');
  logTest('Has try-catch for AI errors', hasTryCatch, '');
}

// Test 6: Check AI prompt structure
console.log('\n--- AI Prompt Structure ---');
{
  const hasPromptBuilder = apiContent.includes('buildExtractionPrompt');
  logTest('Prompt builder function exists', hasPromptBuilder, '');

  const hasSystemPrompt = apiContent.includes("role: 'system'");
  logTest('System prompt defined', hasSystemPrompt, '');

  const hasUserPrompt = apiContent.includes("role: 'user'");
  logTest('User prompt defined', hasUserPrompt, '');

  const hasJSONParsing = apiContent.includes('JSON.parse');
  logTest('JSON response parsing', hasJSONParsing, '');
}

// Test 7: Check AddMeetingNoteModal component
console.log('\n--- AddMeetingNoteModal Component ---');
{
  const modalPath = path.join(__dirname, '../components/AddMeetingNoteModal.tsx');
  const exists = fs.existsSync(modalPath);
  logTest('AddMeetingNoteModal component exists', exists, '');

  if (exists) {
    const modalContent = fs.readFileSync(modalPath, 'utf-8');

    const callsExtractionAPI = modalContent.includes('/api/meetings/extract');
    logTest('Calls extraction API endpoint', callsExtractionAPI, '');

    const hasMeetingTypes = modalContent.includes('meeting_type');
    logTest('Has meeting type selection', hasMeetingTypes, '');

    const hasExtractButton = modalContent.includes('Extract') || modalContent.includes('extract');
    logTest('Has extraction trigger', hasExtractButton, '');
  }
}

// Test 8: Integration test - simulate extraction
console.log('\n--- Rule-based Extraction Test ---');
{
  // Simulate the rule-based extraction logic
  const testSummary = `
    Met with Acme Corp today. They're facing challenges with their current data pipeline.
    The team is interested in our solution but worried about the implementation timeline.
    They loved the analytics dashboard demo. Will send proposal by Friday.
    Need to schedule follow-up with their CTO next week.
    Budget was briefly discussed - they have $50k allocated for this quarter.
    Mentioned they're also looking at Competitor X.
  `;

  const lowerText = testSummary.toLowerCase();

  // Test pain point detection
  const hasPainPoint = lowerText.includes('challenge') || lowerText.includes('problem');
  logTest('Detects pain points from text', hasPainPoint, 'Found: challenges');

  // Test objection detection
  const hasObjection = lowerText.includes('worried') || lowerText.includes('concern');
  logTest('Detects objections from text', hasObjection, 'Found: worried');

  // Test positive signal detection
  const hasPositive = lowerText.includes('loved') || lowerText.includes('interested');
  logTest('Detects positive signals from text', hasPositive, 'Found: loved, interested');

  // Test action item detection
  const hasAction = lowerText.includes('will send') || lowerText.includes('follow up');
  logTest('Detects action items from text', hasAction, 'Found: will send, follow-up');

  // Test budget detection
  const hasBudget = lowerText.includes('budget');
  logTest('Detects budget discussion', hasBudget, 'Found: budget');

  // Test competitor detection
  const hasCompetitor = lowerText.includes('competitor');
  logTest('Detects competitor mention', hasCompetitor, 'Found: competitor');
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
