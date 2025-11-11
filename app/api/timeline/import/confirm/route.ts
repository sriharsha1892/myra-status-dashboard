import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/timeline/import/confirm
 * Import reviewed and confirmed events, pain points, and learnings
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { org_id, events, pain_points, learnings, raw_text, source_type = 'crm_notes' } = body;

    if (!org_id || !events) {
      return NextResponse.json(
        { success: false, error: 'org_id and events are required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Create import session record
    const { data: sessionData, error: sessionError } = await supabase
      .from('import_sessions')
      .insert({
        org_id,
        user_id: user.id,
        source_type,
        raw_text,
        events_parsed: events.length,
        events_imported: 0,
        pain_points_created: 0,
        learnings_created: 0,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;
    const sessionId = sessionData.id;

    let eventsImported = 0;
    let painPointsCreated = 0;
    let learningsCreated = 0;
    const insertedEventIds: string[] = [];

    // Insert events
    for (const event of events) {
      const { data: eventData, error: eventError } = await supabase
        .from('trial_timeline_events')
        .insert({
          org_id,
          ...event,
          logged_by: user.id,
          source: 'bulk_import',
        })
        .select()
        .single();

      if (!eventError && eventData) {
        eventsImported++;
        insertedEventIds.push(eventData.id);
      } else {
        console.error('Error inserting event:', eventError);
      }
    }

    // Insert pain points if provided
    if (pain_points && pain_points.length > 0) {
      for (const pp of pain_points) {
        // Check if similar pain point exists
        const { data: existing } = await supabase
          .from('pain_points')
          .select('*')
          .ilike('title', `%${pp.title.substring(0, 50)}%`)
          .single();

        if (existing) {
          // Update existing pain point
          await supabase
            .from('pain_points')
            .update({
              reported_count: existing.reported_count + 1,
              affected_orgs: [...new Set([...existing.affected_orgs, org_id])],
              last_reported_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          painPointsCreated++;
        } else {
          // Create new pain point
          const { data: ppData, error: ppError } = await supabase
            .from('pain_points')
            .insert({
              ...pp,
              affected_orgs: [org_id],
              status: 'open',
            })
            .select()
            .single();

          if (!ppError && ppData) {
            painPointsCreated++;
          }
        }
      }
    }

    // Insert learnings if provided
    if (learnings && learnings.length > 0) {
      for (const learning of learnings) {
        // Check if similar learning exists
        const { data: existing } = await supabase
          .from('learnings')
          .select('*')
          .ilike('title', `%${learning.title.substring(0, 50)}%`)
          .single();

        if (existing) {
          // Update existing learning
          await supabase
            .from('learnings')
            .update({
              reported_count: existing.reported_count + 1,
              source_orgs: [...new Set([...existing.source_orgs, org_id])],
            })
            .eq('id', existing.id);

          learningsCreated++;
        } else {
          // Create new learning
          const { data: learningData, error: learningError } = await supabase
            .from('learnings')
            .insert({
              ...learning,
              source_orgs: [org_id],
              actionable: true,
              implemented: false,
            })
            .select()
            .single();

          if (!learningError && learningData) {
            learningsCreated++;
          }
        }
      }
    }

    // Update import session with results
    await supabase
      .from('import_sessions')
      .update({
        events_imported: eventsImported,
        pain_points_created: painPointsCreated,
        learnings_created: learningsCreated,
        parse_stats: {
          total_events: events.length,
          total_pain_points: pain_points?.length || 0,
          total_learnings: learnings?.length || 0,
        },
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      data: {
        session_id: sessionId,
        events_imported: eventsImported,
        pain_points_created: painPointsCreated,
        learnings_created: learningsCreated,
        inserted_event_ids: insertedEventIds,
      }
    });
  } catch (error: any) {
    console.error('Error confirming import:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to confirm import' },
      { status: 500 }
    );
  }
}
