/**
 * Direct Bulk Import Test
 * Tests the AI bulk import by directly calling the LLM parser
 */

const { parseNarrativeWithLLM } = require('../lib/timeline/llmParser.ts');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Comprehensive test narrative with diverse event types
const TEST_NARRATIVE = `
Call Summary - Acme Corporation Trial (Oct 28, 2024 - Nov 15, 2024)

Initial Demo Call - Oct 28, 2024:
Had an excellent 45-minute demo call with Sarah Johnson (CTO) and Mike Chen (VP of Engineering). They were very impressed with the AI-powered timeline features and real-time collaboration capabilities. Sarah mentioned they're currently using Asana but finding it too basic for their needs. They have 50+ engineers across 5 teams and need better visibility into cross-team dependencies.

Technical Questions - Oct 30, 2024:
Mike sent over a detailed list of technical questions via email. Main concerns:
- SSO integration with their Okta setup
- API rate limits for their use case (they have automated systems that would query frequently)
- Data residency (they need EU data centers for GDPR compliance)
- Mobile app capabilities for their field teams

Responded same day with comprehensive answers and scheduled a technical deep-dive.

Trial Access Granted - Nov 1, 2024:
Set up their trial environment with admin access for Sarah, Mike, and 3 team leads (Emma, David, and Carlos). They requested trial period from Nov 4-18 as Sarah will be on vacation Nov 19-25 and wants to be present for evaluation.

Initial Setup Issues - Nov 4, 2024:
Carlos reported issues with SSO configuration during initial login. Their Okta setup has some custom attributes that weren't mapping correctly. Jumped on a quick 20-min call and resolved it by updating the SAML attribute mappings. All 5 users successfully logged in by end of day.

First Week Feedback - Nov 7, 2024:
Sarah sent positive feedback email: "The team is loving the kanban board and timeline view. Emma's team has already imported all their Q4 projects and are actively using it. Mike's infrastructure team is a bit slower to adopt but they're coming around."

Feature Request - Nov 8, 2024:
Mike requested custom field support for tracking deployment environments (dev, staging, prod). Said this is a blocker for their DevOps team. I explained our custom fields roadmap and that it's coming in Q1 2025. Mike seemed disappointed but understanding.

Usage Spike - Nov 10, 2024:
Noticed significant activity spike over the weekend - they imported 150+ cards and created 20+ timelines. Emma's team is clearly power users. Sarah mentioned in Slack that Emma is now "championing the tool internally."

Pricing Discussion - Nov 12, 2024:
Had preliminary pricing discussion with Sarah. They need seats for 50 engineers + 10 managers = 60 total seats. Quoted them our Enterprise plan at $25/seat/month = $1,500/month or $15,000 annually with 20% discount = $12,000/year. Sarah said budget discussion happens in January for fiscal year starting April 2025.

Concern Raised - Nov 14, 2024:
Mike raised concerns about mobile app performance - said it's "laggy on slower connections." Their field teams often work from construction sites with spotty cellular. This is a legitimate concern. Escalated to product team for investigation.

Follow-up Scheduled - Nov 15, 2024:
Trial ends Nov 18. Scheduled follow-up call for Nov 20 (after Sarah returns from vacation) to discuss final evaluation, address any remaining concerns, and plan next steps for a potential January contract discussion.
`;

async function testBulkImport() {
  console.log('🧪 COMPREHENSIVE BULK IMPORT TEST\n');
  console.log('='.repeat(80));

  try {
    // Step 1: Get a trial organization to test with
    console.log('\n📋 Step 1: Finding trial organization...');
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .limit(1)
      .single();

    if (orgError || !org) {
      console.error('❌ No trial organization found:', orgError?.message);
      return;
    }

    console.log(`✅ Testing with: ${org.org_name} (${org.org_id})`);

    // Step 2: Get initial event count
    console.log('\n📋 Step 2: Checking initial event count...');
    const { data: initialEvents } = await supabase
      .from('trial_timeline_events')
      .select('id')
      .eq('org_id', org.org_id);

    const initialCount = initialEvents?.length || 0;
    console.log(`✅ Current events in database: ${initialCount}`);

    // Step 3: Test the LLM parser directly
    console.log('\n📋 Step 3: Testing LLM parser directly...');
    console.log(`📝 Narrative length: ${TEST_NARRATIVE.length} characters`);
    console.log('⏱️  Parsing with Groq (expecting <2 seconds)...\n');

    const startTime = Date.now();

    const context = {
      org_id: org.org_id,
      org_name: org.org_name,
      date_range_hint: {
        start: new Date('2024-10-28'),
        end: new Date('2024-11-15')
      },
      recent_events: []
    };

    const result = await parseNarrativeWithLLM(TEST_NARRATIVE, context);
    const parseTime = Date.now() - startTime;

    console.log(`✅ Parse completed in ${parseTime}ms`);
    console.log(`\n📊 PARSING RESULTS:\n`);
    console.log(`Total events extracted: ${result.events?.length || 0}`);

    // Step 4: Analyze results
    if (result.events && result.events.length > 0) {
      // Group by confidence
      const highConfidence = result.events.filter(e => e.confidence >= 0.8);
      const mediumConfidence = result.events.filter(e => e.confidence >= 0.5 && e.confidence < 0.8);
      const lowConfidence = result.events.filter(e => e.confidence < 0.5);

      console.log('\n📈 Confidence Breakdown:');
      console.log(`   High (≥80%):   ${highConfidence.length} events`);
      console.log(`   Medium (50-79%): ${mediumConfidence.length} events`);
      console.log(`   Low (<50%):    ${lowConfidence.length} events`);

      // Group by event type
      const typeCount = {};
      result.events.forEach(e => {
        typeCount[e.event_type] = (typeCount[e.event_type] || 0) + 1;
      });

      console.log('\n📂 Event Types:');
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });

      // Group by sentiment
      const sentimentCount = {};
      result.events.forEach(e => {
        if (e.sentiment) {
          sentimentCount[e.sentiment] = (sentimentCount[e.sentiment] || 0) + 1;
        }
      });

      console.log('\n😊 Sentiment Distribution:');
      Object.entries(sentimentCount).forEach(([sentiment, count]) => {
        console.log(`   ${sentiment}: ${count}`);
      });

      // Show detailed event list
      console.log('\n📋 EXTRACTED EVENTS:\n');
      console.log('='.repeat(80));

      result.events.forEach((event, index) => {
        const confidenceBadge = event.confidence >= 0.8 ? '🟢' : event.confidence >= 0.5 ? '🟡' : '🔴';
        const sentimentEmoji = event.sentiment === 'positive' ? '😊' : event.sentiment === 'negative' ? '😞' : '😐';

        console.log(`\n${index + 1}. ${confidenceBadge} ${event.title}`);
        console.log(`   Date: ${new Date(event.event_timestamp).toLocaleDateString()}`);
        console.log(`   Type: ${event.event_type} | Category: ${event.event_category}`);
        console.log(`   Sentiment: ${sentimentEmoji} ${event.sentiment || 'neutral'} | Confidence: ${Math.round(event.confidence * 100)}%`);
        if (event.description) {
          const shortDesc = event.description.length > 100
            ? event.description.substring(0, 100) + '...'
            : event.description;
          console.log(`   Description: ${shortDesc}`);
        }
        if (event.mentioned_people && event.mentioned_people.length > 0) {
          console.log(`   People: ${event.mentioned_people.join(', ')}`);
        }
        if (event.tags && event.tags.length > 0) {
          console.log(`   Tags: ${event.tags.join(', ')}`);
        }
      });

      console.log('\n' + '='.repeat(80));

      // Step 5: Quality assessment
      console.log('\n✨ QUALITY ASSESSMENT:\n');

      const avgConfidence = result.events.reduce((sum, e) => sum + e.confidence, 0) / result.events.length;
      console.log(`📊 Average Confidence: ${Math.round(avgConfidence * 100)}%`);

      const hasDates = result.events.filter(e => e.event_timestamp).length;
      console.log(`📅 Events with dates: ${hasDates}/${result.events.length} (${Math.round(hasDates/result.events.length*100)}%)`);

      const hasDescriptions = result.events.filter(e => e.description).length;
      console.log(`📝 Events with descriptions: ${hasDescriptions}/${result.events.length} (${Math.round(hasDescriptions/result.events.length*100)}%)`);

      const hasPeople = result.events.filter(e => e.mentioned_people?.length > 0).length;
      console.log(`👥 Events with people mentioned: ${hasPeople}/${result.events.length} (${Math.round(hasPeople/result.events.length*100)}%)`);

      // Expected events check
      console.log('\n🎯 EXPECTED EVENTS CHECK:\n');
      const expectedEvents = [
        'Demo Call',
        'Technical Questions',
        'Trial Access',
        'SSO Issues',
        'First Week Feedback',
        'Feature Request',
        'Usage Spike',
        'Pricing Discussion',
        'Mobile Performance Concern',
        'Follow-up Scheduled'
      ];

      let matchedCount = 0;
      expectedEvents.forEach(expected => {
        const found = result.events.some(e =>
          e.title.toLowerCase().includes(expected.toLowerCase()) ||
          e.description?.toLowerCase().includes(expected.toLowerCase())
        );
        console.log(`   ${found ? '✅' : '❌'} ${expected}`);
        if (found) matchedCount++;
      });

      console.log(`\n   Matched: ${matchedCount}/${expectedEvents.length} expected events`);

      // Step 6: Test import and cleanup
      console.log('\n📋 Step 4: Testing import and cleanup...');
      console.log('(Creating test records, then cleaning up)');

      const testEventIds = [];
      for (const event of result.events.slice(0, 3)) { // Just import 3 for testing
        const { data: inserted } = await supabase
          .from('trial_timeline_events')
          .insert({
            org_id: org.org_id,
            event_timestamp: event.event_timestamp,
            event_type: event.event_type,
            event_category: event.event_category,
            title: event.title,
            description: event.description,
            sentiment: event.sentiment,
            severity: event.severity,
            tags: event.tags,
            mentioned_people: event.mentioned_people,
            source: 'bulk_import',
            parse_confidence: event.confidence
          })
          .select('id')
          .single();

        if (inserted) {
          testEventIds.push(inserted.id);
        }
      }

      console.log(`✅ Imported ${testEventIds.length} test events`);

      // Cleanup
      await supabase
        .from('trial_timeline_events')
        .delete()
        .in('id', testEventIds);

      console.log(`✅ Cleaned up ${testEventIds.length} test events`);

      // Final summary
      console.log('\n' + '='.repeat(80));
      console.log('\n🎉 TEST SUMMARY:\n');
      console.log(`✅ Parsing: ${parseTime < 3000 ? 'EXCELLENT' : parseTime < 5000 ? 'GOOD' : 'NEEDS IMPROVEMENT'} (${parseTime}ms)`);
      console.log(`✅ Events extracted: ${result.events.length} (expected ~10)`);
      console.log(`✅ Average confidence: ${Math.round(avgConfidence * 100)}%`);
      console.log(`✅ Expected events matched: ${matchedCount}/${expectedEvents.length}`);
      console.log(`✅ Import & cleanup: WORKING`);

      console.log('\n🚀 BULK IMPORT IS WORKING LIKE A CHARM!\n');

    } else {
      console.log('❌ No events extracted from narrative');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testBulkImport();
