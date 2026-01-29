import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api-auth-middleware';
import { z } from 'zod';
import { uuidSchema } from '@/lib/validation/schemas/common';

// Timeline event validation schema
const createTimelineEventSchema = z.object({
  org_id: uuidSchema,
  event_type: z.string().min(1, 'Event type is required'),
  event_category: z.string().min(1, 'Event category is required'),
  title: z.string().min(1, 'Title is required'),
  event_timestamp: z.string().datetime({ message: 'Invalid timestamp format' }),
  description: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  tags: z.array(z.string()).optional(),
  follow_up_required: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
  source: z.string().optional(),
});

/**
 * GET /api/timeline/events
 * Fetch timeline events with optional filters
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth(request);
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get filter parameters
    const orgId = searchParams.get('org_id');
    const eventTypes = searchParams.get('event_types')?.split(',');
    const eventCategories = searchParams.get('event_categories')?.split(',');
    const sentiment = searchParams.get('sentiment')?.split(',');
    const severity = searchParams.get('severity')?.split(',');
    const tags = searchParams.get('tags')?.split(',');
    const loggedBy = searchParams.get('logged_by')?.split(',');
    const followUpOnly = searchParams.get('follow_up_only') === 'true';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('trial_timeline_events')
      .select(`
        *,
        trial_organizations!inner(org_name),
        users(full_name, email)
      `)
      .order('event_timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    if (eventTypes && eventTypes.length > 0) {
      query = query.in('event_type', eventTypes);
    }

    if (eventCategories && eventCategories.length > 0) {
      query = query.in('event_category', eventCategories);
    }

    if (sentiment && sentiment.length > 0) {
      query = query.in('sentiment', sentiment);
    }

    if (severity && severity.length > 0) {
      query = query.in('severity', severity);
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    if (loggedBy && loggedBy.length > 0) {
      query = query.in('logged_by', loggedBy);
    }

    if (followUpOnly) {
      query = query.eq('follow_up_required', true);
    }

    if (search) {
      query = query.textSearch('search_vector', search);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      count,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Error fetching timeline events:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch timeline events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/timeline/events
 * Create a new timeline event
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Validate request body with Zod
    const validation = createTimelineEventSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    // Insert event with validated data
    const { data, error } = await supabase
      .from('trial_timeline_events')
      .insert({
        ...validation.data,
        logged_by: user.id,
        source: validation.data.source || 'manual_entry',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error creating timeline event:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create timeline event' },
      { status: 500 }
    );
  }
}
