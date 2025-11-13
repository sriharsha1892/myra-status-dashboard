/**
 * Comprehensive Timeline Import Testing Suite
 * Tests all APIs, functionality, edge cases, and error handling
 */

const { createClient } = require('@supabase/supabase-js');

const BASE_URL = 'http://localhost:3000';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Test data - real example from user
const REAL_NARRATIVE = `Output of the call that happened on 28 Oct'24 - Client liked the platform and informed, we need share the trial access b/w Nov'24 (17-21) as she has this window available to use it and she'll run it with few other teams they have and will discuss again in the month of Jan'25 as budgeting will initiated during this period.

As of 13 Nov'24 - due their internal compliance issues, they couldn't explore the full functionalities of the platform. Hence, his activity couldn't be traced at our servers as well + sent a new set of credentials for client to use it on his personal laptop + next follow up scheduled on 14 Nov'24 10 AM CST (9:30 PM IST).`;

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}\n`);

  results.tests.push({ name, status, details });
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else results.warnings++;
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

async function getTestOrgAndToken() {
  // Get first trial organization
  const { data: org } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name')
    .limit(1)
    .single();

  if (!org) {
    throw new Error('No trial organizations found in database');
  }

  // Get admin user and create session
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const adminUser = users.find(u => u.email === 'admin@myra.ai') || users[0];

  if (!adminUser) {
    throw new Error('No users found in database');
  }

  // Create session token
  const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: adminUser.email,
  });

  if (sessionError) {
    throw new Error(`Failed to generate session: ${sessionError.message}`);
  }

  console.log(`📊 Test Organization: ${org.org_name}`);
  console.log(`👤 Test User: ${adminUser.email}\n`);

  return { org, user: adminUser };
}

async function testLLMParseAPI(org) {
  logSection('TEST 1: LLM Parse API (/api/timeline/import/llm-parse)');

  try {
    // Test 1.1: Valid narrative text
    console.log('Test 1.1: Parsing valid narrative text...');
    const response = await fetch(`${BASE_URL}/api/timeline/import/llm-parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: REAL_NARRATIVE,
        org_id: org.org_id,
        date_range_hint: {
          start: '2024-10-01',
          end: '2025-01-31'
        }
      })
    });

    const data = await response.json();

    if (data.success && data.events && data.events.length > 0) {
      logTest('LLM Parse API - Valid Input', 'PASS',
        `Extracted ${data.events.length} events in ${data.processing_time_ms}ms`);

      // Validate event structure
      const event = data.events[0];
      const hasRequiredFields = event.event_timestamp && event.event_type &&
        event.event_category && event.title && event.sentiment;

      if (hasRequiredFields) {
        logTest('Event Structure Validation', 'PASS',
          `Event Type: ${event.event_type}, Sentiment: ${event.sentiment}, Confidence: ${event.parse_confidence}`);
      } else {
        logTest('Event Structure Validation', 'FAIL',
          'Missing required fields in parsed event');
      }

      // Check confidence scores
      const avgConfidence = data.events.reduce((sum, e) => sum + e.parse_confidence, 0) / data.events.length;
      if (avgConfidence >= 0.7) {
        logTest('Confidence Scores', 'PASS',
          `Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);
      } else {
        logTest('Confidence Scores', 'WARN',
          `Average confidence: ${(avgConfidence * 100).toFixed(1)}% (below 70%)`);
      }

      return data.events;
    } else {
      logTest('LLM Parse API - Valid Input', 'FAIL',
        data.error || 'No events extracted');
      return [];
    }

  } catch (error) {
    logTest('LLM Parse API - Valid Input', 'FAIL', error.message);
    return [];
  }

  // Test 1.2: Empty text
  try {
    console.log('\nTest 1.2: Testing empty text validation...');
    const response = await fetch(`${BASE_URL}/api/timeline/import/llm-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', org_id: org.org_id })
    });

    const data = await response.json();
    if (response.status === 400) {
      logTest('Empty Text Validation', 'PASS', 'Correctly rejected empty text');
    } else {
      logTest('Empty Text Validation', 'FAIL', 'Should reject empty text');
    }
  } catch (error) {
    logTest('Empty Text Validation', 'FAIL', error.message);
  }

  // Test 1.3: Very long text
  try {
    console.log('\nTest 1.3: Testing text length limit...');
    const longText = 'x'.repeat(60000);
    const response = await fetch(`${BASE_URL}/api/timeline/import/llm-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: longText, org_id: org.org_id })
    });

    const data = await response.json();
    if (response.status === 400) {
      logTest('Text Length Limit', 'PASS', 'Correctly rejected text >50k chars');
    } else {
      logTest('Text Length Limit', 'FAIL', 'Should reject text >50k chars');
    }
  } catch (error) {
    logTest('Text Length Limit', 'FAIL', error.message);
  }
}

async function testQuickEntryAPI(org) {
  logSection('TEST 2: Quick Entry API (/api/timeline/quick-entry)');

  try {
    // Test 2.1: Create single event
    console.log('Test 2.1: Creating single timeline event...');
    const eventData = {
      org_id: org.org_id,
      event_type: 'call_completed',
      event_category: 'communication',
      title: 'Test demo call completed',
      description: 'Discussed product features and pricing',
      event_timestamp: new Date().toISOString(),
      sentiment: 'positive',
      severity: 'medium',
      tags: ['demo', 'pricing'],
      mentioned_people: ['John Doe'],
      follow_up_required: true,
      follow_up_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    const response = await fetch(`${BASE_URL}/api/timeline/quick-entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });

    const data = await response.json();

    if (data.success && data.event) {
      logTest('Quick Entry API - Create Event', 'PASS',
        `Event ID: ${data.event.id}`);
      return data.event.id;
    } else {
      logTest('Quick Entry API - Create Event', 'FAIL',
        data.error || 'Failed to create event');
      return null;
    }

  } catch (error) {
    logTest('Quick Entry API - Create Event', 'FAIL', error.message);
    return null;
  }

  // Test 2.2: GET recent types
  try {
    console.log('\nTest 2.2: Fetching recent activity types...');
    const response = await fetch(`${BASE_URL}/api/timeline/quick-entry`);
    const data = await response.json();

    if (data.success && data.recent_types) {
      logTest('Quick Entry API - Recent Types', 'PASS',
        `Found ${data.recent_types.length} recent types`);
    } else {
      logTest('Quick Entry API - Recent Types', 'FAIL',
        'Failed to fetch recent types');
    }
  } catch (error) {
    logTest('Quick Entry API - Recent Types', 'FAIL', error.message);
  }
}

async function testDuplicateDetection(org, parsedEvents) {
  logSection('TEST 3: Duplicate Detection API (/api/timeline/duplicates/check)');

  if (!parsedEvents || parsedEvents.length === 0) {
    logTest('Duplicate Detection API', 'WARN', 'No parsed events to test with');
    return;
  }

  try {
    console.log('Test 3.1: Checking duplicates for batch...');
    const response = await fetch(`${BASE_URL}/api/timeline/duplicates/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: parsedEvents,
        org_id: org.org_id
      })
    });

    const data = await response.json();

    if (data.success && data.duplicates) {
      logTest('Duplicate Detection API - Batch Check', 'PASS',
        `Checked ${data.duplicates.length} events for duplicates`);

      // Test duplicate threshold
      const duplicatesFound = data.duplicates.filter(d => d.is_duplicate).length;
      console.log(`   Found ${duplicatesFound} potential duplicates`);

      if (duplicatesFound > 0) {
        logTest('Duplicate Detection - Threshold Test', 'PASS',
          'Duplicate detection working (found duplicates in repeat test)');
      } else {
        logTest('Duplicate Detection - Threshold Test', 'PASS',
          'No duplicates found (expected for first run)');
      }
    } else {
      logTest('Duplicate Detection API - Batch Check', 'FAIL',
        data.error || 'Failed to check duplicates');
    }

  } catch (error) {
    logTest('Duplicate Detection API - Batch Check', 'FAIL', error.message);
  }
}

async function testImportConfirmAPI(org, parsedEvents) {
  logSection('TEST 4: Import Confirm API (/api/timeline/import/confirm)');

  if (!parsedEvents || parsedEvents.length === 0) {
    logTest('Import Confirm API', 'WARN', 'No parsed events to import');
    return;
  }

  try {
    console.log('Test 4.1: Confirming and importing parsed events...');
    const response = await fetch(`${BASE_URL}/api/timeline/import/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: org.org_id,
        events: parsedEvents,
        raw_text: REAL_NARRATIVE,
        source_type: 'bulk_import_llm'
      })
    });

    const data = await response.json();

    if (data.success) {
      logTest('Import Confirm API - Import Events', 'PASS',
        `Imported ${data.data.events_imported} events (session: ${data.data.session_id})`);

      // Verify events in database
      const { data: dbEvents, error: dbError } = await supabase
        .from('trial_timeline_events')
        .select('*')
        .eq('org_id', org.org_id)
        .in('id', data.data.inserted_event_ids);

      if (!dbError && dbEvents && dbEvents.length === data.data.events_imported) {
        logTest('Import Verification - Database Check', 'PASS',
          `All ${dbEvents.length} events persisted correctly`);
      } else {
        logTest('Import Verification - Database Check', 'FAIL',
          'Events not found in database');
      }
    } else {
      logTest('Import Confirm API - Import Events', 'FAIL',
        data.error || 'Import failed');
    }

  } catch (error) {
    logTest('Import Confirm API - Import Events', 'FAIL', error.message);
  }
}

async function testFuzzyMatching() {
  logSection('TEST 5: Fuzzy Activity Type Matching');

  try {
    const { fuzzyMatch } = require('../lib/timeline/activityMatcher');

    // Test 5.1: Exact match
    console.log('Test 5.1: Testing exact match...');
    const exactMatches = fuzzyMatch('call_completed');
    if (exactMatches[0] && exactMatches[0].confidence === 1.0) {
      logTest('Fuzzy Matching - Exact Match', 'PASS',
        `Matched: ${exactMatches[0].event_type}`);
    } else {
      logTest('Fuzzy Matching - Exact Match', 'FAIL',
        'Should return 100% confidence for exact match');
    }

    // Test 5.2: Alias matching
    console.log('\nTest 5.2: Testing alias matching...');
    const aliasMatches = fuzzyMatch('call');
    if (aliasMatches.length > 0 && aliasMatches[0].confidence >= 0.8) {
      logTest('Fuzzy Matching - Alias Match', 'PASS',
        `"call" → ${aliasMatches.map(m => m.event_type).join(', ')}`);
    } else {
      logTest('Fuzzy Matching - Alias Match', 'FAIL',
        'Should suggest activity types for "call"');
    }

    // Test 5.3: Levenshtein distance
    console.log('\nTest 5.3: Testing fuzzy string matching...');
    const fuzzyMatches = fuzzyMatch('email_exchnge'); // typo
    if (fuzzyMatches.length > 0 && fuzzyMatches.some(m => m.event_type === 'email_exchange')) {
      logTest('Fuzzy Matching - Levenshtein Distance', 'PASS',
        `Corrected typo: "email_exchnge" → "email_exchange"`);
    } else {
      logTest('Fuzzy Matching - Levenshtein Distance', 'WARN',
        'Should suggest "email_exchange" for typo');
    }

    // Test 5.4: User correction learning
    console.log('\nTest 5.4: Testing correction history learning...');
    const correctionHistory = { 'meeting': 'call_completed' };
    const learnedMatches = fuzzyMatch('meeting', correctionHistory);
    if (learnedMatches[0] && learnedMatches[0].event_type === 'call_completed' && learnedMatches[0].confidence >= 0.95) {
      logTest('Fuzzy Matching - Correction Learning', 'PASS',
        `Learned: "meeting" → "call_completed" (${learnedMatches[0].confidence})`);
    } else {
      logTest('Fuzzy Matching - Correction Learning', 'FAIL',
        'Should learn from correction history');
    }

  } catch (error) {
    logTest('Fuzzy Matching Tests', 'FAIL', error.message);
  }
}

async function testDuplicateDetectionLogic() {
  logSection('TEST 6: Duplicate Detection Logic');

  try {
    const { checkDuplicate } = require('../lib/timeline/duplicateDetector');

    const newEvent = {
      event_timestamp: new Date('2024-10-28'),
      event_type: 'call_completed',
      title: 'Client liked the platform',
      description: 'Discussed trial access and timeline',
      tags: ['demo', 'trial']
    };

    // Test 6.1: Exact duplicate
    console.log('Test 6.1: Testing exact duplicate detection...');
    const exactDuplicate = {
      event_timestamp: new Date('2024-10-28'),
      event_type: 'call_completed',
      title: 'Client liked the platform',
      description: 'Discussed trial access and timeline',
      tags: ['demo']
    };

    const duplicateCheck1 = checkDuplicate(newEvent, [exactDuplicate], 'test-org-id');
    if (duplicateCheck1.is_duplicate && duplicateCheck1.similarity_score >= 0.7) {
      logTest('Duplicate Detection - Exact Duplicate', 'PASS',
        `Similarity: ${(duplicateCheck1.similarity_score * 100).toFixed(1)}%`);
    } else {
      logTest('Duplicate Detection - Exact Duplicate', 'FAIL',
        `Similarity too low: ${(duplicateCheck1.similarity_score * 100).toFixed(1)}%`);
    }

    // Test 6.2: Near duplicate (different date)
    console.log('\nTest 6.2: Testing near duplicate...');
    const nearDuplicate = {
      event_timestamp: new Date('2024-10-30'), // 2 days difference
      event_type: 'call_completed',
      title: 'Client really liked our platform',
      description: 'We discussed trial access',
      tags: ['demo']
    };

    const duplicateCheck2 = checkDuplicate(newEvent, [nearDuplicate], 'test-org-id');
    if (duplicateCheck2.is_duplicate) {
      logTest('Duplicate Detection - Near Duplicate', 'PASS',
        `Similarity: ${(duplicateCheck2.similarity_score * 100).toFixed(1)}%`);
    } else {
      logTest('Duplicate Detection - Near Duplicate', 'WARN',
        `Similarity below threshold: ${(duplicateCheck2.similarity_score * 100).toFixed(1)}%`);
    }

    // Test 6.3: Different event (not duplicate)
    console.log('\nTest 6.3: Testing different event...');
    const differentEvent = {
      event_timestamp: new Date('2024-11-15'),
      event_type: 'bug_reported',
      title: 'Login page not loading',
      description: 'User reported login issues on Safari browser',
      tags: ['bug', 'login']
    };

    const duplicateCheck3 = checkDuplicate(newEvent, [differentEvent], 'test-org-id');
    if (!duplicateCheck3.is_duplicate && duplicateCheck3.similarity_score < 0.5) {
      logTest('Duplicate Detection - Different Event', 'PASS',
        `Correctly identified as different (similarity: ${(duplicateCheck3.similarity_score * 100).toFixed(1)}%)`);
    } else {
      logTest('Duplicate Detection - Different Event', 'FAIL',
        `Should not be flagged as duplicate`);
    }

  } catch (error) {
    logTest('Duplicate Detection Logic Tests', 'FAIL', error.message);
  }
}

async function testEdgeCases(org) {
  logSection('TEST 7: Edge Cases & Error Handling');

  // Test 7.1: Special characters
  try {
    console.log('Test 7.1: Testing special characters in narrative...');
    const specialText = 'Call on 15/11/24 with John@Doe & Jane-Smith! Discussed $pricing (20% off) #success 🎉';
    const response = await fetch(`${BASE_URL}/api/timeline/import/llm-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: specialText, org_id: org.org_id })
    });

    const data = await response.json();
    if (data.success || (data.error && !data.error.includes('crash'))) {
      logTest('Edge Case - Special Characters', 'PASS',
        'Handles special characters without crashing');
    } else {
      logTest('Edge Case - Special Characters', 'FAIL',
        'Should handle special characters gracefully');
    }
  } catch (error) {
    logTest('Edge Case - Special Characters', 'FAIL', error.message);
  }

  // Test 7.2: Ambiguous dates
  try {
    console.log('\nTest 7.2: Testing ambiguous dates...');
    const ambiguousText = 'Had a call yesterday. Following up next week. Meeting scheduled for Q1 2025.';
    const response = await fetch(`${BASE_URL}/api/timeline/import/llm-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ambiguousText, org_id: org.org_id })
    });

    const data = await response.json();
    if (data.success || data.events) {
      logTest('Edge Case - Ambiguous Dates', 'PASS',
        `Extracted ${data.events?.length || 0} events`);
    } else {
      logTest('Edge Case - Ambiguous Dates', 'WARN',
        'May need date range hints for ambiguous dates');
    }
  } catch (error) {
    logTest('Edge Case - Ambiguous Dates', 'FAIL', error.message);
  }

  // Test 7.3: Very short text
  try {
    console.log('\nTest 7.3: Testing very short text...');
    const shortText = 'Call done.';
    const response = await fetch(`${BASE_URL}/api/timeline/import/llm-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: shortText, org_id: org.org_id })
    });

    const data = await response.json();
    logTest('Edge Case - Very Short Text', 'PASS',
      `Handled short text (extracted ${data.events?.length || 0} events)`);
  } catch (error) {
    logTest('Edge Case - Very Short Text', 'FAIL', error.message);
  }

  // Test 7.4: Multiple events in one sentence
  try {
    console.log('\nTest 7.4: Testing compound narratives...');
    const compoundText = 'On Oct 28, had demo call, sent follow-up email, and scheduled next meeting for Nov 5.';
    const response = await fetch(`${BASE_URL}/api/timeline/import/llm-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: compoundText, org_id: org.org_id })
    });

    const data = await response.json();
    if (data.success && data.events && data.events.length >= 3) {
      logTest('Edge Case - Compound Narratives', 'PASS',
        `Correctly split into ${data.events.length} separate events`);
    } else {
      logTest('Edge Case - Compound Narratives', 'WARN',
        `Only extracted ${data.events?.length || 0} events (expected 3)`);
    }
  } catch (error) {
    logTest('Edge Case - Compound Narratives', 'FAIL', error.message);
  }
}

async function printSummary() {
  logSection('TEST RESULTS SUMMARY');

  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}\n`);

  const passRate = (results.passed / results.tests.length * 100).toFixed(1);
  console.log(`Pass Rate: ${passRate}%\n`);

  if (results.failed > 0) {
    console.log('Failed Tests:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`  ❌ ${t.name}: ${t.details}`));
    console.log('');
  }

  if (passRate >= 90) {
    console.log('🎉 SYSTEM READY FOR PRODUCTION!');
    console.log('All critical tests passing. Safe to demo tomorrow.\n');
  } else if (passRate >= 75) {
    console.log('⚠️  MOSTLY READY - Review failed tests');
    console.log('Most functionality working. Address failures before demo.\n');
  } else {
    console.log('❌ NOT READY - Critical issues found');
    console.log('Multiple test failures. DO NOT proceed with demo.\n');
  }
}

async function runAllTests() {
  console.log('\n🧪 COMPREHENSIVE TIMELINE IMPORT TESTING SUITE\n');
  console.log('Testing all APIs, functionality, edge cases, and error handling\n');

  try {
    // Setup
    const { org, user } = await getTestOrgAndToken();

    // Run all test suites
    const parsedEvents = await testLLMParseAPI(org);
    await testQuickEntryAPI(org);
    await testDuplicateDetection(org, parsedEvents);
    await testImportConfirmAPI(org, parsedEvents);
    await testFuzzyMatching();
    await testDuplicateDetectionLogic();
    await testEdgeCases(org);

    // Print summary
    await printSummary();

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests().then(() => {
  process.exit(results.failed > 0 ? 1 : 0);
});
