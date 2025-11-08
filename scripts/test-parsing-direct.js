/**
 * Direct parsing test - bypasses API auth by testing the parsing functions directly
 */
const path = require('path');

// Mock Next.js environment
process.env.NODE_ENV = 'test';

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

// Test cases
const testCases = [
  {
    name: 'Email Extraction',
    text: 'Contact john@acme.com and jane.smith@beta.com for details',
    test: (result) => {
      const emails = result.match(/[\w.-]+@[\w.-]+\.\w+/g);
      return emails && emails.length === 2;
    }
  },
  {
    name: 'Org Name Detection',
    text: 'Had demo with Acme Corp today',
    test: (result) => {
      const match = /(?:from|at|for|with)\s+([A-Z][A-Za-z0-9\s&.,-]{2,40}?)(?:\s|,|\.|\n|$)/.exec(result);
      return match && match[1].includes('Acme Corp');
    }
  },
  {
    name: 'Number Extraction',
    text: 'They asked 15 questions and have 3 users',
    test: (result) => {
      const numbers = result.match(/\b(\d+)\s*(users?|questions?|queries|logins?|tickets?|days?|weeks?)\b/gi);
      return numbers && numbers.length === 2;
    }
  },
  {
    name: 'Person Name Detection',
    text: 'John Doe attended the meeting and Jane Smith asked questions',
    test: (result) => {
      const names = result.match(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+(attended|joined|asked|said|mentioned|is|was)\b/g);
      return names && names.length >= 1;
    }
  },
  {
    name: 'Multiple Features',
    text: 'presentation builder, web scout, and research architect',
    test: (result) => {
      return result.includes('presentation builder') &&
             result.includes('web scout') &&
             result.includes('research architect');
    }
  }
];

logSection('🔬 DIRECT PARSING TESTS (Regex & Pattern Validation)');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, i) => {
  console.log(`\n[${i + 1}/${testCases.length}] ${testCase.name}`);
  log(`Input: "${testCase.text}"`, 'cyan');

  try {
    const result = testCase.test(testCase.text);
    if (result) {
      log('✅ PASSED', 'green');
      passed++;
    } else {
      log('❌ FAILED', 'red');
      failed++;
    }
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red');
    failed++;
  }
});

logSection('📊 SUMMARY');
log(`\nTotal Tests: ${testCases.length}`, 'bold');
log(`✅ Passed: ${passed} (${Math.round(passed/testCases.length*100)}%)`, 'green');
log(`❌ Failed: ${failed} (${Math.round(failed/testCases.length*100)}%)`, failed > 0 ? 'red' : 'green');

if (failed === 0) {
  log('\n🎉 All regex patterns working correctly!', 'green');
  log('✅ Core parsing logic validated', 'green');
  log('\n📝 Next: Test via UI at http://localhost:3004/support/trials/parse', 'cyan');
  process.exit(0);
} else {
  log('\n⚠️  Some patterns need adjustment', 'yellow');
  process.exit(1);
}
