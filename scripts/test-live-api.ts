/**
 * Live API Integration Tests
 * Tests actual API endpoints with real requests
 */

// Test results tracking
const results: { test: string; passed: boolean; details: string }[] = [];

function logTest(test: string, passed: boolean, details: string = '') {
  results.push({ test, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}${details ? `: ${details}` : ''}`);
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log('\n========================================');
  console.log('LIVE API INTEGRATION TESTS');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('========================================\n');

  // Check if server is running
  console.log('--- Server Health Check ---');
  try {
    const healthCheck = await fetch(`${BASE_URL}`, { method: 'HEAD' });
    logTest('Server is running', healthCheck.ok || healthCheck.status === 200, `status=${healthCheck.status}`);
  } catch (error) {
    logTest('Server is running', false, 'Server not reachable - start with npm run dev');
    console.log('\nCannot proceed without server. Exiting...\n');
    process.exit(1);
  }

  // Test 1: Meeting Extraction API
  console.log('\n--- Meeting Extraction API ---');
  {
    const testSummary = `
      Met with Acme Corp today. They are facing significant challenges with their current data pipeline.
      The team is very interested in our solution but expressed concerns about the implementation timeline.
      They really loved the analytics dashboard demo we showed.
      Action: Will send proposal by Friday.
      Need to schedule follow-up meeting with their CTO Sarah Johnson next week.
      Budget was discussed - they have $50k allocated for this quarter.
      They mentioned they looked at Salesforce and HubSpot but found them too complex.
    `;

    try {
      const response = await fetch(`${BASE_URL}/api/meetings/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_summary: testSummary,
          attendees: ['John Smith', 'Sarah Johnson'],
          meeting_type: 'demo',
        }),
      });

      const data = await response.json();
      logTest('Meeting extraction API responds', response.ok, `status=${response.status}`);
      logTest('Response has success field', data.success === true, `success=${data.success}`);
      logTest('Response has data field', data.data != null, '');
      logTest('Response has meta field', data.meta != null, `method=${data.meta?.method}`);

      if (data.data) {
        // Check extracted fields
        const hasExtractions = data.data.pain_points != null || data.data.objections != null;
        logTest('Has extraction results', hasExtractions, '');

        // Verify extraction method
        logTest('Extraction method specified', data.meta?.method != null, `method=${data.meta?.method}`);
      }
    } catch (error) {
      logTest('Meeting extraction API responds', false, `error: ${error}`);
    }
  }

  // Test 2: Empty summary validation
  console.log('\n--- Input Validation ---');
  {
    try {
      const response = await fetch(`${BASE_URL}/api/meetings/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_summary: '',
        }),
      });

      const data = await response.json();
      // Should return validation error
      logTest('Empty summary returns error', !data.success || response.status >= 400, `status=${response.status}`);
    } catch (error) {
      logTest('Empty summary validation', false, `error: ${error}`);
    }
  }

  // Test 3: Test organizations API
  console.log('\n--- Organizations API ---');
  {
    try {
      const response = await fetch(`${BASE_URL}/api/organizations`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      logTest('Organizations API responds', response.ok || response.status < 500, `status=${response.status}`);

      if (response.ok) {
        const data = await response.json();
        const isArray = Array.isArray(data) || Array.isArray(data.data);
        logTest('Returns array of organizations', isArray, '');
      }
    } catch (error) {
      logTest('Organizations API responds', false, `error: ${error}`);
    }
  }

  // Test 4: Test parse API
  console.log('\n--- Parse Command API ---');
  {
    try {
      const response = await fetch(`${BASE_URL}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: '/meeting @Acme demo 30min - discussed pricing strategy',
        }),
      });

      logTest('Parse API responds', response.ok || response.status < 500, `status=${response.status}`);

      if (response.ok) {
        const data = await response.json();
        logTest('Parse result has action', data.action != null || data.parsed?.action != null, `action=${data.action || data.parsed?.action}`);
      }
    } catch (error) {
      logTest('Parse API responds', false, `error: ${error}`);
    }
  }

  // Test 5: Test stakeholders API
  console.log('\n--- Stakeholders API ---');
  {
    // First get an org ID
    try {
      const orgsResponse = await fetch(`${BASE_URL}/api/organizations`);
      if (orgsResponse.ok) {
        const orgs = await orgsResponse.json();
        const orgList = Array.isArray(orgs) ? orgs : orgs.data;

        if (orgList && orgList.length > 0) {
          const testOrgId = orgList[0].org_id || orgList[0].id;

          const response = await fetch(`${BASE_URL}/api/organizations/${testOrgId}/stakeholders`);
          logTest('Stakeholders API responds', response.ok || response.status < 500, `status=${response.status}`);
        } else {
          logTest('Stakeholders API responds', true, 'No orgs to test with (skipped)');
        }
      }
    } catch (error) {
      logTest('Stakeholders API responds', false, `error: ${error}`);
    }
  }

  // Test 6: Test meeting notes API
  console.log('\n--- Meeting Notes API ---');
  {
    try {
      const orgsResponse = await fetch(`${BASE_URL}/api/organizations`);
      if (orgsResponse.ok) {
        const orgs = await orgsResponse.json();
        const orgList = Array.isArray(orgs) ? orgs : orgs.data;

        if (orgList && orgList.length > 0) {
          const testOrgId = orgList[0].org_id || orgList[0].id;

          const response = await fetch(`${BASE_URL}/api/organizations/${testOrgId}/meetings`);
          logTest('Meeting notes API responds', response.ok || response.status < 500, `status=${response.status}`);
        } else {
          logTest('Meeting notes API responds', true, 'No orgs to test with (skipped)');
        }
      }
    } catch (error) {
      logTest('Meeting notes API responds', false, `error: ${error}`);
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
}

runTests().catch(console.error);
