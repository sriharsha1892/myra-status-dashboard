const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Test scenarios with diverse datasets
const testScenarios = [
  {
    name: 'Scenario 1: Enterprise Deal (High Value)',
    text: `Had an incredible meeting with TEST-GlobalTech Enterprise (globaltech-test.com) today. This could be our biggest deal this quarter!

ATTENDEES:
- Robert Chen (robert.chen@globaltech-test.com, +1-415-555-9001) - Chief Technology Officer
- Maria Santos (maria.santos@globaltech-test.com, +1-415-555-9002) - VP of Engineering
- David Park - Head of AI/ML Division

BUSINESS DETAILS:
- Looking at $2.5M annual contract
- Team of 250 engineers across 5 global offices (SF, London, Singapore, Tokyo, NYC)
- Want to start with 30 day trial to evaluate across all teams
- Budget already approved by CFO

MEETING HIGHLIGHTS:
- Gave comprehensive product demo - they loved our presentation builder
- Technical deep-dive with David on AI models integration
- Pricing discussion - Maria has authority to sign
- Scheduled follow-up for contract review next Monday

They're evaluating us against 2 competitors but Robert said we're "clearly ahead". Very hot enterprise opportunity!`,
    sourceType: 'meeting_notes',
    expected: {
      org: 'TEST-GlobalTech Enterprise',
      contractValue: 2500000,
      teamSize: 250,
      trialDuration: 30,
      userCount: 3,
      activityCount: 4
    }
  },
  {
    name: 'Scenario 2: SMB Quick Win (Low Value)',
    text: `Quick email follow-up from TEST-StartupCo (startupc-test.io):

Hi team,

Just had a brief chat with Jake Miller (jake@startupc-test.io, +1-650-555-2001) - founder of a small startup.

They're interested in:
- $8K annual plan
- Just 5 users total
- Looking for 7 day trial to test with their team
- Want to get started this week

Super straightforward deal - gave him a quick demo yesterday. He's ready to sign if the trial goes well.

Thanks,
Sales Team`,
    sourceType: 'email',
    expected: {
      org: 'TEST-StartupCo',
      contractValue: 8000,
      teamSize: 5,
      trialDuration: 7,
      userCount: 1,
      activityCount: 1
    }
  },
  {
    name: 'Scenario 3: Mid-Market Standard',
    text: `CALL SUMMARY - TEST-FinTech Solutions (fintech-test.com)

Date: Today
Duration: 45 minutes

Participants:
- Sarah Johnson (sarah.j@fintech-test.com, +1-212-555-3001) - VP of Product
- Marcus Rodriguez (marcus.r@fintech-test.com, +1-212-555-3002) - Engineering Lead
- Lisa Chen - Product Manager (no phone yet)

Discussion Points:
1. Product Demo - showed presentation builder and web scout features
   - They asked 12 detailed questions about AI integration
   - Very impressed with Claude and GPT-4 support

2. Business Terms:
   - Negotiated $125K annual contract
   - Team of 47 engineers will be using the platform
   - Standard 14 day trial period requested
   - Need pricing proposal by Friday

3. Next Steps:
   - Technical integration call scheduled for next Tuesday
   - Send contract draft by end of week
   - Follow-up demo for executive team next month

Marcus mentioned they're currently using our competitor but unhappy with reliability. Strong opportunity to win this account!`,
    sourceType: 'call_summary',
    expected: {
      org: 'TEST-FinTech Solutions',
      contractValue: 125000,
      teamSize: 47,
      trialDuration: 14,
      userCount: 3,
      activityCount: 3
    }
  },
  {
    name: 'Scenario 4: Alternative Formats',
    text: `Meeting notes for TEST-DataCorp Analytics:

Company: TEST-DataCorp Analytics (datacorp-test.ai)

Key Contacts:
- Alex Thompson, CTO (alex.thompson@datacorp-test.ai) - mobile: 555.3101
- Jamie Lee, Director of ML (jamie@datacorp-test.ai) - phone: (408) 555-3102
- Chris Patel, Senior Engineer (c.patel@datacorp-test.ai)

Business Terms:
- 100K ARR deal (annual recurring revenue)
- They have a team of 23 data scientists
- Looking for 2 weeks trial to evaluate (need to convert to days)
- Want to pilot with 15 users first, then scale

Meeting Flow:
- Initial product demo went great
- Asked about GPT-4 and Claude integration
- Discussed pricing and volume discounts
- Scheduled follow-up technical call

They're moving fast - want to make decision within 2 weeks.`,
    sourceType: 'meeting_notes',
    expected: {
      org: 'TEST-DataCorp Analytics',
      contractValue: 100000,
      teamSize: 23,
      trialDuration: 14, // 2 weeks = 14 days
      userCount: 3,
      activityCount: 2
    }
  },
  {
    name: 'Scenario 5: Minimal Information',
    text: `Brief note on TEST-MinimalCo:

Just spoke with Emma Wilson (emma.w@minimalco-test.com) from TEST-MinimalCo.

She's interested in trying our platform. Gave her a quick demo over Zoom.

That's all I have for now - will follow up to get more details.`,
    sourceType: 'email',
    expected: {
      org: 'TEST-MinimalCo',
      contractValue: null, // No contract mentioned
      teamSize: null, // No team size mentioned
      trialDuration: null, // No duration mentioned
      userCount: 1,
      activityCount: 1
    }
  },
  {
    name: 'Scenario 6: Complex Multi-Contact',
    text: `COMPREHENSIVE MEETING NOTES - TEST-MegaCorp Industries

Company: TEST-MegaCorp Industries (megacorp-test.com)
Website: https://megacorp-test.com

Attendees (5 people):
1. Jennifer Walsh (jennifer.walsh@megacorp-test.com, +1-650-555-4001) - VP of Technology
2. Michael Chang (m.chang@megacorp-test.com, +1-650-555-4002) - Director of Engineering
3. Priya Sharma (priya.s@megacorp-test.com, +1-650-555-4003) - Lead Architect
4. Tom Anderson (tom.anderson@megacorp-test.com, +1-650-555-4004) - Product Manager
5. Rachel Kim (rachel.kim@megacorp-test.com, +1-650-555-4005) - DevOps Lead

Business Details:
- $450K annual contract being discussed
- Team of 75 engineers across 3 locations
- Want 21 day trial to do thorough evaluation
- Budget approved by CFO last week

Activities Throughout Discussion:
1. Initial product demo (45 minutes)
2. Q&A session about AI models
3. Pricing negotiation with Jennifer
4. Technical deep-dive with Michael and Priya
5. Integration discussion with Rachel
6. Security and compliance review
7. Scheduled follow-up demo for next week
8. Contract review meeting set for Friday

This is a complex deal with many stakeholders. Everyone was engaged and asked great questions. Jennifer has final sign-off authority.

Status: Very promising, likely to close within 30 days.`,
    sourceType: 'meeting_notes',
    expected: {
      org: 'TEST-MegaCorp Industries',
      contractValue: 450000,
      teamSize: 75,
      trialDuration: 21,
      userCount: 5,
      activityCount: 8
    }
  },
  {
    name: 'Scenario 7: Different Phone Formats',
    text: `Phone format testing for TEST-PhoneTest Corp:

Company: TEST-PhoneTest Corp (phonetest.com)

Contacts with various phone formats:
- Alice Brown (alice@phonetest.com) - US Standard: +1-555-5001
- Bob Wilson (bob@phonetest.com) - US Parentheses: (415) 555-5002
- Carol Davis (carol@phonetest.com) - US Dots: 555.5003
- Dave Miller (dave@phonetest.com) - UK International: +44-20-1234-5678
- Eve Johnson (eve@phonetest.com) - Mobile: 650-555-5005

Business: $75K deal, team of 18, 14 day trial

Demo meeting yesterday was successful.`,
    sourceType: 'call_summary',
    expected: {
      org: 'TEST-PhoneTest Corp',
      contractValue: 75000,
      teamSize: 18,
      trialDuration: 14,
      userCount: 5,
      activityCount: 1
    }
  },
  {
    name: 'Scenario 8: Edge Cases',
    text: `Edge case testing for TEST-Very-Long-Company-Name-That-Tests-Character-Limits-And-Parsing:

Company: TEST-Very-Long-Company-Name-That-Tests-Character-Limits-And-Parsing (verylongname-test.com)

Contact: François Müller-O'Brien (francois.muller-obrien@verylongname-test.com, +33-1-23-45-67-89)
Title: Chargé d'affaires & Senior Architect

Numbers in text (testing ambiguity):
- Contract value: €250K (European currency)
- Also mentioned $275K USD equivalent
- Team size: 32 engineers (should extract this)
- Another number: 150 (referring to total company size, not team)
- Duration: 14 day trial

Special characters test: Company uses AI/ML, R&D, and IoT technologies.

Demo call was excellent. François asked about GPT-4 & Claude integration.`,
    sourceType: 'email',
    expected: {
      org: 'TEST-Very-Long-Company-Name-That-Tests-Character-Limits-And-Parsing',
      contractValue: 275000, // Should extract the USD value
      teamSize: 32, // Should extract team size, not total company
      trialDuration: 14,
      userCount: 1,
      activityCount: 1
    }
  }
];

async function testParse(scenario) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${scenario.name}`);
  console.log('='.repeat(80));

  try {
    const response = await fetch('http://localhost:3000/api/trials/parse-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: scenario.text,
        source_type: scenario.sourceType
      })
    });

    if (!response.ok) {
      throw new Error(`Parse API failed: ${response.statusText}`);
    }

    const result = await response.json();

    console.log('\n📊 EXTRACTION RESULTS:');
    console.log(`  Overall Confidence: ${result.confidence.overall}%`);
    console.log(`  Organizations found: ${result.parsed.orgs.length}`);
    console.log(`  Users found: ${result.parsed.users.length}`);
    console.log(`  Activities found: ${result.parsed.activities.length}`);
    console.log(`  Numbers extracted: ${result.parsed.numbers.length}`);

    // Check organization
    if (result.parsed.orgs.length > 0) {
      console.log(`\n✓ Organization: ${result.parsed.orgs[0].value}`);
      if (scenario.expected.org) {
        const match = result.parsed.orgs[0].value.includes(scenario.expected.org.split(' ')[0]);
        console.log(`  Expected: ${scenario.expected.org} - ${match ? '✓ MATCH' : '✗ MISMATCH'}`);
      }
    }

    // Check extracted numbers (contract, team, duration)
    const numbers = result.parsed.numbers;
    const contractVal = numbers.find(n => n.metadata?.source === 'contract_value');
    const teamSize = numbers.find(n => n.metadata?.source === 'team_size');
    const trialDuration = numbers.find(n => n.metadata?.source === 'trial_duration');

    console.log('\n💰 CONTRACT VALUE:');
    if (contractVal) {
      console.log(`  Extracted: $${contractVal.metadata.amount.toLocaleString()} (${contractVal.confidence}% confidence)`);
      if (scenario.expected.contractValue) {
        const match = contractVal.metadata.amount === scenario.expected.contractValue;
        console.log(`  Expected: $${scenario.expected.contractValue.toLocaleString()} - ${match ? '✓ MATCH' : '✗ MISMATCH'}`);
      }
    } else {
      console.log(`  Not extracted ${scenario.expected.contractValue ? '✗ EXPECTED' : '✓ OK (not in text)'}`);
    }

    console.log('\n👥 TEAM SIZE:');
    if (teamSize) {
      console.log(`  Extracted: ${teamSize.value} users (${teamSize.confidence}% confidence)`);
      if (scenario.expected.teamSize) {
        const match = parseInt(teamSize.value) === scenario.expected.teamSize;
        console.log(`  Expected: ${scenario.expected.teamSize} - ${match ? '✓ MATCH' : '✗ MISMATCH'}`);
      }
    } else {
      console.log(`  Not extracted ${scenario.expected.teamSize ? '✗ EXPECTED' : '✓ OK (not in text)'}`);
    }

    console.log('\n⏱️  TRIAL DURATION:');
    if (trialDuration) {
      console.log(`  Extracted: ${trialDuration.value} days (${trialDuration.confidence}% confidence)`);
      if (scenario.expected.trialDuration) {
        const match = parseInt(trialDuration.value) === scenario.expected.trialDuration;
        console.log(`  Expected: ${scenario.expected.trialDuration} days - ${match ? '✓ MATCH' : '✗ MISMATCH'}`);
      }
    } else {
      console.log(`  Not extracted ${scenario.expected.trialDuration ? '✗ EXPECTED' : '✓ OK (not in text)'}`);
    }

    // Check users
    console.log('\n👤 USERS EXTRACTED:');
    result.parsed.users.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.value}`);
      if (user.metadata?.email) console.log(`     Email: ${user.metadata.email}`);
      if (user.metadata?.phone) console.log(`     Phone: ${user.metadata.phone}`);
      if (user.metadata?.role) console.log(`     Role: ${user.metadata.role}`);
    });
    const userMatch = result.parsed.users.length >= scenario.expected.userCount;
    console.log(`  Expected: ${scenario.expected.userCount} - ${userMatch ? '✓ OK' : '✗ FEWER THAN EXPECTED'}`);

    // Check activities
    console.log('\n📅 ACTIVITIES EXTRACTED:');
    result.parsed.activities.forEach((activity, idx) => {
      console.log(`  ${idx + 1}. ${activity.value} (${activity.confidence}% confidence)`);
    });
    const activityMatch = result.parsed.activities.length >= scenario.expected.activityCount;
    console.log(`  Expected: ${scenario.expected.activityCount} - ${activityMatch ? '✓ OK' : '✗ FEWER THAN EXPECTED'}`);

    // Overall assessment
    console.log('\n🎯 SCENARIO RESULT:');
    const allChecks = [
      result.parsed.orgs.length > 0,
      contractVal ? contractVal.metadata.amount === scenario.expected.contractValue : !scenario.expected.contractValue,
      teamSize ? parseInt(teamSize.value) === scenario.expected.teamSize : !scenario.expected.teamSize,
      trialDuration ? parseInt(trialDuration.value) === scenario.expected.trialDuration : !scenario.expected.trialDuration,
      userMatch,
      activityMatch
    ];
    const passed = allChecks.filter(Boolean).length;
    const total = allChecks.length;
    console.log(`  ${passed}/${total} checks passed - ${passed === total ? '✅ PASS' : '⚠️  PARTIAL'}`);

    return { scenario: scenario.name, passed, total, result };
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    return { scenario: scenario.name, error: error.message };
  }
}

async function runAllTests() {
  console.log('\n🚀 STARTING COMPREHENSIVE PARSE TESTING');
  console.log('Testing 8 diverse scenarios to validate all extraction features\n');

  const results = [];

  for (const scenario of testScenarios) {
    const result = await testParse(scenario);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay between tests
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 COMPREHENSIVE TEST SUMMARY');
  console.log('='.repeat(80));

  const totalScenarios = results.length;
  const passedScenarios = results.filter(r => !r.error && r.passed === r.total).length;
  const partialScenarios = results.filter(r => !r.error && r.passed > 0 && r.passed < r.total).length;
  const failedScenarios = results.filter(r => r.error).length;

  console.log(`\nTotal Scenarios Tested: ${totalScenarios}`);
  console.log(`✅ Fully Passed: ${passedScenarios}`);
  console.log(`⚠️  Partially Passed: ${partialScenarios}`);
  console.log(`❌ Failed: ${failedScenarios}`);

  console.log('\n📋 DETAILED BREAKDOWN:');
  results.forEach((r, idx) => {
    if (r.error) {
      console.log(`  ${idx + 1}. ${r.scenario}: ❌ ERROR - ${r.error}`);
    } else {
      const status = r.passed === r.total ? '✅' : '⚠️';
      console.log(`  ${idx + 1}. ${r.scenario}: ${status} ${r.passed}/${r.total}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎉 TESTING COMPLETE!');
  console.log('='.repeat(80));

  if (passedScenarios === totalScenarios) {
    console.log('\n🌟 ALL SCENARIOS PASSED! The Parse & Extract tool is working perfectly.');
  } else if (passedScenarios + partialScenarios === totalScenarios) {
    console.log('\n⚠️  Some scenarios partially passed. Review extraction logic for edge cases.');
  } else {
    console.log('\n❌ Some scenarios failed. Review errors above.');
  }

  console.log('\nNext step: Review results and then run cleanup script to remove test data.');
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
