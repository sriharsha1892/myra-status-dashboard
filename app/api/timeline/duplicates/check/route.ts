import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyUserAccess } from '@/lib/auth-helper';
import { batchCheckDuplicates, getRecentEvents } from '@/lib/timeline/duplicateDetector';
import { ParsedEvent } from '@/lib/timeline/llmParser';

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
 * POST /api/timeline/duplicates/check
 * Check if events are potential duplicates
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
    const { events, org_id } = body;

    // Validate input
    if (!events || !org_id) {
      return NextResponse.json(
        { error: 'Missing required fields: events, org_id' },
        { status: 400 }
      );
    }

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Events must be an array' },
        { status: 400 }
      );
    }

    // Convert event timestamps from ISO strings to Dates
    const parsedEvents: ParsedEvent[] = events.map((e: any) => ({
      ...e,
      event_timestamp: new Date(e.event_timestamp),
      follow_up_date: e.follow_up_date ? new Date(e.follow_up_date) : null,
    }));

    // Get existing events from database
    const existingEvents = await getRecentEvents(org_id, 50); // Check against last 50 events

    // Batch check duplicates
    const duplicateChecks = batchCheckDuplicates(parsedEvents, existingEvents, org_id);

    return NextResponse.json({
      success: true,
      duplicates: duplicateChecks.map((check, index) => ({
        event_index: index,
        is_duplicate: check.is_duplicate,
        similarity_score: check.similarity_score,
        reason: check.reason,
        existing_event: check.existing_event
          ? {
              id: check.existing_event.id,
              event_timestamp: check.existing_event.event_timestamp.toISOString(),
              event_type: check.existing_event.event_type,
              title: check.existing_event.title,
            }
          : null,
      })),
    });
  } catch (error: any) {
    console.error('Error in POST /api/timeline/duplicates/check:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
