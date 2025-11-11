#!/usr/bin/env tsx
/**
 * PRE-LAUNCH TEST: API Endpoints
 * Tests that critical API routes are responding correctly
 */

interface TestResult {
  endpoint: string;
  method: string;
  passed: boolean;
  status?: number;
  error?: string;
  responseTime?: number;
}

const results: TestResult[] = [];
const BASE_URL = 'http://localhost:3000';

async function testEndpoint(
  method: string,
  path: string,
  requiresAuth: boolean = true,
  body?: any
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log(`\n🧪 Testing: ${method} ${path}...`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const responseTime = Date.now() - startTime;

    // For API endpoints, we expect either 200 (success) or 401 (unauthorized if no auth)
    const validStatuses = requiresAuth ? [200, 401] : [200];
    const passed = validStatuses.includes(response.status);

    if (passed) {
      console.log(`✅ PASS: ${method} ${path} (${response.status}) - ${responseTime}ms`);
    } else {
      console.log(`❌ FAIL: ${method} ${path} (${response.status}) - ${responseTime}ms`);
    }

    return {
      endpoint: path,
      method,
      passed,
      status: response.status,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ FAIL: ${method} ${path} - ${error.message}`);

    return {
      endpoint: path,
      method,
      passed: false,
      error: error.message,
      responseTime,
    };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 PRE-LAUNCH TEST: API ENDPOINTS');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log('Note: 401 responses are OK for auth-required endpoints\n');

  // Test critical API endpoints
  const tests = [
    { method: 'GET', path: '/api/todos', requiresAuth: true },
    { method: 'GET', path: '/api/account-managers', requiresAuth: true },
    { method: 'GET', path: '/api/notifications', requiresAuth: true },
    { method: 'GET', path: '/api/unified-notes', requiresAuth: true },
  ];

  for (const test of tests) {
    const result = await testEndpoint(test.method, test.path, test.requiresAuth);
    results.push(result);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    const statusCode = r.status ? `(${r.status})` : '';
    const time = r.responseTime ? `${r.responseTime}ms` : '';
    console.log(`${status}: ${r.method} ${r.endpoint} ${statusCode} ${time}`);
    if (r.error) {
      console.log(`        Error: ${r.error}`);
    }
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('-'.repeat(60));

  // Calculate average response time
  const avgResponseTime = results
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;

  console.log(`Average response time: ${Math.round(avgResponseTime)}ms`);

  if (failed === 0) {
    console.log('\n🎉 ALL API ENDPOINTS RESPONDING! Server is READY FOR LAUNCH!\n');
    process.exit(0);
  } else {
    console.log(`\n🚨 ${failed} ENDPOINT(S) FAILING! Check server status before launch!\n`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error.message);
  console.error('\nIs the dev server running on http://localhost:3000?');
  process.exit(1);
});
