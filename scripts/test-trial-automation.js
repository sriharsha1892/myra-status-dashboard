const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const BASE_URL = 'http://localhost:3004';
const API_URL = `${BASE_URL}/api/trials`;

// Test cases with expected results
const testCases = [
  {
    name: 'Full Demo Meeting Notes',
    text: `Had demo with Acme Corp today. John Doe (john@acmecorp.com) and Jane Smith (jane@acmecorp.com) attended. Went really well - they asked 15 questions about the presentation builder and web scout features. They're currently using GPT-5. Trial extended by 2 weeks.`,
    expected: {
      orgs: ['Acme Corp'],
      users: ['john@acmecorp.com', 'jane@acmecorp.com'],
      activities: ['demo_completed', 'trial_extended'],
      features: ['presentation_builder', 'web_scout'],
      models: ['gpt_5'],
      numbers: 2,
      minConfidence: 70
    }
  },
  {
    name: 'POC Kickoff Email',
    text: `POC kicked off with Beta Industries. Primary contact is Sarah Johnson (sarah.j@betaindustries.com). They want to use research architect for their team of 10 users.`,
    expected: {
      orgs: ['Beta Industries'],
      users: ['sarah.j@betaindustries.com'],
      activities: ['trial_started'],
      features: ['research_architect'],
      numbers: 1,
      minConfidence: 70
    }
  },
  {
    name: 'Trial Extension Request',
    text: `Extended runway for Gamma Tech by 1 week. They're evaluating Sonnet 4.5 and need more time.`,
    expected: {
      orgs: ['Gamma Tech'],
      activities: ['trial_extended'],
      models: ['claude_sonnet_4_5'],
      numbers: 1,
      minConfidence: 60
    }
  },
  {
    name: 'Multiple Activities Call Summary',
    text: `Call completed with Delta Solutions. Mike Chen and Lisa Park joined. Demo done. They asked about presentation builder. Tech eval scheduled for next week.`,
    expected: {
      orgs: ['Delta Solutions'],
      activities: ['call_completed', 'demo_completed'],
      features: ['presentation_builder'],
      minConfidence: 60
    }
  },
  {
    name: 'Deal Status Update',
    text: `Pushed to Q2 for Epsilon Corp. Champion identified - Alex Rodriguez (alex@epsilon.com). Still hot lead but budget frozen.`,
    expected: {
      orgs: ['Epsilon Corp'],
      users: ['alex@epsilon.com'],
      minConfidence: 60
    }
  },
  {
    name: 'Feature Usage Tracking',
    text: `Zeta Inc using presentation builder extensively. 25 questions asked about web scout and research architect. They love Sonnet 4.5 and GPT 5 mini.`,
    expected: {
      orgs: ['Zeta Inc'],
      features: ['presentation_builder', 'web_scout', 'research_architect'],
      models: ['claude_sonnet_4_5', 'gpt_5_mini'],
      numbers: 1,
      minConfidence: 60
    }
  },
  {
    name: 'Minimal Input - Just Org and Contact',
    text: `Met with Theta Analytics. Contact: bob@theta.com`,
    expected: {
      orgs: ['Theta Analytics'],
      users: ['bob@theta.com'],
      minConfidence: 50
    }
  },
  {
    name: 'Complex Multi-Org Scenario (Edge Case)',
    text: `Meeting with Iota Systems and Kappa Labs together. They want to collaborate. 3 users from Iota, 2 from Kappa.`,
    expected: {
      orgs: ['Iota Systems', 'Kappa Labs'],
      numbers: 2,
      minConfidence: 50
    }
  },
  {
    name: 'Edge Case - Went Dark',
    text: `Lambda Corp went dark. No response for 2 weeks. Parking lot for now.`,
    expected: {
      orgs: ['Lambda Corp'],
      activities: ['no_response'],
      numbers: 1,
      minConfidence: 60
    }
  },
  {
    name: 'Fast Track Deal',
    text: `Fast-track deal with Mu Enterprises. Rolled out credentials yesterday. 5 users logged in already.`,
    expected: {
      orgs: ['Mu Enterprises'],
      activities: ['trial_access_provided'],
      numbers: 1,
      minConfidence: 60
    }
  }
];

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bold');
  console.log('='.repeat(80));
}

function logSubSection(title) {
  console.log('\n' + '-'.repeat(60));
  log(title, 'cyan');
  console.log('-'.repeat(60));
}

async function testParseText(testCase) {
  logSubSection(`TEST: ${testCase.name}`);

  try {
    log(`📝 Input text (${testCase.text.length} chars):`, 'blue');
    console.log(`   "${testCase.text.substring(0, 100)}${testCase.text.length > 100 ? '...' : ''}"`);

    const response = await fetch(`${API_URL}/parse-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testCase.text,
        source_type: 'manual_entry'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      log(`❌ API Error (${response.status}): ${error}`, 'red');
      return { passed: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json();

    // Validation results
    const validations = {
      passed: [],
      failed: [],
      warnings: []
    };

    // Check overall confidence
    if (result.confidence.overall >= testCase.expected.minConfidence) {
      validations.passed.push(`Confidence: ${result.confidence.overall}% >= ${testCase.expected.minConfidence}%`);
    } else {
      validations.warnings.push(`Confidence: ${result.confidence.overall}% < ${testCase.expected.minConfidence}% (expected)`);
    }

    // Check organizations
    if (testCase.expected.orgs) {
      const extractedOrgs = result.parsed.orgs.map(o => o.value);
      const foundAll = testCase.expected.orgs.every(expectedOrg =>
        extractedOrgs.some(org => org.toLowerCase().includes(expectedOrg.toLowerCase()))
      );

      if (foundAll) {
        validations.passed.push(`✓ Orgs: Found all ${testCase.expected.orgs.length} (${extractedOrgs.join(', ')})`);
      } else {
        validations.failed.push(`✗ Orgs: Expected ${testCase.expected.orgs.join(', ')}, got ${extractedOrgs.join(', ') || 'none'}`);
      }
    }

    // Check users/emails
    if (testCase.expected.users) {
      const extractedEmails = result.parsed.users
        .filter(u => u.metadata?.email)
        .map(u => u.metadata.email);

      const foundAll = testCase.expected.users.every(expectedEmail =>
        extractedEmails.includes(expectedEmail)
      );

      if (foundAll) {
        validations.passed.push(`✓ Users: Found all ${testCase.expected.users.length} (${extractedEmails.join(', ')})`);
      } else {
        validations.failed.push(`✗ Users: Expected ${testCase.expected.users.join(', ')}, got ${extractedEmails.join(', ') || 'none'}`);
      }
    }

    // Check activities
    if (testCase.expected.activities) {
      const extractedActivities = result.parsed.activities.map(a => a.value);
      const foundCount = testCase.expected.activities.filter(expectedActivity =>
        extractedActivities.includes(expectedActivity)
      ).length;

      if (foundCount === testCase.expected.activities.length) {
        validations.passed.push(`✓ Activities: Found all ${testCase.expected.activities.length} (${extractedActivities.join(', ')})`);
      } else if (foundCount > 0) {
        validations.warnings.push(`⚠ Activities: Found ${foundCount}/${testCase.expected.activities.length} (${extractedActivities.join(', ')})`);
      } else {
        validations.failed.push(`✗ Activities: Expected ${testCase.expected.activities.join(', ')}, got ${extractedActivities.join(', ') || 'none'}`);
      }
    }

    // Check features
    if (testCase.expected.features) {
      const extractedFeatures = result.parsed.features.map(f => f.value);
      const foundCount = testCase.expected.features.filter(expectedFeature =>
        extractedFeatures.includes(expectedFeature)
      ).length;

      if (foundCount === testCase.expected.features.length) {
        validations.passed.push(`✓ Features: Found all ${testCase.expected.features.length} (${extractedFeatures.join(', ')})`);
      } else if (foundCount > 0) {
        validations.warnings.push(`⚠ Features: Found ${foundCount}/${testCase.expected.features.length} (${extractedFeatures.join(', ')})`);
      } else {
        validations.failed.push(`✗ Features: Expected ${testCase.expected.features.join(', ')}, got ${extractedFeatures.join(', ') || 'none'}`);
      }
    }

    // Check models
    if (testCase.expected.models) {
      const extractedModels = result.parsed.models.map(m => m.value);
      const foundCount = testCase.expected.models.filter(expectedModel =>
        extractedModels.includes(expectedModel)
      ).length;

      if (foundCount === testCase.expected.models.length) {
        validations.passed.push(`✓ Models: Found all ${testCase.expected.models.length} (${extractedModels.join(', ')})`);
      } else if (foundCount > 0) {
        validations.warnings.push(`⚠ Models: Found ${foundCount}/${testCase.expected.models.length} (${extractedModels.join(', ')})`);
      } else {
        validations.failed.push(`✗ Models: Expected ${testCase.expected.models.join(', ')}, got ${extractedModels.join(', ') || 'none'}`);
      }
    }

    // Check numbers
    if (testCase.expected.numbers !== undefined) {
      if (result.parsed.numbers.length >= testCase.expected.numbers) {
        validations.passed.push(`✓ Numbers: Found ${result.parsed.numbers.length} >= ${testCase.expected.numbers}`);
      } else {
        validations.warnings.push(`⚠ Numbers: Found ${result.parsed.numbers.length} < ${testCase.expected.numbers} (expected)`);
      }
    }

    // Print results
    console.log('\n📊 Extracted Data:');
    console.log(`   Orgs: ${result.parsed.orgs.length} | Users: ${result.parsed.users.length} | Activities: ${result.parsed.activities.length}`);
    console.log(`   Features: ${result.parsed.features.length} | Models: ${result.parsed.models.length} | Numbers: ${result.parsed.numbers.length}`);
    console.log(`   Overall Confidence: ${result.confidence.overall}%`);

    console.log('\n🔍 Validation Results:');
    validations.passed.forEach(msg => log(`   ${msg}`, 'green'));
    validations.warnings.forEach(msg => log(`   ${msg}`, 'yellow'));
    validations.failed.forEach(msg => log(`   ${msg}`, 'red'));

    const testPassed = validations.failed.length === 0;

    if (testPassed) {
      log(`\n✅ TEST PASSED${validations.warnings.length > 0 ? ' (with warnings)' : ''}`, 'green');
    } else {
      log(`\n❌ TEST FAILED (${validations.failed.length} failures)`, 'red');
    }

    return {
      passed: testPassed,
      hasWarnings: validations.warnings.length > 0,
      failureCount: validations.failed.length,
      warningCount: validations.warnings.length,
      confidence: result.confidence.overall
    };

  } catch (error) {
    log(`❌ Exception: ${error.message}`, 'red');
    console.error(error);
    return { passed: false, error: error.message };
  }
}

async function testServerHealth() {
  logSection('🏥 SERVER HEALTH CHECK');

  try {
    const response = await fetch(`${BASE_URL}/api/health`).catch(() => null);

    if (!response) {
      log('⚠️  Server not responding at ' + BASE_URL, 'yellow');
      log('   Checking if dev server is running...', 'yellow');

      // Try the actual endpoint
      const parseResponse = await fetch(`${API_URL}/parse-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' })
      }).catch(() => null);

      if (parseResponse) {
        log('✅ API endpoint accessible (health endpoint may not exist)', 'green');
        return true;
      } else {
        log('❌ Cannot connect to server. Is dev server running on port 3004?', 'red');
        log('   Run: npm run dev', 'yellow');
        return false;
      }
    }

    log('✅ Server is running', 'green');
    return true;
  } catch (error) {
    log(`❌ Health check failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  logSection('🚀 TRIAL AUTOMATION SYSTEM - EXHAUSTIVE TEST SUITE');

  log(`Base URL: ${BASE_URL}`, 'cyan');
  log(`API URL: ${API_URL}`, 'cyan');
  log(`Total Test Cases: ${testCases.length}`, 'cyan');

  // Health check
  const serverHealthy = await testServerHealth();
  if (!serverHealthy) {
    log('\n❌ Aborting tests - server not accessible', 'red');
    process.exit(1);
  }

  // Run all tests
  const results = [];

  logSection('📝 RUNNING TESTS');

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    log(`\n[${i + 1}/${testCases.length}]`, 'magenta');

    const result = await testParseText(testCase);
    results.push({ name: testCase.name, ...result });

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  logSection('📊 TEST SUMMARY');

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);
  const withWarnings = results.filter(r => r.passed && r.hasWarnings);

  console.log('\n');
  log(`Total Tests: ${results.length}`, 'bold');
  log(`✅ Passed: ${passed.length} (${Math.round(passed.length / results.length * 100)}%)`, 'green');
  log(`⚠️  With Warnings: ${withWarnings.length}`, 'yellow');
  log(`❌ Failed: ${failed.length} (${Math.round(failed.length / results.length * 100)}%)`, failed.length > 0 ? 'red' : 'green');

  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(r => {
      log(`   • ${r.name}`, 'red');
      if (r.error) log(`     Error: ${r.error}`, 'red');
    });
  }

  if (withWarnings.length > 0) {
    console.log('\n⚠️  Tests with Warnings:');
    withWarnings.forEach(r => {
      log(`   • ${r.name} (${r.warningCount} warning${r.warningCount > 1 ? 's' : ''})`, 'yellow');
    });
  }

  // Average confidence
  const avgConfidence = results
    .filter(r => r.confidence !== undefined)
    .reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.confidence !== undefined).length;

  console.log('\n📈 Statistics:');
  log(`   Average Confidence: ${Math.round(avgConfidence)}%`, avgConfidence >= 70 ? 'green' : 'yellow');

  console.log('\n' + '='.repeat(80));

  if (failed.length === 0) {
    log('🎉 ALL TESTS PASSED!', 'green');
    log('✅ System is ready for deployment', 'green');
    process.exit(0);
  } else {
    log('⚠️  SOME TESTS FAILED', 'red');
    log(`   ${failed.length} test${failed.length > 1 ? 's' : ''} need attention`, 'red');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Unhandled error:');
  console.error(error);
  process.exit(1);
});
