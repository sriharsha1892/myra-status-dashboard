// Team Capacity API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTeamCapacities, updateTeamCapacity } from '@/lib/assignment/service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// GET /api/assignment/capacity - Get all team capacities
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const capacities = await getTeamCapacities();

    return NextResponse.json({ capacities });
  } catch (error) {
    console.error('Error fetching team capacities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team capacities' },
      { status: 500 }
    );
  }
}

// POST /api/assignment/capacity - Update user capacity
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, ...updates } = body;

    // Users can only update their own capacity unless admin
    const targetUserId = user_id || user.id;

    if (targetUserId !== user.id) {
      // Check if user is admin
      const { data: userData } = await supabase
        .from('users')
        .select('role, is_super_admin')
        .eq('id', user.id)
        .single();

      if (!userData?.is_super_admin && userData?.role !== 'Admin') {
        return NextResponse.json(
          { error: 'Not authorized to update other users capacity' },
          { status: 403 }
        );
      }
    }

    const capacity = await updateTeamCapacity(targetUserId, updates);

    return NextResponse.json({ capacity });
  } catch (error) {
    console.error('Error updating team capacity:', error);
    return NextResponse.json(
      { error: 'Failed to update team capacity' },
      { status: 500 }
    );
  }
}
