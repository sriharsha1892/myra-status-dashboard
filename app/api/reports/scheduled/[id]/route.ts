// Individual Scheduled Report API - GET, PATCH, DELETE
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

type RouteContext = { params: Promise<{ id: string }> };

const REPORT_TYPES = [
  'trial_summary', 'engagement', 'pipeline', 'at_risk',
  'activity', 'follow_ups', 'team_performance', 'custom'
] as const;

const SCHEDULE_TYPES = ['daily', 'weekly', 'monthly', 'custom'] as const;
const DELIVERY_METHODS = ['teams', 'email', 'both'] as const;
const FORMATS = ['adaptive_card', 'summary_text', 'detailed'] as const;

// GET /api/reports/scheduled/[id] - Get single report with execution history
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

    const { data: report, error } = await supabase
      .from('scheduled_reports')
      .select(`
        *,
        created_by_user:users!scheduled_reports_created_by_fkey(id, email, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      console.error('Error fetching scheduled report:', error);
      return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }

    // Get recent executions
    const { data: executions } = await supabase
      .from('report_executions')
      .select('*')
      .eq('scheduled_report_id', id)
      .order('started_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      report,
      executions: executions || []
    });
  } catch (error) {
    console.error('Error fetching scheduled report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/reports/scheduled/[id] - Update scheduled report
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

    // Check admin permission
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single();

    if (!userData || (userData.role !== 'Admin' && !userData.is_super_admin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Validate fields if provided
    if (body.report_type && !REPORT_TYPES.includes(body.report_type)) {
      return NextResponse.json(
        { error: `Invalid report_type. Must be one of: ${REPORT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.schedule_type && !SCHEDULE_TYPES.includes(body.schedule_type)) {
      return NextResponse.json(
        { error: `Invalid schedule_type. Must be one of: ${SCHEDULE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.delivery_method && !DELIVERY_METHODS.includes(body.delivery_method)) {
      return NextResponse.json(
        { error: `Invalid delivery_method. Must be one of: ${DELIVERY_METHODS.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.format && !FORMATS.includes(body.format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = { updated_by: user.id };
    const allowedFields = [
      'name', 'description', 'report_type', 'schedule_type', 'schedule_config',
      'delivery_method', 'recipients', 'teams_webhook_url', 'teams_channel_id',
      'filters', 'format', 'include_charts', 'max_items', 'is_active'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Recalculate next_run_at if schedule changed
    if (body.schedule_type || body.schedule_config) {
      const { data: existing } = await supabase
        .from('scheduled_reports')
        .select('schedule_type, schedule_config')
        .eq('id', id)
        .single();

      if (existing) {
        const scheduleType = body.schedule_type || existing.schedule_type;
        const scheduleConfig = body.schedule_config || existing.schedule_config;
        updates.next_run_at = calculateNextRun(scheduleType, scheduleConfig);
      }
    }

    const { data, error } = await supabase
      .from('scheduled_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating scheduled report:', error);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    return NextResponse.json({ report: data });
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/reports/scheduled/[id] - Delete scheduled report
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

    // Check admin permission
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single();

    if (!userData || (userData.role !== 'Admin' && !userData.is_super_admin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;

    const { error } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting scheduled report:', error);
      return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate next run time
function calculateNextRun(
  scheduleType: string,
  config: Record<string, any>
): string {
  const now = new Date();
  const time = config.time || '09:00';
  const [hours, minutes] = time.split(':').map(Number);

  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  switch (scheduleType) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'weekly':
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6
      };
      const targetDay = dayMap[config.day?.toLowerCase() || 'monday'];
      const currentDay = now.getDay();
      let daysUntilTarget = (targetDay - currentDay + 7) % 7;
      if (daysUntilTarget === 0 && nextRun <= now) {
        daysUntilTarget = 7;
      }
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      break;

    case 'monthly':
      const dayOfMonth = config.day_of_month || 1;
      nextRun.setDate(dayOfMonth);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;

    default:
      nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun.toISOString();
}
