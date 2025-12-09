// Follow-ups API - Single follow-up operations
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/follow-ups/[id] - Get single follow-up
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const { data, error } = await supabase
      .from('follow_ups')
      .select(`
        *,
        trial_organizations (org_name, org_lifecycle_stage, account_manager_id),
        trial_users (name, email, role)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
      }
      console.error('Error fetching follow-up:', error);
      return NextResponse.json(
        { error: 'Failed to fetch follow-up' },
        { status: 500 }
      );
    }

    return NextResponse.json({ follow_up: data });
  } catch (error) {
    console.error('Error fetching follow-up:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/follow-ups/[id] - Update follow-up
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};

    // Updatable fields
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.follow_up_type !== undefined) updates.follow_up_type = body.follow_up_type;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.due_time !== undefined) updates.due_time = body.due_time;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.notes !== undefined) updates.notes = body.notes;

    // Status changes
    if (body.status !== undefined) {
      updates.status = body.status;

      if (body.status === 'completed') {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = user.id;
        if (body.outcome !== undefined) updates.outcome = body.outcome;
      }

      if (body.status === 'snoozed') {
        if (!body.snoozed_until) {
          return NextResponse.json(
            { error: 'snoozed_until is required when snoozing' },
            { status: 400 }
          );
        }
        updates.snoozed_until = body.snoozed_until;

        // Increment snooze count
        const { data: current } = await supabase
          .from('follow_ups')
          .select('snooze_count')
          .eq('id', id)
          .single();

        updates.snooze_count = ((current?.snooze_count as number) || 0) + 1;
      }
    }

    const { data, error } = await supabase
      .from('follow_ups')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating follow-up:', error);
      return NextResponse.json(
        { error: 'Failed to update follow-up' },
        { status: 500 }
      );
    }

    return NextResponse.json({ follow_up: data });
  } catch (error) {
    console.error('Error updating follow-up:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/follow-ups/[id] - Delete follow-up
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const { error } = await supabase
      .from('follow_ups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting follow-up:', error);
      return NextResponse.json(
        { error: 'Failed to delete follow-up' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting follow-up:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
