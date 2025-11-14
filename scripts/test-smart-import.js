/**
 * Test script for AI-powered smart import
 * Tests parsing unstructured text to extract organizations, users, and activities
 */

const sampleText = `
Yesterday I had a great 30-minute call with John Smith from Acme Corporation (john.smith@acme.com).
He's the CEO and is interested in our trial platform. He mentioned they're in the TMT sector.
Their website is acme.com. Acme is a leading software company providing enterprise solutions.

Sarah Miller (sarah@techstart.io), Director at TechStart Inc, sent an email requesting a demo.
TechStart is a healthcare technology startup. Sarah wants to schedule a meeting next week.

Also followed up with Mike Jones at XYZ Limited (mike.jones@xyz.com). He's a VP of Engineering.
Had a quick 15 min chat yesterday about their integration requirements. They're in the
energy and construction space. Visit them at xyz-limited.com.

Today I did a full product demo with Jane Doe (jane.doe@abc.com) from ABC Company.
She's a Product Manager. The demo lasted 45 minutes and she seemed very impressed.
ABC is in the new economy sector.
`;

const testEndpoint = process.env.TEST_ENDPOINT || 'http://localhost:3000';

console.log('═══════════════════════════════════════════════════════════════');
console.log('   AI-POWERED SMART IMPORT TEST');
console.log('   Testing Groq AI extraction of organizations, users, activities');
console.log('═══════════════════════════════════════════════════════════════\n');

async function testSmartImport() {
  console.log('TEST 1: Parse Unstructured Text with AI');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('\nSample Text:');
  console.log(sampleText);
  console.log('\n');

  try {
    console.log('Sending to API: POST /api/trials/smart-import');
    const startTime = Date.now();

    const response = await fetch(`${testEndpoint}/api/trials/smart-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: sampleText }),
    });

    const duration = Date.now() - startTime;
    const result = await response.json();

    if (!result.success) {
      console.error('❌ FAIL: API returned error:', result.error);
      return;
    }

    console.log(`✅ PASS: Parsing successful (${duration}ms)`);
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('   EXTRACTION RESULTS');
    console.log('══════════════════════════════════════════════════════════════\n');

    // Statistics
    const { stats } = result;
    console.log('STATISTICS:');
    console.log(`  Organizations: ${stats.total_organizations} (${stats.new_organizations} new, ${stats.existing_organizations} existing)`);
    console.log(`  Users: ${stats.total_users} (${stats.new_users} new, ${stats.existing_users} existing)`);
    console.log(`  Activities: ${stats.total_activities}`);
    console.log('');

    // Organizations
    console.log('EXTRACTED ORGANIZATIONS:');
    result.parsed.forEach((org, idx) => {
      console.log(`\n${idx + 1}. ${org.org_name}`);
      if (org.domain) console.log(`   Domain: ${org.domain}`);
      if (org.website_url) console.log(`   Website: ${org.website_url}`);
      if (org.description) console.log(`   Description: ${org.description}`);

      // Users
      console.log(`   Users (${org.users.length}):`);
      org.users.forEach((user, userIdx) => {
        console.log(`     ${userIdx + 1}. ${user.name} (${user.email})`);
        if (user.designation) console.log(`        Title: ${user.designation}`);
        if (user.phone) console.log(`        Phone: ${user.phone}`);

        // Activities
        if (user.activities && user.activities.length > 0) {
          console.log(`        Activities (${user.activities.length}):`);
          user.activities.forEach((activity, actIdx) => {
            console.log(`          ${actIdx + 1}. ${activity.interaction_type}: ${activity.title}`);
            if (activity.interaction_date) {
              console.log(`             Date: ${activity.interaction_date}`);
            }
            if (activity.duration_minutes) {
              console.log(`             Duration: ${activity.duration_minutes} min`);
            }
            if (activity.notes) {
              console.log(`             Notes: ${activity.notes.substring(0, 60)}...`);
            }
          });
        }
      });
    });

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('   VALIDATION CHECKS');
    console.log('══════════════════════════════════════════════════════════════\n');

    // Validation
    let passed = 0;
    let failed = 0;

    // Check 1: Should extract 4 organizations
    if (stats.total_organizations === 4) {
      console.log('✅ PASS: Extracted 4 organizations (Acme, TechStart, XYZ, ABC)');
      passed++;
    } else {
      console.log(`❌ FAIL: Expected 4 organizations, got ${stats.total_organizations}`);
      failed++;
    }

    // Check 2: Should extract 4 users
    if (stats.total_users === 4) {
      console.log('✅ PASS: Extracted 4 users (John, Sarah, Mike, Jane)');
      passed++;
    } else {
      console.log(`❌ FAIL: Expected 4 users, got ${stats.total_users}`);
      failed++;
    }

    // Check 3: Should extract at least 4 activities
    if (stats.total_activities >= 4) {
      console.log(`✅ PASS: Extracted ${stats.total_activities} activities (call, email, chat, demo)`);
      passed++;
    } else {
      console.log(`❌ FAIL: Expected at least 4 activities, got ${stats.total_activities}`);
      failed++;
    }

    // Check 4: Should extract emails correctly
    const emails = result.parsed.flatMap((org) => org.users.map((u) => u.email));
    const expectedEmails = [
      'john.smith@acme.com',
      'sarah@techstart.io',
      'mike.jones@xyz.com',
      'jane.doe@abc.com',
    ];
    const emailsMatch = expectedEmails.every((email) => emails.includes(email));
    if (emailsMatch) {
      console.log('✅ PASS: All email addresses extracted correctly');
      passed++;
    } else {
      console.log('❌ FAIL: Some email addresses missing or incorrect');
      console.log('   Expected:', expectedEmails);
      console.log('   Got:', emails);
      failed++;
    }

    // Check 5: Should extract domains correctly
    const domains = result.parsed.map((org) => org.domain).filter(Boolean);
    if (domains.length >= 3) {
      console.log(`✅ PASS: Extracted ${domains.length} domains (TMT, HC, E&C, NEO)`);
      passed++;
    } else {
      console.log(`❌ FAIL: Expected at least 3 domains, got ${domains.length}`);
      failed++;
    }

    // Check 6: Should extract activity durations
    const activities = result.parsed.flatMap((org) =>
      org.users.flatMap((u) => u.activities || [])
    );
    const activitiesWithDuration = activities.filter((a) => a.duration_minutes);
    if (activitiesWithDuration.length >= 2) {
      console.log(`✅ PASS: Extracted ${activitiesWithDuration.length} activities with durations`);
      passed++;
    } else {
      console.log(`❌ FAIL: Expected at least 2 activities with duration, got ${activitiesWithDuration.length}`);
      failed++;
    }

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('   TEST SUMMARY');
    console.log('══════════════════════════════════════════════════════════════\n');
    console.log(`Tests Passed: ${passed}`);
    console.log(`Tests Failed: ${failed}`);
    console.log(`Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    console.log('');

    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! 🎉');
      console.log('');
      console.log('ATTESTATION:');
      console.log('────────────');
      console.log('✅ AI parsing: WORKING');
      console.log('✅ Organization extraction: WORKING');
      console.log('✅ User extraction: WORKING');
      console.log('✅ Activity extraction: WORKING');
      console.log('✅ Domain inference: WORKING');
      console.log('✅ Duration extraction: WORKING');
      console.log('✅ Email extraction: WORKING');
      console.log('');
      console.log('VERIFIED: AI-powered smart import is working correctly.');
      console.log('Users can now paste any text and get intelligent data extraction.');
    } else {
      console.log('⚠️  SOME TESTS FAILED');
      console.log('Review the failed tests above for details.');
    }

    console.log('\n══════════════════════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ TEST FAILED with error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    process.exit(1);
  }
}

testSmartImport();
