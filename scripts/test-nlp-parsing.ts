/**
 * Test NLP Parser directly
 * Tests natural language parsing for new actions
 */

// Load environment variables from .env.local
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex);
        const value = trimmed.slice(eqIndex + 1);
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

import { parseCommand } from '../lib/command/parser';

// Test results tracking
const results: { test: string; passed: boolean; details: string }[] = [];

function logTest(test: string, passed: boolean, details: string = '') {
  results.push({ test, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}${details ? `: ${details}` : ''}`);
}

async function runTests() {
  console.log('\n========================================');
  console.log('TESTING NLP PARSER');
  console.log('========================================\n');

  // Test 1: Meeting natural language
  console.log('--- Meeting Natural Language ---');
  {
    const result = await parseCommand('Demo with Acme went great, discussed pricing');
    logTest('NLP: Demo meeting',
      result.success && (result.parsed?.action === 'LOG_MEETING' || result.parsed?.action === 'LOG_ACTIVITY'),
      `action=${result.parsed?.action}, org=${result.parsed?.org_name}`
    );
  }

  {
    const result = await parseCommand('45 min call with TechCorp about implementation timeline');
    logTest('NLP: Call with duration',
      result.success && (result.parsed?.action === 'LOG_MEETING' || result.parsed?.action === 'LOG_ACTIVITY'),
      `action=${result.parsed?.action}, org=${result.parsed?.org_name}`
    );
  }

  {
    const result = await parseCommand('Meeting with CloudSoft - they loved the product');
    logTest('NLP: Meeting positive',
      result.success && result.parsed?.org_name?.toLowerCase().includes('cloudsoft'),
      `action=${result.parsed?.action}, org=${result.parsed?.org_name}`
    );
  }

  // Test 2: Deal note natural language
  console.log('\n--- Deal Note Natural Language ---');
  {
    const result = await parseCommand('Deal note for Acme: Budget approved by CFO');
    logTest('NLP: Deal note explicit',
      result.success && (result.parsed?.action === 'ADD_DEAL_NOTE' || result.parsed?.action === 'ADD_NOTE'),
      `action=${result.parsed?.action}`
    );
  }

  {
    const result = await parseCommand('Deal update: TechCorp contract signed');
    logTest('NLP: Deal update',
      result.success,
      `action=${result.parsed?.action}, org=${result.parsed?.org_name}`
    );
  }

  // Test 3: Follow-up natural language
  console.log('\n--- Follow-up Natural Language ---');
  {
    const result = await parseCommand('Follow up with Acme tomorrow about the proposal');
    logTest('NLP: Follow up',
      result.success && (result.parsed?.action === 'CREATE_FOLLOWUP' || result.parsed?.fields?.activity_type === 'follow_up'),
      `action=${result.parsed?.action}`
    );
  }

  {
    const result = await parseCommand('Remind me to call TechCorp next week');
    logTest('NLP: Remind me',
      result.success,
      `action=${result.parsed?.action}`
    );
  }

  {
    const result = await parseCommand('Task: Send pricing to CloudCo by Friday');
    logTest('NLP: Task',
      result.success,
      `action=${result.parsed?.action}`
    );
  }

  // Test 4: Activity natural language
  console.log('\n--- Activity Natural Language ---');
  {
    const result = await parseCommand('Called Acme for 20 minutes about implementation');
    logTest('NLP: Called',
      result.success && (result.parsed?.action === 'LOG_MEETING' || result.parsed?.action === 'LOG_ACTIVITY'),
      `action=${result.parsed?.action}`
    );
  }

  {
    const result = await parseCommand('Sent pricing email to TechCorp');
    logTest('NLP: Email sent',
      result.success,
      `action=${result.parsed?.action}`
    );
  }

  // Test 5: Stakeholder natural language
  console.log('\n--- Stakeholder Natural Language ---');
  {
    const result = await parseCommand('Add Sarah as champion at Acme');
    logTest('NLP: Add champion',
      result.success && result.parsed?.action === 'CREATE_USER',
      `action=${result.parsed?.action}, influence=${result.parsed?.fields?.influence}`
    );
  }

  {
    const result = await parseCommand('John is the blocker at TechCorp');
    logTest('NLP: Identify blocker',
      result.success,
      `action=${result.parsed?.action}`
    );
  }

  // Test 6: Existing functionality still works
  console.log('\n--- Existing Functionality (Regression) ---');
  {
    const result = await parseCommand('John at Acme ran 5 queries yesterday');
    logTest('NLP: Query activity',
      result.success && result.parsed?.action === 'LOG_ACTIVITY',
      `action=${result.parsed?.action}, org=${result.parsed?.org_name}`
    );
  }

  {
    const result = await parseCommand('Acme deal won $50K');
    logTest('NLP: Deal won',
      result.success && result.parsed?.action === 'UPDATE_DEAL',
      `action=${result.parsed?.action}, value=${result.parsed?.fields?.deal_value}`
    );
  }

  {
    const result = await parseCommand('New trial with CloudSoft - $100K potential');
    logTest('NLP: New trial org',
      result.success && result.parsed?.action === 'CREATE_ORG',
      `action=${result.parsed?.action}, org=${result.parsed?.org_name}`
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
}

runTests().catch(console.error);
