// Follow-ups API - Upcoming and overdue follow-ups
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// GET /api/follow-ups/upcoming - Get upcoming follow-ups for dashboard
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;
    const days = parseInt(searchParams.get('days') || '7');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // Get overdue follow-ups
    const { data: overdue, error: overdueError } = await supabase
      .from('follow_ups')
      .select(`
        *,
        trial_organizations (org_name, org_lifecycle_stage)
      `)
      .eq('status', 'pending')
      .eq('created_by', userId)
      .lt('due_date', todayStr)
      .order('due_date', { ascending: true })
      .limit(10);

    if (overdueError) {
      console.error('Error fetching overdue follow-ups:', overdueError);
    }

    // Get today's follow-ups
    const { data: todayFollowups, error: todayError } = await supabase
      .from('follow_ups')
      .select(`
        *,
        trial_organizations (org_name, org_lifecycle_stage)
      `)
      .eq('status', 'pending')
      .eq('created_by', userId)
      .eq('due_date', todayStr)
      .order('priority', { ascending: false })
      .limit(10);

    if (todayError) {
      console.error('Error fetching today follow-ups:', todayError);
    }

    // Get upcoming follow-ups (next N days, excluding today)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: upcoming, error: upcomingError } = await supabase
      .from('follow_ups')
      .select(`
        *,
        trial_organizations (org_name, org_lifecycle_stage)
      `)
      .eq('status', 'pending')
      .eq('created_by', userId)
      .gte('due_date', tomorrowStr)
      .lte('due_date', futureDateStr)
      .order('due_date', { ascending: true })
      .limit(20);

    if (upcomingError) {
      console.error('Error fetching upcoming follow-ups:', upcomingError);
    }

    // Get counts for summary
    const { count: totalPending } = await supabase
      .from('follow_ups')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('created_by', userId);

    const { count: overdueCount } = await supabase
      .from('follow_ups')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('created_by', userId)
      .lt('due_date', todayStr);

    return NextResponse.json({
      overdue: overdue || [],
      today: todayFollowups || [],
      upcoming: upcoming || [],
      summary: {
        total_pending: totalPending || 0,
        overdue_count: overdueCount || 0,
        today_count: todayFollowups?.length || 0,
        upcoming_count: upcoming?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching upcoming follow-ups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
