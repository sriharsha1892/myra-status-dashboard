import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/timeline/events/[id]
 * Fetch a single timeline event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    const { data, error } = await supabase
      .from('trial_timeline_events')
      .select(`
        *,
        trial_organizations(org_name),
        users(full_name, email),
        event_pain_points(
          pain_points(*)
        ),
        event_learnings(
          learnings(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching timeline event:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch timeline event' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/timeline/events/[id]
 * Update a timeline event
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Update event
    const { data, error } = await supabase
      .from('trial_timeline_events')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error updating timeline event:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update timeline event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/timeline/events/[id]
 * Delete a timeline event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('trial_timeline_events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting timeline event:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete timeline event' },
      { status: 500 }
    );
  }
}
