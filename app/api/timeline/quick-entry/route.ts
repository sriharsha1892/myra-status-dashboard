import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyUserAccess } from '@/lib/auth-helper';

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
 * POST /api/timeline/quick-entry
 * Quick manual entry of single timeline event
 * Returns the created event and recent entries for context
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
    const {
      org_id,
      event_type,
      event_category,
      title,
      description,
      event_timestamp,
      sentiment,
      severity,
      tags,
      mentioned_people,
      mentioned_features,
      follow_up_required,
      follow_up_date,
    } = body;

    // Validate required fields
    if (!org_id || !event_type || !event_category || !title || !event_timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: org_id, event_type, event_category, title, event_timestamp' },
        { status: 400 }
      );
    }

    // Create event
    const supabaseAdmin = getSupabaseAdmin();
    const { data: event, error: createError } = await supabaseAdmin
      .from('trial_timeline_events')
      .insert({
        org_id,
        event_type,
        event_category,
        title,
        description: description || null,
        event_timestamp: new Date(event_timestamp).toISOString(),
        sentiment: sentiment || 'neutral',
        severity: severity || 'medium',
        tags: tags || [],
        mentioned_people: mentioned_people || [],
        mentioned_features: mentioned_features || [],
        follow_up_required: follow_up_required || false,
        follow_up_date: follow_up_date ? new Date(follow_up_date).toISOString().split('T')[0] : null,
        logged_by: userId,
        source: 'manual_entry',
        parse_confidence: 1.0, // Manual entry is 100% confident
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating timeline event:', createError);
      return NextResponse.json(
        { error: 'Failed to create event', details: createError.message },
        { status: 500 }
      );
    }

    // Get recent entries for this org (for context display)
    const { data: recentEntries } = await supabaseAdmin
      .from('trial_timeline_events')
      .select('id, event_timestamp, event_type, event_category, title')
      .eq('org_id', org_id)
      .order('event_timestamp', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      event,
      recent_entries: recentEntries || [],
    });
  } catch (error: any) {
    console.error('Error in POST /api/timeline/quick-entry:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/timeline/quick-entry
 * Get user's recent activity types and templates
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user access
    const { authorized, userId } = await verifyUserAccess(request);
    if (!authorized || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get user's recent activity types (last 10 unique types they've used)
    const { data: recentEvents } = await supabaseAdmin
      .from('trial_timeline_events')
      .select('event_type, event_category')
      .eq('logged_by', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Extract unique recent types (preserve order)
    const seenTypes = new Set<string>();
    const recentTypes: Array<{ event_type: string; event_category: string }> = [];

    if (recentEvents) {
      for (const event of recentEvents) {
        if (!seenTypes.has(event.event_type)) {
          seenTypes.add(event.event_type);
          recentTypes.push({
            event_type: event.event_type,
            event_category: event.event_category,
          });
          if (recentTypes.length >= 5) break; // Top 5 recent types
        }
      }
    }

    // Get user preferences (templates) if they exist
    const { data: preferences } = await supabaseAdmin
      .from('user_timeline_preferences')
      .select('custom_templates')
      .eq('user_id', userId)
      .single();

    return NextResponse.json({
      success: true,
      recent_types: recentTypes,
      templates: preferences?.custom_templates || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/timeline/quick-entry:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
