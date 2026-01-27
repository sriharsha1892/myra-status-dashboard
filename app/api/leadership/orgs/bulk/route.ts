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

interface BulkUpdateRequest {
  org_ids: string[];
  updates: {
    org_lifecycle_stage?: string;
    deal_momentum?: string;
    sales_poc?: string;
  };
}

/**
 * POST - Bulk update multiple organizations
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check leadership access
    if (!isLeadershipEmail(user.email)) {
      return NextResponse.json({ error: 'Access denied. Leadership access required.' }, { status: 403 });
    }

    const body: BulkUpdateRequest = await request.json();

    // Validate org_ids
    if (!body.org_ids || !Array.isArray(body.org_ids) || body.org_ids.length === 0) {
      return NextResponse.json({ error: 'org_ids array is required' }, { status: 400 });
    }

    if (body.org_ids.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 organizations per request' }, { status: 400 });
    }

    // Validate updates object
    if (!body.updates || typeof body.updates !== 'object') {
      return NextResponse.json({ error: 'updates object is required' }, { status: 400 });
    }

    // Build validated updates
    const updates: Record<string, unknown> = {};

    // Stage validation
    if (body.updates.org_lifecycle_stage !== undefined) {
      if (body.updates.org_lifecycle_stage && !VALID_STAGES.includes(body.updates.org_lifecycle_stage)) {
        return NextResponse.json(
          { error: `Invalid stage. Valid stages: ${VALID_STAGES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.org_lifecycle_stage = body.updates.org_lifecycle_stage;
    }

    // Momentum validation
    if (body.updates.deal_momentum !== undefined) {
      if (body.updates.deal_momentum && !VALID_MOMENTUM.includes(body.updates.deal_momentum)) {
        return NextResponse.json(
          { error: `Invalid momentum. Valid values: ${VALID_MOMENTUM.join(', ')}` },
          { status: 400 }
        );
      }
      updates.deal_momentum = body.updates.deal_momentum;
    }

    // Sales POC (no validation needed, just string)
    if (body.updates.sales_poc !== undefined) {
      updates.sales_poc = body.updates.sales_poc;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    // Perform bulk update
    const { data, error } = await supabase
      .from('trial_organizations')
      .update(updates)
      .in('org_id', body.org_ids)
      .select('org_id');

    if (error) {
      console.error('Error bulk updating organizations:', error);
      return NextResponse.json({ error: 'Failed to update organizations', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      message: `Successfully updated ${data?.length || 0} organizations`,
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: 'Failed to update organizations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
