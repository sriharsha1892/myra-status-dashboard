import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyUserAccess } from '@/lib/auth-helper';
import { parseNarrativeWithLLM, ParseContext } from '@/lib/timeline/llmParser';
import { getRecentEvents } from '@/lib/timeline/duplicateDetector';

// Create Supabase Admin client
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * POST /api/timeline/import/llm-parse
 * Parse narrative text using Gemini Pro LLM
 * Returns structured events for review before importing
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user access
    const { authorized, userId } = await verifyUserAccess(request);
    if (!authorized || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { text, org_id, date_range_hint } = body;

    // Validate input
    if (!text || !org_id) {
      return NextResponse.json(
        { error: 'Missing required fields: text, org_id' },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: 'Text too long (max 50,000 characters)' },
        { status: 400 }
      );
    }

    // Get organization details
    const supabaseAdmin = getSupabaseAdmin();
    const { data: org, error: orgError } = await supabaseAdmin
      .from('trial_organizations')
      .select('org_id, org_name')
      .eq('org_id', org_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get recent events for duplicate detection context
    const recentEvents = await getRecentEvents(org_id, 10);

    // Build parse context
    const context: ParseContext = {
      org_id: org.org_id,
      org_name: org.org_name,
      date_range_hint: date_range_hint
        ? {
            start: new Date(date_range_hint.start),
            end: new Date(date_range_hint.end),
          }
        : undefined,
      existing_events: recentEvents.map(e => ({
        event_timestamp: new Date(e.event_timestamp),
        event_type: e.event_type,
        title: e.title,
      })),
    };

    // Parse with LLM
    const parseResult = await parseNarrativeWithLLM(text, context);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error || 'Failed to parse text',
          fallback_suggestion: 'Try breaking the text into smaller sections or use the quick entry form instead',
        },
        { status: 500 }
      );
    }

    // Return parsed events for review
    return NextResponse.json({
      success: true,
      events: parseResult.events.map(event => ({
        ...event,
        event_timestamp: event.event_timestamp.toISOString(),
        follow_up_date: event.follow_up_date?.toISOString() || null,
      })),
      confidence_summary: parseResult.confidence_summary,
      processing_time_ms: parseResult.processing_time_ms,
      org_name: org.org_name,
      original_text_length: text.length,
    });
  } catch (error: any) {
    console.error('Error in POST /api/timeline/import/llm-parse:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
