import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface FlowTestResult {
  flow: string;
  success: boolean;
  output: string;
  duration: number;
}

async function runTest(testFile: string, flowName: string): Promise<FlowTestResult> {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Running ${flowName} Tests...`);
  console.log('='.repeat(80) + '\n');

  try {
    const { stdout, stderr } = await execAsync(`npx tsx ${testFile}`);
    const duration = Date.now() - startTime;
    const output = stdout + stderr;

    // Check if all tests passed (looking for success indicators)
    const success = output.includes('All') &&
                   output.includes('passed') &&
                   !output.includes('❌ Failed:') &&
                   !output.includes('FAIL');

    console.log(output);

    return {
      flow: flowName,
      success,
      output,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error running ${flowName} tests:`, error.message);

    return {
      flow: flowName,
      success: false,
      output: error.stdout || error.message,
      duration
    };
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + '🚀 COMPREHENSIVE FLOW TESTING' + ' '.repeat(29) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');
  console.log('Testing all major application flows...\n');

  const tests = [
    { file: 'scripts/test-trial-orgs-flow.ts', name: 'Trial Organizations' },
    { file: 'scripts/test-tickets-flow.ts', name: 'Tickets' },
    { file: 'scripts/test-roadmap-flow.ts', name: 'Roadmap' },
    { file: 'scripts/test-resources-flow.ts', name: 'Resources/Documents' }
  ];

  const results: FlowTestResult[] = [];
  const overallStartTime = Date.now();

  // Run each test sequentially
  for (const test of tests) {
    const result = await runTest(test.file, test.name);
    results.push(result);
  }

  const overallDuration = Date.now() - overallStartTime;

  // Print comprehensive summary
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(25) + '📊 FINAL TEST SUMMARY' + ' '.repeat(32) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');

  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const durationStr = `${(result.duration / 1000).toFixed(2)}s`;
    console.log(`${index + 1}. ${result.flow.padEnd(30)} ${status.padEnd(10)} ${durationStr}`);
  });

  console.log('\n' + '-'.repeat(80) + '\n');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`Total Flows Tested: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Total Duration: ${(overallDuration / 1000).toFixed(2)}s`);

  console.log('\n' + '='.repeat(80) + '\n');

  if (failedTests === 0) {
    console.log('🎉 ALL FLOWS PASSED! Your application is working correctly.\n');
    console.log('✨ Key Features Verified:');
    console.log('   • Trial Organizations - Create, Read, Update, Filter');
    console.log('   • Tickets - Creation, Comments, Status Updates');
    console.log('   • Roadmap - Items, Priorities, Quarters');
    console.log('   • Resources - Documents, Categories, Search\n');
  } else {
    console.log('⚠️  SOME TESTS FAILED\n');
    console.log('Failed Flows:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ❌ ${r.flow}`);
    });
    console.log('\nPlease review the detailed output above for each failed test.\n');
  }

  console.log('='.repeat(80) + '\n');

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run all tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
