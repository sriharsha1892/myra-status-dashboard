/**
 * Feature Requests API Endpoint
 * Aggregates feature requests across all trial organizations
 * Supports filtering, sorting, and authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const org_id = searchParams.get('org_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const sort_by = searchParams.get('sort_by') || 'votes'; // votes or date

    // Use admin client to fetch all feature requests with org names
    let query = supabaseAdmin
      .from('feature_requests')
      .select(`
        *,
        trial_organizations!feature_requests_org_id_fkey (
          org_id,
          org_name,
          org_lifecycle_stage,
          health_status
        )
      `);

    // Apply filters
    if (org_id) {
      query = query.eq('org_id', org_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    // Apply sorting
    if (sort_by === 'votes') {
      query = query.order('votes', { ascending: false });
    } else if (sort_by === 'date') {
      query = query.order('created_at', { ascending: false });
    } else if (sort_by === 'priority') {
      // Custom sort: critical > high > medium > low
      query = query.order('priority', { ascending: false });
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching feature requests:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Calculate stats
    const stats = {
      total: requests?.length || 0,
      by_status: {
        submitted: requests?.filter(r => r.status === 'submitted').length || 0,
        reviewed: requests?.filter(r => r.status === 'reviewed').length || 0,
        planned: requests?.filter(r => r.status === 'planned').length || 0,
        in_progress: requests?.filter(r => r.status === 'in_progress').length || 0,
        completed: requests?.filter(r => r.status === 'completed').length || 0,
        rejected: requests?.filter(r => r.status === 'rejected').length || 0,
        duplicate: requests?.filter(r => r.status === 'duplicate').length || 0,
      },
      by_priority: {
        low: requests?.filter(r => r.priority === 'low').length || 0,
        medium: requests?.filter(r => r.priority === 'medium').length || 0,
        high: requests?.filter(r => r.priority === 'high').length || 0,
        critical: requests?.filter(r => r.priority === 'critical').length || 0,
      },
      total_votes: requests?.reduce((sum, r) => sum + (r.votes || 0), 0) || 0,
    };

    return NextResponse.json({
      success: true,
      data: requests || [],
      stats,
    });

  } catch (error: any) {
    console.error('Feature requests API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { org_id, title, description, use_case, priority } = body;

    // Validation
    if (!org_id || !title || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: org_id, title, description' },
        { status: 400 }
      );
    }

    // Use admin client to create feature request
    const { data: request_data, error } = await supabaseAdmin
      .from('feature_requests')
      .insert({
        org_id,
        user_id: session.user.id,
        title: title.trim(),
        description: description.trim(),
        use_case: use_case || null,
        priority: priority || 'medium',
        status: 'submitted',
        votes: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating feature request:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // TODO: Send notification to product/roadmap team
    // This can be implemented using the existing notification system

    return NextResponse.json({
      success: true,
      data: request_data,
    });

  } catch (error: any) {
    console.error('Feature request creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
