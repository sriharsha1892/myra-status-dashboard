// Scheduled Reports API - CRUD for report schedules
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

const REPORT_TYPES = [
  'trial_summary',
  'engagement',
  'pipeline',
  'at_risk',
  'activity',
  'follow_ups',
  'team_performance',
  'custom'
] as const;

const SCHEDULE_TYPES = ['daily', 'weekly', 'monthly', 'custom'] as const;
const DELIVERY_METHODS = ['teams', 'email', 'both'] as const;
const FORMATS = ['adaptive_card', 'summary_text', 'detailed'] as const;

// GET /api/reports/scheduled - List scheduled reports
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const is_active = searchParams.get('is_active');
    const report_type = searchParams.get('report_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('scheduled_reports')
      .select(`
        *,
        created_by_user:users!scheduled_reports_created_by_fkey(id, email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    if (report_type) {
      query = query.eq('report_type', report_type);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching scheduled reports:', error);
      return NextResponse.json({ error: 'Failed to fetch scheduled reports' }, { status: 500 });
    }

    // Get stats
    const { data: activeReports } = await supabase
      .from('scheduled_reports')
      .select('id')
      .eq('is_active', true);

    const { data: recentExecutions } = await supabase
      .from('report_executions')
      .select('status')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const executionStats = {
      total: recentExecutions?.length || 0,
      success: recentExecutions?.filter((e: any) => e.status === 'success').length || 0,
      failed: recentExecutions?.filter((e: any) => e.status === 'failed').length || 0
    };

    return NextResponse.json({
      reports: data || [],
      stats: {
        activeReports: activeReports?.length || 0,
        last24hExecutions: executionStats
      }
    });
  } catch (error) {
    console.error('Error in scheduled reports API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/reports/scheduled - Create scheduled report
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      name,
      description,
      report_type,
      schedule_type,
      schedule_config,
      delivery_method,
      recipients,
      teams_webhook_url,
      teams_channel_id,
      filters,
      format,
      include_charts,
      max_items
    } = body;

    // Validations
    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (!report_type || !REPORT_TYPES.includes(report_type)) {
      return NextResponse.json(
        { error: `Invalid report_type. Must be one of: ${REPORT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!schedule_type || !SCHEDULE_TYPES.includes(schedule_type)) {
      return NextResponse.json(
        { error: `Invalid schedule_type. Must be one of: ${SCHEDULE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (delivery_method && !DELIVERY_METHODS.includes(delivery_method)) {
      return NextResponse.json(
        { error: `Invalid delivery_method. Must be one of: ${DELIVERY_METHODS.join(', ')}` },
        { status: 400 }
      );
    }

    if (format && !FORMATS.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // Calculate next run time
    const next_run_at = calculateNextRun(schedule_type, schedule_config || {});

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        name: name.trim(),
        description: description || null,
        report_type,
        schedule_type,
        schedule_config: schedule_config || {},
        delivery_method: delivery_method || 'teams',
        recipients: recipients || [],
        teams_webhook_url: teams_webhook_url || null,
        teams_channel_id: teams_channel_id || null,
        filters: filters || {},
        format: format || 'adaptive_card',
        include_charts: include_charts || false,
        max_items: max_items || 10,
        is_active: true,
        next_run_at,
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating scheduled report:', error);
      return NextResponse.json({ error: 'Failed to create scheduled report' }, { status: 500 });
    }

    return NextResponse.json({ report: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating scheduled report:', error);
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
      // If time has passed today, schedule for tomorrow
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
      // For custom, default to next day
      nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun.toISOString();
}
