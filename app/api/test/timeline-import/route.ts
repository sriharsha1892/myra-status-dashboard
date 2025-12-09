/**
 * API Route for Testing Timeline Events Import
 *
 * Usage: POST /api/test/timeline-import
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTimelineEventsImporter } from '@/lib/timeline/timelineEventsImporter';
import { createClient } from '@supabase/supabase-js';

// Test data
const COMPREHENSIVE_TEST_DATA = `
# Timeline Events Test Data

## Onboarding Events
2024-01-15: John Smith from Acme Corp requested trial access for his team. Very excited!
Jan 16, 2024: Shared login credentials with John via email.
January 17: John logged in for the first time and explored dashboard.
2024-01-18: Scheduled training session with Sarah for next Tuesday at 2pm
Jan 22, 2024: Completed training with Sarah and John. They loved it!
2024-01-15: Sent onboarding checklist to John
Jan 19: John requested setup assistance with API integration.

## Engagement Events
2024-01-20: John used the reporting feature to generate quarterly report
Jan 21: Sarah accessed the analytics dashboard
2024-01-22: Generated monthly sales report
Jan 23: Imported 5,000 customer records into system
2024-01-24: Exported data to CSV for analysis
Jan 25: Configured notification settings
2024-01-26: Enabled Slack integration
Jan 27: Created custom workflow for lead scoring
2024-01-28: Set up automation for weekly reports
Jan 30: Account inactive for 10 days

## Communication Events
2024-02-01: Sent welcome email to John
Feb 2: Received email from Sarah about filtering
2024-02-03: Scheduled check-in meeting for Feb 10
Feb 10, 2024: Completed check-in call about expansion
2024-02-05: Phone call with John about billing
Feb 6: Slack messages with Sarah about features
2024-02-07: Scheduled product demo for Feb 15
Feb 15, 2024: Demo to 8 stakeholders - great feedback!

## Feedback Events
2024-02-16: John requested dark mode feature
Feb 17: Bug reported about export timeout
2024-02-18: Amazing testimonial from John!
Feb 19: Frustration about slow reports
2024-02-20: Survey completed - 9/10 rating
Feb 21: NPS score of 9 received
2024-02-22: Testimonial for case study provided

## Support Events
2024-02-23: Support ticket opened about sync
Feb 25: Ticket resolved - rate limiting issue
2024-02-24: Accessed documentation
Feb 26: Visited help center articles
2024-02-27: Critical issue escalated
Feb 28: SLA breach - 26 hours vs 24 needed

## Milestones Events
2024-03-01: Trial extended by 2 weeks
Mar 5, 2024: 🎉 Converted to paid Enterprise!
2024-03-10: Upgraded to Enterprise - 50 seats
Mar 20: Downgraded to Pro plan
2024-03-25: Account cancelled - budget cuts

## Sales & Learnings
2024-03-15: Sales notes - expansion to EMEA
Mar 18: Updated account plan for Q2 upsell
2024-03-19: Insight: Manufacturing needs custom dashboards
Mar 21: New use case: vendor management

## Edge Cases
Yesterday: Emergency call about outage
Last week: Evaluating competitors
Tomorrow: Follow-up about renewal needed

## Sentiment Testing
This is amazing! John absolutely loves the new design.
Unfortunately, very frustrated with slow performance.
Meeting went okay, nothing special.

## People & Features
Met with John Smith, Sarah Johnson, and Mike Chen about API gateway.
Tom helped debug webhook integration.
Team wants better reporting, dashboards, and bulk export.
`;

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Starting Timeline Events Import Test...\n');

    // Get request body
    const body = await req.json().catch(() => ({}));
    const testData = body.testData || COMPREHENSIVE_TEST_DATA;
    const cleanup = body.cleanup !== false; // Default true

    // Create test org
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    console.log('📝 Creating test organization...');
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .insert({
        name: `test-timeline-${Date.now()}`,
        website: 'https://test.example.com',
        status: 'active',
      })
      .select()
      .single();

    if (orgError) {
      throw new Error(`Failed to create test org: ${orgError.message}`);
    }

    console.log(`✅ Test org created: ${org.id}\n`);

    // Run import
    console.log('⏳ Running import...');
    const importer = createTimelineEventsImporter(org.id);
    const startTime = Date.now();

    const result = await importer.import(testData);
    const duration = Date.now() - startTime;

    console.log(`\n✅ Import completed in ${(duration / 1000).toFixed(2)}s`);

    // Get imported events
    const { data: events, error: eventsError } = await supabase
      .from('trial_timeline_events')
      .select('*')
      .eq('org_id', org.id)
      .order('event_timestamp', { ascending: true });

    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }

    // Analysis
    const categories = new Map<string, number>();
    const sentiments = new Map<string, number>();
    const eventTypes = new Set<string>();
    let totalConfidence = 0;

    events?.forEach(e => {
      categories.set(e.event_category, (categories.get(e.event_category) || 0) + 1);
      sentiments.set(e.sentiment, (sentiments.get(e.sentiment) || 0) + 1);
      eventTypes.add(e.event_type);
      totalConfidence += e.parse_confidence;
    });

    const avgConfidence = events && events.length > 0 ? totalConfidence / events.length : 0;
    const allPeople = events?.flatMap(e => e.mentioned_people || []) || [];
    const uniquePeople = new Set(allPeople);
    const allFeatures = events?.flatMap(e => e.mentioned_features || []) || [];
    const uniqueFeatures = new Set(allFeatures);

    const analysis = {
      totalEvents: events?.length || 0,
      categories: Object.fromEntries(categories),
      sentiments: Object.fromEntries(sentiments),
      eventTypesUsed: eventTypes.size,
      eventTypesCoverage: `${eventTypes.size}/47 (${((eventTypes.size / 47) * 100).toFixed(0)}%)`,
      avgConfidence: `${(avgConfidence * 100).toFixed(1)}%`,
      peopleMentioned: uniquePeople.size,
      featuresMentioned: uniqueFeatures.size,
      followUpsRequired: events?.filter(e => e.follow_up_required).length || 0,
    };

    // Sample events
    const sampleEvents = events?.slice(0, 5).map(e => ({
      title: e.title,
      type: e.event_type,
      category: e.event_category,
      date: e.event_timestamp,
      sentiment: e.sentiment,
      severity: e.severity,
      confidence: `${(e.parse_confidence * 100).toFixed(0)}%`,
      people: e.mentioned_people,
      features: e.mentioned_features,
    }));

    // Cleanup if requested
    if (cleanup) {
      console.log('\n🧹 Cleaning up test data...');

      // Delete events
      await supabase
        .from('trial_timeline_events')
        .delete()
        .eq('org_id', org.id);

      // Delete org
      await supabase
        .from('trial_organizations')
        .delete()
        .eq('id', org.id);

      console.log('✅ Cleanup complete');
    }

    // Return results
    return NextResponse.json({
      success: true,
      testOrgId: org.id,
      duration: `${(duration / 1000).toFixed(2)}s`,
      importSummary: result.summary,
      analysis,
      sampleEvents,
      allEvents: cleanup ? undefined : events,
      cleanedUp: cleanup,
    });

  } catch (error: any) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Timeline Events Import Test API',
    usage: 'POST to this endpoint to run tests',
    options: {
      testData: 'Custom test data (optional)',
      cleanup: 'Whether to cleanup test data (default: true)',
    },
  });
}
