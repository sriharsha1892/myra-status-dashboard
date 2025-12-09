// Follow-ups API - List and create follow-ups
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// GET /api/follow-ups - List follow-ups
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const status = searchParams.get('status');
    const created_by = searchParams.get('created_by');
    const due_before = searchParams.get('due_before');
    const due_after = searchParams.get('due_after');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('follow_ups')
      .select(`
        *,
        trial_organizations (org_name, org_lifecycle_stage),
        trial_users (name, email)
      `)
      .order('due_date', { ascending: true });

    if (org_id) {
      query = query.eq('org_id', org_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    if (due_before) {
      query = query.lte('due_date', due_before);
    }

    if (due_after) {
      query = query.gte('due_date', due_after);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching follow-ups:', error);
      return NextResponse.json(
        { error: 'Failed to fetch follow-ups' },
        { status: 500 }
      );
    }

    return NextResponse.json({ follow_ups: data || [] });
  } catch (error) {
    console.error('Error in follow-ups API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/follow-ups - Create follow-up
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      org_id,
      user_id,
      title,
      description,
      follow_up_type,
      due_date,
      due_time,
      priority,
      source_command,
    } = body;

    if (!org_id) {
      return NextResponse.json(
        { error: 'org_id is required' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    if (!due_date) {
      return NextResponse.json(
        { error: 'due_date is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('follow_ups')
      .insert({
        org_id,
        user_id: user_id || null,
        created_by: user.id,
        title,
        description: description || null,
        follow_up_type: follow_up_type || 'general',
        due_date,
        due_time: due_time || null,
        priority: priority || 'medium',
        status: 'pending',
        source_command: source_command || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating follow-up:', error);
      return NextResponse.json(
        { error: 'Failed to create follow-up' },
        { status: 500 }
      );
    }

    return NextResponse.json({ follow_up: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
