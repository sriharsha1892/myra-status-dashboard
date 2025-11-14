/**
 * Semantic Timeline Search API Endpoint
 * Uses AI to understand natural language queries and search intelligently
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  analyzeSearchQuery,
  calculateRelevance,
  buildFilters,
  getTimeRange,
  type QueryAnalysis,
  type SearchResult,
} from '@/lib/ai/semanticSearch';
import { isGroqAvailable } from '@/lib/ai/groqClient';

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Check if Groq is available
    if (!isGroqAvailable()) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI search not available - GROQ_API_KEY not configured',
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { query, org_id, limit = 50, include_all_orgs = false } = body;

    // Validate input
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Query string is required',
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Semantic search query: "${query}"`);

    // Step 1: Analyze natural language query using AI
    const analysisResult = await analyzeSearchQuery(query);

    if (!analysisResult.success || !analysisResult.analysis) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to analyze query',
          details: analysisResult.error,
        },
        { status: 500 }
      );
    }

    const analysis = analysisResult.analysis;
    console.log('📊 Query analysis:', {
      keywords: analysis.keywords,
      intent: analysis.intent,
      filters: analysis.filters,
      time_context: analysis.time_context,
    });

    // Step 2: Build database query based on analysis
    const { textSearch, filters } = buildFilters(analysis);
    const timeRange = getTimeRange(analysis.time_context);

    // Start building query
    let dbQuery = supabaseAdmin
      .from('trial_timeline_events')
      .select('id, title, description, event_type, event_category, sentiment, severity, tags, event_timestamp, org_id');

    // Filter by org_id if specified
    if (org_id && !include_all_orgs) {
      dbQuery = dbQuery.eq('org_id', org_id);
    }

    // Apply time range filter
    if (timeRange) {
      dbQuery = dbQuery.gte('event_timestamp', timeRange.toISOString());
    }

    // Apply extracted filters
    if (filters.event_type && Array.isArray(filters.event_type) && filters.event_type.length > 0) {
      dbQuery = dbQuery.in('event_type', filters.event_type);
    }

    if (filters.event_category && Array.isArray(filters.event_category) && filters.event_category.length > 0) {
      dbQuery = dbQuery.in('event_category', filters.event_category);
    }

    if (filters.sentiment) {
      dbQuery = dbQuery.eq('sentiment', filters.sentiment);
    }

    if (filters.severity) {
      dbQuery = dbQuery.eq('severity', filters.severity);
    }

    // Step 3: Execute query
    const { data: events, error: dbError } = await dbQuery.limit(200); // Fetch more, rank later

    if (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed',
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        query_analysis: analysis,
        results: [],
        total_results: 0,
        message: 'No events found matching your query',
      });
    }

    console.log(`📦 Found ${events.length} events, calculating relevance...`);

    // Step 4: Calculate relevance scores for each event
    const scoredResults: SearchResult[] = events.map(event => {
      const { score, reasons } = calculateRelevance(
        {
          title: event.title,
          description: event.description,
          event_type: event.event_type,
          event_category: event.event_category,
          tags: event.tags,
          sentiment: event.sentiment,
          severity: event.severity,
        },
        analysis
      );

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        event_type: event.event_type,
        event_category: event.event_category,
        event_timestamp: event.event_timestamp,
        tags: event.tags,
        sentiment: event.sentiment,
        severity: event.severity,
        relevance_score: score,
        match_reasons: reasons,
      };
    });

    // Step 5: Sort by relevance score (highest first)
    scoredResults.sort((a, b) => b.relevance_score - a.relevance_score);

    // Step 6: Apply limit
    const topResults = scoredResults.slice(0, limit);

    // Step 7: Calculate statistics
    const stats = {
      total_found: events.length,
      total_returned: topResults.length,
      avg_relevance: topResults.length > 0
        ? Math.round(
            topResults.reduce((sum, r) => sum + r.relevance_score, 0) / topResults.length
          )
        : 0,
      highest_relevance: topResults.length > 0 ? topResults[0].relevance_score : 0,
      lowest_relevance: topResults.length > 0 ? topResults[topResults.length - 1].relevance_score : 0,
    };

    console.log('✅ Semantic search complete:', {
      query,
      total_found: events.length,
      top_results: topResults.length,
      avg_score: stats.avg_relevance,
    });

    return NextResponse.json({
      success: true,
      query: query,
      query_analysis: analysis,
      results: topResults,
      stats,
      total_results: topResults.length,
    });
  } catch (error: any) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if semantic search is available
export async function GET() {
  const available = isGroqAvailable();

  return NextResponse.json({
    available,
    message: available
      ? 'Semantic search is available'
      : 'Semantic search not available - GROQ_API_KEY not configured',
    features: {
      natural_language_queries: available,
      relevance_scoring: true,
      time_context_extraction: available,
      filter_inference: available,
    },
  });
}
