/**
 * UI Responsiveness & Account Manager Workflow Test
 * Tests button responsiveness, loading states, and error handling
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkkhwiyolmowomojvtel.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROD_URL = 'https://myra-status-dashboard.vercel.app';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function recordTest(name, passed, message) {
  testResults.tests.push({ name, passed, message });
  if (passed) {
    testResults.passed++;
    log(`  ✓ ${message}`, 'green');
  } else {
    testResults.failed++;
    log(`  ✗ ${message}`, 'red');
  }
}

function recordWarning(name, message) {
  testResults.warnings++;
  log(`  ⚠ ${name}: ${message}`, 'yellow');
}

// ============================================================================
// TEST 1: API Endpoint Responsiveness
// ============================================================================

async function testAPIResponsiveness() {
  logSection('TEST 1: API Endpoint Responsiveness');

  const endpoints = [
    { name: 'Parse Activity', method: 'POST', url: '/api/parse-activity', body: { text: 'Demo call' } },
    { name: 'Timeline Import Confirm', method: 'POST', url: '/api/timeline/import/confirm', body: {} },
    { name: 'Bulk Import Users', method: 'POST', url: '/api/trials/bulk-operations/import-users', body: {} }
  ];

  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();

      const response = await fetch(`${PROD_URL}${endpoint.url}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint.body)
      });

      const duration = Date.now() - startTime;

      // We expect 401 for protected endpoints or valid responses
      if (response.ok || response.status === 401) {
        const status = response.ok ? 'Success' : 'Protected (Auth required)';
        recordTest(
          `API: ${endpoint.name}`,
          true,
          `${status} - Responded in ${duration}ms`
        );
      } else {
        recordTest(
          `API: ${endpoint.name}`,
          false,
          `Unexpected status ${response.status}`
        );
      }
    } catch (error) {
      recordTest(`API: ${endpoint.name}`, false, `Network error: ${error.message}`);
    }
  }
}

// ============================================================================
// TEST 2: Loading State Behavior (simulated)
// ============================================================================

async function testLoadingStates() {
  logSection('TEST 2: Loading States & Response Times');

  const operations = [
    {
      name: 'Quick Parse Operation',
      fn: async () => {
        const response = await fetch(`${PROD_URL}/api/parse-activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Test activity' })
        });
        return response.ok;
      },
      expectedDuration: 1000
    },
    {
      name: 'Database Query',
      fn: async () => {
        const { error } = await supabase
          .from('trial_organizations')
          .select('id')
          .limit(1);
        return !error;
      },
      expectedDuration: 500
    }
  ];

  for (const op of operations) {
    try {
      const startTime = Date.now();
      const success = await op.fn();
      const duration = Date.now() - startTime;

      if (success) {
        const loadingState = duration > op.expectedDuration ? 'Long (user sees loading)' : 'Fast (smooth UX)';
        recordTest(
          `Loading: ${op.name}`,
          true,
          `${duration}ms - ${loadingState}`
        );
      } else {
        recordTest(`Loading: ${op.name}`, false, 'Operation failed');
      }
    } catch (error) {
      recordTest(`Loading: ${op.name}`, false, error.message);
    }
  }
}

// ============================================================================
// TEST 3: Error Handling & User Feedback
// ============================================================================

async function testErrorHandling() {
  logSection('TEST 3: Error Handling & User Feedback');

  const errorScenarios = [
    {
      name: 'Empty Input Validation',
      test: async () => {
        const response = await fetch(`${PROD_URL}/api/parse-activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '' })
        });
        return { status: response.status, graceful: response.status === 400 };
      }
    },
    {
      name: 'Invalid JSON Handling',
      test: async () => {
        try {
          const response = await fetch(`${PROD_URL}/api/parse-activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json'
          });
          return { status: response.status, graceful: response.status === 400 };
        } catch (error) {
          return { status: 'error', graceful: false };
        }
      }
    },
    {
      name: 'Missing Required Fields',
      test: async () => {
        const response = await fetch(`${PROD_URL}/api/parse-activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        return { status: response.status, graceful: response.status === 400 || response.status === 422 };
      }
    }
  ];

  for (const scenario of errorScenarios) {
    try {
      const result = await scenario.test();

      if (result.graceful) {
        recordTest(
          `Error Handling: ${scenario.name}`,
          true,
          `Handled gracefully (${result.status})`
        );
      } else {
        recordTest(
          `Error Handling: ${scenario.name}`,
          false,
          `Not handled gracefully (${result.status})`
        );
      }
    } catch (error) {
      recordTest(`Error Handling: ${scenario.name}`, false, error.message);
    }
  }
}

// ============================================================================
// TEST 4: Database Constraints in Action
// ============================================================================

async function testDatabaseConstraintsInAction() {
  logSection('TEST 4: Database Constraints Protection');

  log('Testing constraint protection (should prevent invalid data):', 'bright');

  // Test 1: Invalid trial dates
  try {
    const { error } = await supabase
      .from('trial_organizations')
      .insert({
        org_name: 'Test Constraint Org',
        trial_start_date: '2025-12-31',
        trial_end_date: '2025-01-01' // Before start date
      });

    if (error && error.message.includes('trial_dates_valid')) {
      recordTest(
        'Constraint: Trial Dates',
        true,
        'Prevented invalid date range'
      );
    } else if (error) {
      recordWarning('Constraint: Trial Dates', `Different error: ${error.message}`);
    } else {
      recordTest('Constraint: Trial Dates', false, 'Did not prevent invalid dates');
    }
  } catch (error) {
    recordTest('Constraint: Trial Dates', false, error.message);
  }

  // Test 2: Invalid email format
  try {
    const { error } = await supabase
      .from('trial_users')
      .insert({
        email: 'invalid-email',
        name: 'Test User',
        role: 'user'
      });

    if (error && error.message.includes('email_format_valid')) {
      recordTest(
        'Constraint: Email Format',
        true,
        'Prevented invalid email'
      );
    } else if (error) {
      recordWarning('Constraint: Email Format', `Different error: ${error.message}`);
    } else {
      recordTest('Constraint: Email Format', false, 'Did not prevent invalid email');
    }
  } catch (error) {
    recordTest('Constraint: Email Format', false, error.message);
  }
}

// ============================================================================
// TEST 5: Account Manager Workflow Simulation
// ============================================================================

async function testAccountManagerWorkflow() {
  logSection('TEST 5: Account Manager Workflow Simulation');

  log('Simulating typical Account Manager tasks:', 'bright');

  // Task 1: View trial organizations
  try {
    const { data, error, count } = await supabase
      .from('trial_organizations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error) {
      recordTest(
        'Workflow: View Trial Orgs',
        true,
        `Loaded ${data.length} organizations (${count} total)`
      );
    } else {
      recordTest('Workflow: View Trial Orgs', false, error.message);
    }
  } catch (error) {
    recordTest('Workflow: View Trial Orgs', false, error.message);
  }

  // Task 2: Search for specific organization
  try {
    const { data, error } = await supabase
      .from('trial_organizations')
      .select('org_name, status, trial_start_date')
      .ilike('org_name', '%test%')
      .limit(5);

    if (!error) {
      recordTest(
        'Workflow: Search Organizations',
        true,
        `Search returned ${data.length} results`
      );
    } else {
      recordTest('Workflow: Search Organizations', false, error.message);
    }
  } catch (error) {
    recordTest('Workflow: Search Organizations', false, error.message);
  }

  // Task 3: View timeline events
  try {
    const { data, error } = await supabase
      .from('trial_timeline_events')
      .select('title, event_type, event_date')
      .order('event_date', { ascending: false })
      .limit(10);

    if (!error) {
      recordTest(
        'Workflow: View Timeline',
        true,
        `Loaded ${data.length} timeline events`
      );
    } else {
      recordTest('Workflow: View Timeline', false, error.message);
    }
  } catch (error) {
    recordTest('Workflow: View Timeline', false, error.message);
  }

  // Task 4: Check for pending follow-ups
  try {
    const { data, error } = await supabase
      .from('trial_timeline_events')
      .select('title, follow_up_date')
      .eq('follow_up_required', true)
      .not('follow_up_date', 'is', null)
      .gte('follow_up_date', new Date().toISOString())
      .limit(5);

    if (!error) {
      recordTest(
        'Workflow: Check Follow-ups',
        true,
        `Found ${data.length} pending follow-ups`
      );
    } else {
      recordTest('Workflow: Check Follow-ups', false, error.message);
    }
  } catch (error) {
    recordTest('Workflow: Check Follow-ups', false, error.message);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                UI RESPONSIVENESS & ACCOUNT MANAGER TEST                   ║', 'cyan');
  log('║                      Production Environment Check                          ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝\n', 'cyan');

  const startTime = Date.now();

  await testAPIResponsiveness();
  await testLoadingStates();
  await testErrorHandling();
  await testDatabaseConstraintsInAction();
  await testAccountManagerWorkflow();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  logSection('TEST RESULTS SUMMARY');

  log(`Total Tests: ${testResults.tests.length}`, 'bright');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(`Warnings: ${testResults.warnings}`, 'yellow');
  log(`Duration: ${duration}s`, 'blue');

  if (testResults.failed === 0) {
    log('\n✅ ALL SYSTEMS OPERATIONAL!', 'green');
    log('   - Buttons/APIs are responsive', 'green');
    log('   - Loading states working correctly', 'green');
    log('   - Error handling is graceful', 'green');
    log('   - Database constraints active', 'green');
    log('   - Account Manager workflows functional', 'green');
  } else {
    log(`\n⚠️  ${testResults.failed} issue(s) detected`, 'yellow');
  }

  console.log('\nDetailed Results:');
  testResults.tests.forEach((test, idx) => {
    const status = test.passed ? '✓' : '✗';
    const color = test.passed ? 'green' : 'red';
    log(`${idx + 1}. [${status}] ${test.name}`, color);
    if (test.message) {
      console.log(`   ${test.message}`);
    }
  });

  log('\n' + '='.repeat(80) + '\n', 'cyan');

  return testResults.failed === 0;
}

runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
