/**
 * Bulk Timeline Event Tagging API Endpoint
 * Uses Groq AI to automatically tag timeline events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  batchTagTimelineEvents,
  type TimelineEventForTagging,
} from '@/lib/ai/timelineEventTagger';
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
          error: 'AI features not configured - GROQ_API_KEY missing',
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { event_ids, org_id, mode = 'selected' } = body;

    // Validate input
    if (mode === 'selected' && (!event_ids || !Array.isArray(event_ids) || event_ids.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'event_ids array is required when mode is "selected"',
        },
        { status: 400 }
      );
    }

    if (mode === 'org' && !org_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'org_id is required when mode is "org"',
        },
        { status: 400 }
      );
    }

    // Fetch timeline events
    let query = supabaseAdmin
      .from('trial_timeline_events')
      .select('id, title, description, event_type, event_category, sentiment, severity, tags');

    // Filter by event_ids or org_id
    if (mode === 'selected') {
      query = query.in('id', event_ids);
    } else if (mode === 'org') {
      query = query.eq('org_id', org_id);
    }

    const { data: events, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching timeline events:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch timeline events',
          details: fetchError.message,
        },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No timeline events found',
        },
        { status: 404 }
      );
    }

    console.log(`Tagging ${events.length} timeline events...`);

    // Prepare events for tagging
    const eventsForTagging: TimelineEventForTagging[] = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      event_category: event.event_category,
      sentiment: event.sentiment,
      severity: event.severity,
      existing_tags: event.tags || [],
    }));

    // Generate tags using AI
    const taggingResults = await batchTagTimelineEvents(eventsForTagging);

    // Update database with generated tags
    const updates: Array<{
      event_id: string;
      title: string;
      old_tags: string[];
      new_tags: string[];
      tags_added: number;
      confidence: number;
      reasoning?: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const [event_id, result] of taggingResults) {
      const event = events.find(e => e.id === event_id)!;
      const oldTags = event.tags || [];

      if (result.success && result.tags.length > 0) {
        // Update database
        const { error: updateError } = await supabaseAdmin
          .from('trial_timeline_events')
          .update({ tags: result.tags })
          .eq('id', event_id);

        if (updateError) {
          console.error(`Failed to update tags for event ${event.title}:`, updateError);
          updates.push({
            event_id,
            title: event.title,
            old_tags: oldTags,
            new_tags: result.tags,
            tags_added: result.tags.length - oldTags.length,
            confidence: result.confidence,
            reasoning: result.reasoning,
            success: false,
            error: updateError.message,
          });
        } else {
          updates.push({
            event_id,
            title: event.title,
            old_tags: oldTags,
            new_tags: result.tags,
            tags_added: result.tags.length - oldTags.length,
            confidence: result.confidence,
            reasoning: result.reasoning,
            success: true,
          });
        }
      } else {
        updates.push({
          event_id,
          title: event.title,
          old_tags: oldTags,
          new_tags: [],
          tags_added: 0,
          confidence: 0,
          success: false,
          error: result.error || 'Failed to generate tags',
        });
      }
    }

    // Summary statistics
    const successCount = updates.filter(u => u.success).length;
    const failureCount = updates.filter(u => !u.success).length;
    const totalTagsAdded = updates.reduce((sum, u) => sum + Math.max(0, u.tags_added), 0);
    const avgConfidence =
      successCount > 0
        ? updates
            .filter(u => u.success)
            .reduce((sum, u) => sum + u.confidence, 0) / successCount
        : 0;

    // Collect all unique tags generated
    const allTags = new Set<string>();
    updates.forEach(u => {
      u.new_tags.forEach(tag => allTags.add(tag));
    });

    console.log(`Timeline event tagging complete: ${successCount} succeeded, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      summary: {
        total: events.length,
        succeeded: successCount,
        failed: failureCount,
        total_tags_added: totalTagsAdded,
        avg_confidence: Math.round(avgConfidence * 100) / 100,
        unique_tags_generated: allTags.size,
      },
      results: updates,
      all_tags: Array.from(allTags).sort(),
    });
  } catch (error: any) {
    console.error('Timeline event tagging error:', error);
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

// GET endpoint to check if timeline event tagging is available
export async function GET(request: NextRequest) {
  const available = isGroqAvailable();

  return NextResponse.json({
    available,
    message: available
      ? 'AI timeline event tagging is available'
      : 'AI timeline event tagging is not available - GROQ_API_KEY not configured',
  });
}
