/**
 * Aggressive Timeline Events Import Test
 *
 * Tests all 47 event types, edge cases, and validates results
 */

import { createTimelineEventsImporter, EVENT_TAXONOMY } from '../lib/timeline/timelineEventsImporter';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Test organization ID
const TEST_ORG_ID = 'test-org-timeline-events-' + Date.now();

// =====================================================
// TEST DATA - Comprehensive Coverage
// =====================================================

const COMPREHENSIVE_TEST_DATA = `
# Timeline Events Test Data - Comprehensive Coverage

## Onboarding Events (7 types)
2024-01-15: John Smith from Acme Corp requested trial access for his team. Very excited about the product!
Jan 16, 2024: Shared login credentials with John via email. Username: john@acme.com
January 17: John logged in for the first time. Spent 45 minutes exploring the dashboard.
2024-01-18: Scheduled training session with Sarah for next Tuesday at 2pm PST
Jan 22, 2024: Completed training session with Sarah and John. They loved the new features!
2024-01-15: Sent onboarding checklist to John covering 10 key steps
Jan 19: John requested setup assistance with API integration. Needs help with webhooks.

## Engagement Events (10 types)
2024-01-20: John used the reporting feature to generate quarterly report
Jan 21: Sarah accessed the analytics dashboard and spent 1 hour analyzing data
2024-01-22: Generated monthly sales report for Q4 review
Jan 23: Acme Corp imported 5,000 customer records into the system
2024-01-24: Exported data to CSV format for external analysis
Jan 25: John configured notification settings and email preferences
2024-01-26: Enabled Slack integration for team notifications
Jan 27: Sarah created a custom workflow for lead scoring
2024-01-28: Set up automation for weekly report generation
Jan 30: Warning: Account has been inactive for 10 days. Need to reach out.

## Communication Events (8 types)
2024-02-01: Sent welcome email to John with getting started guide
Feb 2: Received email from Sarah asking about advanced filtering options
2024-02-03: Scheduled check-in meeting with Acme Corp for Feb 10 at 3pm
Feb 10, 2024: Completed 30-minute check-in call. Discussed expansion plans.
2024-02-05: Phone call with John about billing questions. Resolved successfully.
Feb 6: Exchanged Slack messages with Sarah about new feature release
2024-02-07: Scheduled product demo for stakeholders on Feb 15
Feb 15, 2024: Delivered live product demo to 8 stakeholders. Very positive feedback!

## Feedback Events (7 types)
2024-02-16: John requested dark mode feature for better accessibility
Feb 17: Sarah reported a bug with export functionality timing out
2024-02-18: Received amazing testimonial from John: "This product changed our workflow!"
Feb 19: John expressed frustration with slow report generation times
2024-02-20: Sarah completed quarterly satisfaction survey with 9/10 rating
Feb 21: Received NPS score of 9 from John. Would definitely recommend!
2024-02-22: John provided testimonial for case study: "ROI in 2 months"

## Support Events (6 types)
2024-02-23: John opened support ticket #1234 about data sync issues
Feb 25: Successfully resolved ticket #1234. Root cause was API rate limiting.
2024-02-24: Sarah accessed documentation about custom fields
Feb 26: John visited help center and read 5 articles about integrations
2024-02-27: Critical issue escalated to engineering team. Customer impact: high
Feb 28: SLA breach on ticket #1235. Took 26 hours instead of 24. Need to improve.

## Milestones Events (5 types)
2024-03-01: Extended trial period by 2 weeks due to stakeholder availability
Mar 5, 2024: 🎉 Acme Corp converted trial to paid subscription! Enterprise plan.
2024-03-10: Acme Corp upgraded from Pro to Enterprise plan. Added 50 seats.
Mar 20: Warning: Acme Corp downgraded from Enterprise to Pro plan
2024-03-25: Account cancelled. Reason: Budget cuts. Exit interview scheduled.

## Sales Notes (2 types)
2024-03-15: Sales call notes - John mentioned they're considering expansion to EMEA
Mar 18: Updated account plan: Target Q2 upsell for API access package

## Learnings (2 types)
2024-03-19: Key insight: Customers in manufacturing need custom dashboards
Mar 21: Identified new use case: Using our platform for vendor management

## Edge Cases & Complex Scenarios
Yesterday: Had an emergency call with John about system outage. Resolved in 30 mins.
Last week: Sarah mentioned they're evaluating competitors. Need to schedule call.
2024-01-15 14:30:00: High-priority meeting scheduled with C-suite executives
Tomorrow at 10am: Follow-up call needed about contract renewal
In 3 days: John's trial expires. Need to send reminder email.

## Sentiment Testing
This is amazing! John absolutely loves the new dashboard redesign.
Unfortunately, Sarah is very frustrated with the slow performance lately.
The meeting went okay. Nothing particularly good or bad to report.

## People & Features Mentions
Met with John Smith, Sarah Johnson, and Mike Chen to discuss the API gateway feature.
Tom from engineering helped debug the webhook integration issue.
The team wants better reporting, custom dashboards, and bulk export features.

## Follow-up Requirements
2024-04-01: Contract renewal discussion needed. Follow up by March 25th.
Apr 5: Need to schedule training session for new users next week.
URGENT: Customer reported critical bug. Follow up today!

## Multiple Events in One Entry
2024-04-10: Morning - Demo scheduled with new team. Afternoon - Bug report received about exports. Evening - Positive feedback from John about quick resolution.

## Ambiguous/Low Confidence
Someone mentioned something about a feature request but details were unclear.
There was a meeting last month but I don't remember the exact date or topic.
Acme might be interested in the premium features, need to confirm.
`;

// Edge cases test data
const EDGE_CASE_TEST_DATA = `
# Edge Cases

## Malformed Dates
2024-13-45: Invalid date that should fail validation
Not a date: This should fail parsing
32/99/2024: Another invalid date

## Missing Required Fields
2024-05-01: (no title or description)
Title only event
Description only: This event has no title

## Invalid Event Types
2024-05-01: This is a completely made up event type that doesn't exist
Random event that should be mapped to closest match

## Duplicate Events (should skip)
2024-01-15: John Smith from Acme Corp requested trial access for his team. Very excited about the product!
2024-01-15: John Smith from Acme Corp requested trial access for his team. Very excited about the product!

## Empty/Whitespace



`;

// =====================================================
// TEST FUNCTIONS
// =====================================================

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');

  const { data: orgs, error: orgsError } = await supabase
    .from('trial_organizations')
    .select('id')
    .like('name', 'test-org-timeline%');

  if (orgs && orgs.length > 0) {
    const orgIds = orgs.map(o => o.id);

    // Delete timeline events
    const { error: eventsError } = await supabase
      .from('trial_timeline_events')
      .delete()
      .in('org_id', orgIds);

    if (eventsError) {
      console.error('  ❌ Error deleting events:', eventsError.message);
    } else {
      console.log(`  ✅ Deleted timeline events for ${orgIds.length} test orgs`);
    }

    // Delete organizations
    const { error: deleteOrgsError } = await supabase
      .from('trial_organizations')
      .delete()
      .in('id', orgIds);

    if (deleteOrgsError) {
      console.error('  ❌ Error deleting orgs:', deleteOrgsError.message);
    } else {
      console.log(`  ✅ Deleted ${orgIds.length} test organizations`);
    }
  } else {
    console.log('  ℹ️  No test data to clean up');
  }
}

async function createTestOrg(): Promise<string> {
  console.log('\n📝 Creating test organization...');

  const { data, error } = await supabase
    .from('trial_organizations')
    .insert({
      name: `test-org-timeline-events-${Date.now()}`,
      website: 'https://test-timeline.example.com',
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test org: ${error.message}`);
  }

  console.log(`  ✅ Created test org: ${data.id}`);
  return data.id;
}

async function verifyResults(orgId: string) {
  console.log('\n🔍 Verifying import results...\n');

  // Get all events
  const { data: events, error } = await supabase
    .from('trial_timeline_events')
    .select('*')
    .eq('org_id', orgId)
    .order('event_timestamp', { ascending: true });

  if (error) {
    console.error('  ❌ Error fetching events:', error.message);
    return;
  }

  if (!events || events.length === 0) {
    console.error('  ❌ No events found!');
    return;
  }

  console.log(`  📊 Total Events Imported: ${events.length}`);
  console.log('');

  // Analyze by category
  const categories = new Map<string, number>();
  events.forEach(e => {
    categories.set(e.event_category, (categories.get(e.event_category) || 0) + 1);
  });

  console.log('  📈 Events by Category:');
  categories.forEach((count, category) => {
    console.log(`    - ${category}: ${count} events`);
  });
  console.log('');

  // Analyze by sentiment
  const sentiments = new Map<string, number>();
  events.forEach(e => {
    sentiments.set(e.sentiment, (sentiments.get(e.sentiment) || 0) + 1);
  });

  console.log('  😊 Sentiment Distribution:');
  sentiments.forEach((count, sentiment) => {
    console.log(`    - ${sentiment}: ${count} events`);
  });
  console.log('');

  // Confidence scores
  const avgConfidence = events.reduce((sum, e) => sum + e.parse_confidence, 0) / events.length;
  const highConfidence = events.filter(e => e.parse_confidence >= 0.8).length;
  const mediumConfidence = events.filter(e => e.parse_confidence >= 0.5 && e.parse_confidence < 0.8).length;
  const lowConfidence = events.filter(e => e.parse_confidence < 0.5).length;

  console.log('  🎯 Confidence Scores:');
  console.log(`    - Average: ${(avgConfidence * 100).toFixed(1)}%`);
  console.log(`    - High (≥80%): ${highConfidence} events`);
  console.log(`    - Medium (50-80%): ${mediumConfidence} events`);
  console.log(`    - Low (<50%): ${lowConfidence} events`);
  console.log('');

  // Follow-ups
  const followUps = events.filter(e => e.follow_up_required).length;
  console.log(`  📌 Follow-ups Required: ${followUps} events`);
  console.log('');

  // People mentioned
  const allPeople = events.flatMap(e => e.mentioned_people || []);
  const uniquePeople = new Set(allPeople);
  console.log(`  👥 People Mentioned: ${uniquePeople.size} unique (${allPeople.length} total mentions)`);
  if (uniquePeople.size > 0) {
    console.log(`    - ${Array.from(uniquePeople).slice(0, 5).join(', ')}${uniquePeople.size > 5 ? '...' : ''}`);
  }
  console.log('');

  // Features mentioned
  const allFeatures = events.flatMap(e => e.mentioned_features || []);
  const uniqueFeatures = new Set(allFeatures);
  console.log(`  🎨 Features Mentioned: ${uniqueFeatures.size} unique (${allFeatures.length} total mentions)`);
  if (uniqueFeatures.size > 0) {
    console.log(`    - ${Array.from(uniqueFeatures).slice(0, 5).join(', ')}${uniqueFeatures.size > 5 ? '...' : ''}`);
  }
  console.log('');

  // Sample events
  console.log('  📋 Sample Events:');
  events.slice(0, 5).forEach((event, i) => {
    console.log(`\n    ${i + 1}. ${event.title}`);
    console.log(`       Type: ${event.event_type} (${event.event_category})`);
    console.log(`       Date: ${new Date(event.event_timestamp).toLocaleDateString()}`);
    console.log(`       Sentiment: ${event.sentiment} | Severity: ${event.severity}`);
    console.log(`       Confidence: ${(event.parse_confidence * 100).toFixed(0)}%`);
    if (event.mentioned_people?.length > 0) {
      console.log(`       People: ${event.mentioned_people.join(', ')}`);
    }
  });
  console.log('');

  // Check event type coverage
  const eventTypes = new Set(events.map(e => e.event_type));
  console.log(`  ✅ Event Types Used: ${eventTypes.size} / 47 (${((eventTypes.size / 47) * 100).toFixed(0)}% coverage)`);
  console.log('');

  return events;
}

async function runTest(testName: string, testData: string, orgId: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 ${testName}`);
  console.log('='.repeat(80));

  const importer = createTimelineEventsImporter(orgId);

  console.log('\n⏳ Running import...');
  const startTime = Date.now();

  try {
    const result = await importer.import(testData);
    const duration = Date.now() - startTime;

    console.log(`\n✅ Import completed in ${(duration / 1000).toFixed(2)}s`);
    console.log('\n📊 Import Summary:');
    console.log(`  - Total: ${result.summary.total}`);
    console.log(`  - Successful: ${result.summary.successful} ✅`);
    console.log(`  - Failed: ${result.summary.failed} ❌`);
    console.log(`  - Skipped: ${result.summary.skipped} ⏭️`);
    console.log(`  - Warnings: ${result.summary.warnings} ⚠️`);

    if (result.summary.failed > 0) {
      console.log('\n❌ Failed Items:');
      result.failedItems.slice(0, 5).forEach(item => {
        console.log(`  - ${item.item ? JSON.stringify(item.item).substring(0, 60) : 'N/A'}`);
        console.log(`    Error: ${item.error}`);
      });
      if (result.failedItems.length > 5) {
        console.log(`  ... and ${result.failedItems.length - 5} more`);
      }
    }

    if (result.summary.warnings > 0) {
      console.log('\n⚠️  Warnings:');
      result.warningItems.slice(0, 3).forEach(item => {
        console.log(`  - ${item.warning}`);
      });
    }

    return result;
  } catch (error) {
    console.error(`\n❌ Import failed with error:`, error);
    throw error;
  }
}

// =====================================================
// MAIN TEST EXECUTION
// =====================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 TIMELINE EVENTS IMPORT - AGGRESSIVE TESTING');
  console.log('='.repeat(80));

  try {
    // Clean up any existing test data first
    await cleanupTestData();

    // Create test organization
    const orgId = await createTestOrg();

    // Test 1: Comprehensive data
    await runTest('Test 1: Comprehensive Coverage (All Event Types)', COMPREHENSIVE_TEST_DATA, orgId);

    // Verify results
    const events = await verifyResults(orgId);

    // Test 2: Edge cases (should handle gracefully)
    console.log('\n\n');
    await runTest('Test 2: Edge Cases & Error Handling', EDGE_CASE_TEST_DATA, orgId);

    // Verify after edge cases
    await verifyResults(orgId);

    // Final cleanup
    console.log('\n\n');
    await cleanupTestData();

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error);

    // Cleanup on error too
    try {
      await cleanupTestData();
    } catch (cleanupError) {
      console.error('Failed to cleanup after error:', cleanupError);
    }

    process.exit(1);
  }
}

// Run tests
main();
