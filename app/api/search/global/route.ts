/**
 * Global Search API Endpoint
 * Unified search across timeline events, trials, users, and resources
 * Uses AI semantic search for intelligent query understanding
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeSearchQuery, calculateRelevance } from '@/lib/ai/semanticSearch';
import { isGroqAvailable } from '@/lib/ai/groqClient';

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface SearchResult {
  id: string;
  type: 'timeline_event' | 'trial' | 'user' | 'resource_discussion' | 'resource_question';
  title: string;
  description?: string;
  url: string;
  relevance_score: number;
  match_reasons: string[];
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, categories = ['all'], limit = 30, user_id } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query string is required',
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Global search: "${query}" in categories: ${categories.join(', ')}`);

    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    // Determine which categories to search
    const searchAll = categories.includes('all');
    const searchTimeline = searchAll || categories.includes('timeline');
    const searchTrials = searchAll || categories.includes('trials');
    const searchUsers = searchAll || categories.includes('users');
    const searchResources = searchAll || categories.includes('resources');

    // 1. TIMELINE EVENTS SEARCH (with AI if available)
    if (searchTimeline) {
      const timelineResults = await searchTimelineEvents(query, queryLower, limit);
      results.push(...timelineResults);
    }

    // 2. TRIAL ORGANIZATIONS SEARCH
    if (searchTrials) {
      const trialResults = await searchTrials(queryLower, limit);
      results.push(...trialResults);
    }

    // 3. USERS SEARCH
    if (searchUsers) {
      const userResults = await searchUsers(queryLower, limit);
      results.push(...userResults);
    }

    // 4. RESOURCE DISCUSSIONS & QUESTIONS SEARCH
    if (searchResources) {
      const resourceResults = await searchResources(queryLower, limit);
      results.push(...resourceResults);
    }

    // Sort all results by relevance score
    results.sort((a, b) => b.relevance_score - a.relevance_score);

    // Apply final limit
    const topResults = results.slice(0, limit);

    // Categorize results for better UX
    const categorized = {
      timeline: topResults.filter(r => r.type === 'timeline_event'),
      trials: topResults.filter(r => r.type === 'trial'),
      users: topResults.filter(r => r.type === 'user'),
      resources: topResults.filter(r => r.type.startsWith('resource_')),
    };

    console.log(`✅ Global search found ${results.length} results (returning top ${topResults.length})`);

    return NextResponse.json({
      success: true,
      query,
      results: topResults,
      categorized,
      stats: {
        total_found: results.length,
        total_returned: topResults.length,
        by_category: {
          timeline: categorized.timeline.length,
          trials: categorized.trials.length,
          users: categorized.users.length,
          resources: categorized.resources.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Global search error:', error);
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

/**
 * Search timeline events (with AI semantic search if available)
 */
async function searchTimelineEvents(query: string, queryLower: string, limit: number): Promise<SearchResult[]> {
  try {
    // Use AI semantic search if available
    if (isGroqAvailable()) {
      const analysisResult = await analyzeSearchQuery(query);
      if (analysisResult.success && analysisResult.analysis) {
        const analysis = analysisResult.analysis;

        // Build database query based on AI analysis
        let dbQuery = supabaseAdmin
          .from('trial_timeline_events')
          .select('id, title, description, event_type, event_category, tags, org_id')
          .limit(50);

        // Apply filters from AI analysis
        if (analysis.filters.event_type && Array.isArray(analysis.filters.event_type)) {
          dbQuery = dbQuery.in('event_type', analysis.filters.event_type);
        }
        if (analysis.filters.sentiment) {
          dbQuery = dbQuery.eq('sentiment', analysis.filters.sentiment);
        }

        const { data: events } = await dbQuery;

        if (events && events.length > 0) {
          return events.map(event => {
            const { score, reasons } = calculateRelevance(
              {
                title: event.title,
                description: event.description,
                event_type: event.event_type,
                event_category: event.event_category,
                tags: event.tags,
              },
              analysis
            );

            return {
              id: event.id,
              type: 'timeline_event' as const,
              title: event.title,
              description: event.description,
              url: `/support/trials/${event.org_id}?tab=timeline&event=${event.id}`,
              relevance_score: score,
              match_reasons: reasons,
              metadata: {
                event_type: event.event_type,
                event_category: event.event_category,
                tags: event.tags,
              },
            };
          }).sort((a, b) => b.relevance_score - a.relevance_score).slice(0, limit);
        }
      }
    }

    // Fallback to keyword search
    const { data: events } = await supabaseAdmin
      .from('trial_timeline_events')
      .select('id, title, description, event_type, org_id, tags')
      .or(`title.ilike.%${queryLower}%,description.ilike.%${queryLower}%`)
      .limit(limit);

    if (!events) return [];

    return events.map(event => {
      const titleMatch = event.title.toLowerCase().includes(queryLower);
      const descMatch = event.description?.toLowerCase().includes(queryLower);
      const score = (titleMatch ? 15 : 0) + (descMatch ? 8 : 0);

      return {
        id: event.id,
        type: 'timeline_event' as const,
        title: event.title,
        description: event.description,
        url: `/support/trials/${event.org_id}?tab=timeline&event=${event.id}`,
        relevance_score: score,
        match_reasons: [
          titleMatch && 'Title match',
          descMatch && 'Description match',
        ].filter(Boolean) as string[],
        metadata: {
          event_type: event.event_type,
          tags: event.tags,
        },
      };
    });
  } catch (error) {
    console.error('Error searching timeline events:', error);
    return [];
  }
}

/**
 * Search trial organizations
 */
async function searchTrials(queryLower: string, limit: number): Promise<SearchResult[]> {
  try {
    const { data: trials } = await supabaseAdmin
      .from('trial_organizations')
      .select('org_id, org_name, org_lifecycle_stage, health_status, engagement_score')
      .ilike('org_name', `%${queryLower}%`)
      .limit(limit);

    if (!trials) return [];

    return trials.map(trial => ({
      id: trial.org_id,
      type: 'trial' as const,
      title: trial.org_name,
      description: `${trial.org_lifecycle_stage} | Health: ${trial.health_status || 'unknown'}`,
      url: `/support/trials/${trial.org_id}`,
      relevance_score: 20, // Boost trials (high priority)
      match_reasons: ['Organization name match'],
      metadata: {
        lifecycle_stage: trial.org_lifecycle_stage,
        health_status: trial.health_status,
        engagement_score: trial.engagement_score,
      },
    }));
  } catch (error) {
    console.error('Error searching trials:', error);
    return [];
  }
}

/**
 * Search users
 */
async function searchUsers(queryLower: string, limit: number): Promise<SearchResult[]> {
  try {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role, parent_company')
      .or(`full_name.ilike.%${queryLower}%,email.ilike.%${queryLower}%`)
      .limit(limit);

    if (!users) return [];

    return users.map(user => {
      const nameMatch = user.full_name.toLowerCase().includes(queryLower);
      const emailMatch = user.email.toLowerCase().includes(queryLower);
      const score = (nameMatch ? 18 : 0) + (emailMatch ? 15 : 0);

      return {
        id: user.id,
        type: 'user' as const,
        title: user.full_name,
        description: `${user.email} | ${user.role}${user.parent_company ? ` at ${user.parent_company}` : ''}`,
        url: `/support/users?user=${user.id}`,
        relevance_score: score,
        match_reasons: [
          nameMatch && 'Name match',
          emailMatch && 'Email match',
        ].filter(Boolean) as string[],
        metadata: {
          role: user.role,
          email: user.email,
          company: user.parent_company,
        },
      };
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

/**
 * Search resource discussions and questions
 */
async function searchResources(queryLower: string, limit: number): Promise<SearchResult[]> {
  try {
    const results: SearchResult[] = [];

    // Search discussions
    const { data: discussions } = await supabaseAdmin
      .from('resource_discussions')
      .select('id, discussion_type, content, author_id, created_at')
      .eq('parent_discussion_id', null) // Only top-level
      .limit(limit);

    if (discussions) {
      for (const disc of discussions) {
        const content = disc.content as any;
        const title = content.question || content.title || 'Discussion';
        const description = content.details || content.description || '';

        const titleMatch = title.toLowerCase().includes(queryLower);
        const descMatch = description.toLowerCase().includes(queryLower);

        if (titleMatch || descMatch) {
          results.push({
            id: disc.id,
            type: disc.discussion_type === 'question' ? 'resource_question' : 'resource_discussion',
            title,
            description,
            url: `/support/resources?${disc.discussion_type}=${disc.id}`,
            relevance_score: (titleMatch ? 12 : 0) + (descMatch ? 6 : 0),
            match_reasons: [
              titleMatch && 'Title match',
              descMatch && 'Description match',
            ].filter(Boolean) as string[],
            metadata: {
              discussion_type: disc.discussion_type,
            },
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error searching resources:', error);
    return [];
  }
}

// GET endpoint to check if global search is available
export async function GET() {
  return NextResponse.json({
    available: true,
    message: 'Global search is available',
    features: {
      timeline_events: true,
      trial_organizations: true,
      users: true,
      resources: true,
      ai_semantic_search: isGroqAvailable(),
      keyboard_shortcut: 'Cmd+K / Ctrl+K',
    },
    categories: [
      { id: 'all', name: 'All', description: 'Search everything' },
      { id: 'timeline', name: 'Timeline', description: 'Timeline events and activities' },
      { id: 'trials', name: 'Trials', description: 'Trial organizations' },
      { id: 'users', name: 'Users', description: 'Account managers and trial users' },
      { id: 'resources', name: 'Resources', description: 'Discussions and Q&A' },
    ],
  });
}
