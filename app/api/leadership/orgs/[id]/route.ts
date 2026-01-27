import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isLeadershipEmail } from '@/lib/leadership/auth';

// Valid lifecycle stages
const VALID_STAGES = [
  'prospect',
  'trial_pending',
  'demo_done',
  'trial_active',
  'trial_expired',
  'negotiation',
  'customer',
  'lost',
];

// Valid momentum values
const VALID_MOMENTUM = ['positive', 'neutral', 'stalled', 'at_risk'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get a single organization by ID
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    // Check leadership email header auth
    const leadershipEmail = request.headers.get('x-leadership-email');
    if (!leadershipEmail || !isLeadershipEmail(leadershipEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = await createClient();

    const { data: org, error } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('org_id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
      console.error('Error fetching organization:', error);
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error('Organization get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a single organization
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    // Check leadership email header auth
    const leadershipEmail = request.headers.get('x-leadership-email');
    if (!leadershipEmail || !isLeadershipEmail(leadershipEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = await createClient();

    const body = await request.json();

    // Validate and build update object
    const updates: Record<string, unknown> = {};

    // Stage validation
    if (body.org_lifecycle_stage !== undefined) {
      if (body.org_lifecycle_stage && !VALID_STAGES.includes(body.org_lifecycle_stage)) {
        return NextResponse.json(
          { error: `Invalid stage. Valid stages: ${VALID_STAGES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.org_lifecycle_stage = body.org_lifecycle_stage;
    }

    // Momentum validation
    if (body.deal_momentum !== undefined) {
      if (body.deal_momentum && !VALID_MOMENTUM.includes(body.deal_momentum)) {
        return NextResponse.json(
          { error: `Invalid momentum. Valid values: ${VALID_MOMENTUM.join(', ')}` },
          { status: 400 }
        );
      }
      updates.deal_momentum = body.deal_momentum;
    }

    // Other updatable fields
    const allowedFields = [
      'org_name',
      'deal_value',
      'sales_poc',
      'domain',
      'region',
      'trial_start_date',
      'trial_end_date',
      'demo_date',
      'notes',
      'prospect_source',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Always update updated_at
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 1) {
      // Only updated_at, no actual changes
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: updatedOrg, error } = await supabase
      .from('trial_organizations')
      .update(updates)
      .eq('org_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
      console.error('Error updating organization:', error);
      return NextResponse.json({ error: 'Failed to update organization', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      message: 'Organization updated successfully',
    });
  } catch (error) {
    console.error('Organization update error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
