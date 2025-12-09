// Deal Momentum API - Update org deal momentum signals
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

type RouteContext = { params: Promise<{ orgId: string }> };

const MOMENTUM_TYPES = ['positive', 'neutral', 'stalled', 'at_risk'] as const;

// GET /api/momentum/[orgId] - Get org's momentum status
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

    const { orgId } = await context.params;

    const { data, error } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, deal_momentum, last_momentum_signal, momentum_updated_at')
      .eq('org_id', orgId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
      console.error('Error fetching momentum:', error);
      return NextResponse.json({ error: 'Failed to fetch momentum' }, { status: 500 });
    }

    return NextResponse.json({ momentum: data });
  } catch (error) {
    console.error('Error fetching momentum:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/momentum/[orgId] - Update org's momentum
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

    const { orgId } = await context.params;
    const body = await request.json();
    const { deal_momentum, last_momentum_signal } = body;

    // Validate momentum type
    if (deal_momentum && !MOMENTUM_TYPES.includes(deal_momentum)) {
      return NextResponse.json(
        { error: `Invalid momentum type. Must be one of: ${MOMENTUM_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      momentum_updated_at: new Date().toISOString(),
    };

    if (deal_momentum !== undefined) updates.deal_momentum = deal_momentum;
    if (last_momentum_signal !== undefined) updates.last_momentum_signal = last_momentum_signal;

    const { data, error } = await supabase
      .from('trial_organizations')
      .update(updates)
      .eq('org_id', orgId)
      .select('org_id, org_name, deal_momentum, last_momentum_signal, momentum_updated_at')
      .single();

    if (error) {
      console.error('Error updating momentum:', error);
      return NextResponse.json({ error: 'Failed to update momentum' }, { status: 500 });
    }

    return NextResponse.json({ momentum: data });
  } catch (error) {
    console.error('Error updating momentum:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
