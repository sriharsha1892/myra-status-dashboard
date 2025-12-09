// Stakeholder Influence API - Update user influence/role
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

type RouteContext = { params: Promise<{ userId: string }> };

const INFLUENCE_TYPES = ['champion', 'blocker', 'decision_maker', 'evaluator', 'influencer', 'unknown'] as const;

// GET /api/stakeholders/[userId] - Get user's influence status
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

    const { userId } = await context.params;

    const { data, error } = await supabase
      .from('trial_users')
      .select('user_id, name, email, role, influence, org_id')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      console.error('Error fetching stakeholder:', error);
      return NextResponse.json({ error: 'Failed to fetch stakeholder' }, { status: 500 });
    }

    return NextResponse.json({ stakeholder: data });
  } catch (error) {
    console.error('Error fetching stakeholder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/stakeholders/[userId] - Update user's influence
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

    const { userId } = await context.params;
    const body = await request.json();
    const { influence } = body;

    // Validate influence type
    if (influence && !INFLUENCE_TYPES.includes(influence)) {
      return NextResponse.json(
        { error: `Invalid influence type. Must be one of: ${INFLUENCE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update object - only include influence column (influence_notes may not exist)
    const updates: Record<string, unknown> = {};

    if (influence !== undefined) updates.influence = influence;

    const { data, error } = await supabase
      .from('trial_users')
      .update(updates)
      .eq('user_id', userId)
      .select('user_id, name, email, role, influence')
      .single();

    if (error) {
      console.error('Error updating stakeholder:', error);
      return NextResponse.json({ error: 'Failed to update stakeholder' }, { status: 500 });
    }

    return NextResponse.json({ stakeholder: data });
  } catch (error) {
    console.error('Error updating stakeholder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
