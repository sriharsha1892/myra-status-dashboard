import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch demo events with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('org_id');
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('demo_events')
      .select(`
        *,
        trial_organizations (
          org_id,
          org_name
        )
      `)
      .order('demo_date', { ascending: false });

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    if (status && status !== 'all') {
      query = query.eq('demo_status', status);
    }

    if (startDate) {
      query = query.gte('demo_date', startDate);
    }

    if (endDate) {
      query = query.lte('demo_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Demo events fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Demo events fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch demo events' }, { status: 500 });
  }
}

// POST - Create a new demo event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      org_id,
      demo_date,
      demo_time,
      sales_poc,
      demo_status = 'scheduled',
      attendee_names = [],
      demo_observations,
      pain_points,
      next_steps,
      demo_rating,
    } = body;

    // Validate required fields
    if (!org_id) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!demo_date) {
      return NextResponse.json({ error: 'Demo date is required' }, { status: 400 });
    }
    if (!sales_poc) {
      return NextResponse.json({ error: 'Sales POC is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('demo_events')
      .insert({
        org_id,
        demo_date,
        demo_time: demo_time || null,
        sales_poc,
        demo_status,
        attendee_names: attendee_names.length ? attendee_names : null,
        demo_observations: demo_observations || null,
        pain_points: pain_points || null,
        next_steps: next_steps || null,
        demo_rating: demo_rating || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Demo event create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (err) {
    console.error('Demo event create error:', err);
    return NextResponse.json({ error: 'Failed to create demo event' }, { status: 500 });
  }
}

// PATCH - Update a demo event
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { demo_id, updates } = body;

    if (!demo_id) {
      return NextResponse.json({ error: 'Demo ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('demo_events')
      .update(updates)
      .eq('demo_id', demo_id)
      .select()
      .single();

    if (error) {
      console.error('Demo event update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (err) {
    console.error('Demo event update error:', err);
    return NextResponse.json({ error: 'Failed to update demo event' }, { status: 500 });
  }
}

// DELETE - Delete a demo event
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const demoId = searchParams.get('demo_id');

    if (!demoId) {
      return NextResponse.json({ error: 'Demo ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('demo_events')
      .delete()
      .eq('demo_id', demoId);

    if (error) {
      console.error('Demo event delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Demo event delete error:', err);
    return NextResponse.json({ error: 'Failed to delete demo event' }, { status: 500 });
  }
}
