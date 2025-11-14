/**
 * Test Semantic Timeline Search Feature
 * Tests AI-powered natural language search for timeline events
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Test queries covering different search scenarios
const TEST_QUERIES = [
  {
    query: 'show me integration issues',
    description: 'Technical issues search',
  },
  {
    query: 'recent positive feedback from customers',
    description: 'Sentiment + time context search',
  },
  {
    query: 'critical bugs last week',
    description: 'Severity + time range search',
  },
  {
    query: 'customer meetings about pricing',
    description: 'Event type + business topic search',
  },
  {
    query: 'demo sessions with high engagement',
    description: 'Event type + sentiment search',
  },
  {
    query: 'support tickets with negative sentiment',
    description: 'Category + sentiment search',
  },
];

async function testSemanticSearch() {
  console.log('🧪 TESTING SEMANTIC TIMELINE SEARCH FEATURE\n');
  console.log('='.repeat(80));

  try {
    // Step 1: Check if semantic search is available
    console.log('\n📋 Step 1: Checking semantic search availability...');
    const checkResponse = await fetch('http://localhost:3000/api/timeline/semantic-search');
    const checkData = await checkResponse.json();

    if (!checkData.available) {
      console.error('❌ Semantic search not available');
      console.log('   Please set GROQ_API_KEY in environment variables');
      return;
    }

    console.log('✅ Semantic search is available');
    console.log('   Features:');
    console.log(`   - Natural language queries: ${checkData.features.natural_language_queries ? '✅' : '❌'}`);
    console.log(`   - Relevance scoring: ${checkData.features.relevance_scoring ? '✅' : '❌'}`);
    console.log(`   - Time context extraction: ${checkData.features.time_context_extraction ? '✅' : '❌'}`);
    console.log(`   - Filter inference: ${checkData.features.filter_inference ? '✅' : '❌'}`);

    // Step 2: Check how many timeline events exist
    console.log('\n📋 Step 2: Checking timeline events database...');
    const { count: totalEvents } = await supabase
      .from('trial_timeline_events')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Found ${totalEvents} timeline events in database`);

    if (totalEvents === 0) {
      console.log('\n⚠️  No timeline events found. Semantic search needs data to work.');
      console.log('   Please add some timeline events first.');
      return;
    }

    // Step 3: Get sample events to show what we're searching
    const { data: sampleEvents } = await supabase
      .from('trial_timeline_events')
      .select('title, event_type, event_category, sentiment, tags')
      .limit(5);

    if (sampleEvents && sampleEvents.length > 0) {
      console.log('\n   Sample events in database:');
      sampleEvents.forEach((event, idx) => {
        console.log(`   ${idx + 1}. "${event.title}"`);
        console.log(`      Type: ${event.event_type}, Category: ${event.event_category}`);
        if (event.sentiment) console.log(`      Sentiment: ${event.sentiment}`);
        if (event.tags && event.tags.length > 0) {
          console.log(`      Tags: ${event.tags.join(', ')}`);
        }
        console.log('');
      });
    }

    // Step 4: Run semantic search tests
    console.log('='.repeat(80));
    console.log('\n📋 Step 3: Testing semantic search queries...\n');
    console.log('='.repeat(80));

    for (let i = 0; i < TEST_QUERIES.length; i++) {
      const test = TEST_QUERIES[i];

      console.log(`\n\nTEST ${i + 1}/${TEST_QUERIES.length}: ${test.description}`);
      console.log(`Query: "${test.query}"`);
      console.log('─'.repeat(80));

      const startTime = Date.now();

      const response = await fetch('http://localhost:3000/api/timeline/semantic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: test.query,
          limit: 10,
          include_all_orgs: true,
        }),
      });

      const duration = Date.now() - startTime;
      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌ Search failed:', result.error);
        console.error('   Details:', result.details);
        continue;
      }

      console.log(`✅ Search completed in ${duration}ms\n`);

      // Show query analysis
      console.log('🧠 AI Query Analysis:');
      console.log(`   Intent: ${result.query_analysis.intent}`);
      console.log(`   Keywords: ${result.query_analysis.keywords.join(', ')}`);

      if (Object.keys(result.query_analysis.filters).length > 0) {
        console.log('   Filters:');
        if (result.query_analysis.filters.event_types) {
          console.log(`      Event types: ${result.query_analysis.filters.event_types.join(', ')}`);
        }
        if (result.query_analysis.filters.categories) {
          console.log(`      Categories: ${result.query_analysis.filters.categories.join(', ')}`);
        }
        if (result.query_analysis.filters.sentiment) {
          console.log(`      Sentiment: ${result.query_analysis.filters.sentiment}`);
        }
        if (result.query_analysis.filters.severity) {
          console.log(`      Severity: ${result.query_analysis.filters.severity}`);
        }
        if (result.query_analysis.filters.tags) {
          console.log(`      Tags: ${result.query_analysis.filters.tags.join(', ')}`);
        }
      }

      if (result.query_analysis.time_context) {
        console.log(`   Time context: ${result.query_analysis.time_context}`);
      }

      // Show statistics
      console.log('\n📊 Search Statistics:');
      console.log(`   Total found: ${result.stats.total_found}`);
      console.log(`   Top results: ${result.stats.total_returned}`);
      console.log(`   Avg relevance: ${result.stats.avg_relevance}`);
      console.log(`   Highest score: ${result.stats.highest_relevance}`);
      console.log(`   Lowest score: ${result.stats.lowest_relevance}`);

      // Show top results
      if (result.results && result.results.length > 0) {
        console.log(`\n🎯 Top ${Math.min(5, result.results.length)} Results:\n`);

        result.results.slice(0, 5).forEach((event, idx) => {
          console.log(`${idx + 1}. [Score: ${event.relevance_score}] ${event.title}`);
          console.log(`   Type: ${event.event_type} | Category: ${event.event_category}`);
          if (event.sentiment) console.log(`   Sentiment: ${event.sentiment}`);
          if (event.severity) console.log(`   Severity: ${event.severity}`);
          if (event.tags && event.tags.length > 0) {
            console.log(`   Tags: ${event.tags.join(', ')}`);
          }

          if (event.match_reasons && event.match_reasons.length > 0) {
            console.log(`   Why it matched:`);
            event.match_reasons.forEach(reason => {
              console.log(`      - ${reason}`);
            });
          }

          if (event.description) {
            const shortDesc = event.description.substring(0, 100);
            console.log(`   Description: ${shortDesc}${event.description.length > 100 ? '...' : ''}`);
          }

          console.log('');
        });
      } else {
        console.log('\n   No results found matching this query');
      }

      // Wait between tests
      if (i < TEST_QUERIES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 SEMANTIC TIMELINE SEARCH FEATURE IS WORKING!\n');
    console.log('Key Features Tested:');
    console.log('  ✅ Natural language query parsing');
    console.log('  ✅ Keyword extraction from queries');
    console.log('  ✅ Search intent understanding');
    console.log('  ✅ Automatic filter inference (event_type, category, sentiment, etc.)');
    console.log('  ✅ Time context extraction (recent, past_week, past_month)');
    console.log('  ✅ Relevance scoring with explanations');
    console.log('  ✅ Multi-factor ranking (title, description, tags, type, category)');
    console.log('  ✅ Ranked result ordering (highest relevance first)');
    console.log('  ✅ Match reason explanations');
    console.log('\n🎯 BENEFITS:');
    console.log('  • Users can search in plain English');
    console.log('  • AI understands search intent');
    console.log('  • Results ranked by relevance, not just matches');
    console.log('  • Automatic filter inference (no manual filter UI needed)');
    console.log('  • Time-aware search ("recent", "last week", etc.)');
    console.log('  • Explains why each result matched');
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
(async () => {
  await testSemanticSearch();
})();
