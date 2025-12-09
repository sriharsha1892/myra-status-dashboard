// Run Scheduled Report API - Manually trigger a report
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReport, ReportType } from '@/lib/reports/generator';
import { createReportCard, sendReportToTeams } from '@/lib/teams/reportCards';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/reports/scheduled/[id]/run - Execute report immediately
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const startTime = Date.now();

  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get scheduled report config
    const { data: report, error: reportError } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('report_executions')
      .insert({
        scheduled_report_id: id,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (execError) {
      console.error('Error creating execution record:', execError);
      return NextResponse.json({ error: 'Failed to start execution' }, { status: 500 });
    }

    try {
      // Generate the report
      const reportData = await generateReport(
        supabase,
        report.report_type as ReportType,
        report.filters || {},
        report.max_items || 10
      );

      // Create card based on format
      const card = createReportCard(
        reportData,
        report.format || 'adaptive_card'
      );

      let recipientsNotified = 0;
      let deliveryError: string | null = null;

      // Send to Teams if configured
      if ((report.delivery_method === 'teams' || report.delivery_method === 'both') && report.teams_webhook_url) {
        const teamsResult = await sendReportToTeams(report.teams_webhook_url, card);
        if (teamsResult.success) {
          recipientsNotified++;
        } else {
          deliveryError = teamsResult.error || 'Failed to send to Teams';
        }
      }

      // Calculate next run time
      const nextRunAt = calculateNextRun(report.schedule_type, report.schedule_config || {});

      // Update execution record - success
      const executionTime = Date.now() - startTime;
      await supabase
        .from('report_executions')
        .update({
          status: deliveryError ? 'partial' : 'success',
          completed_at: new Date().toISOString(),
          report_data: reportData,
          recipients_notified: recipientsNotified,
          error_message: deliveryError,
          execution_time_ms: executionTime,
          data_rows_processed: reportData.summary?.total_items || 0,
        })
        .eq('id', execution.id);

      // Update scheduled report stats
      await supabase
        .from('scheduled_reports')
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: deliveryError ? 'partial' : 'success',
          last_error: deliveryError,
          next_run_at: nextRunAt,
          total_runs: (report.total_runs || 0) + 1,
          successful_runs: deliveryError ? report.successful_runs : (report.successful_runs || 0) + 1,
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        execution_id: execution.id,
        report_data: reportData,
        delivery: {
          teams: report.teams_webhook_url ? (deliveryError ? 'failed' : 'sent') : 'not_configured',
          error: deliveryError,
        },
        execution_time_ms: executionTime,
      });
    } catch (generateError) {
      // Update execution record - failure
      const executionTime = Date.now() - startTime;
      const errorMessage = generateError instanceof Error ? generateError.message : 'Unknown error';

      await supabase
        .from('report_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
          execution_time_ms: executionTime,
        })
        .eq('id', execution.id);

      // Update scheduled report error status
      await supabase
        .from('scheduled_reports')
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: 'failed',
          last_error: errorMessage,
          total_runs: (report.total_runs || 0) + 1,
        })
        .eq('id', id);

      console.error('Error generating report:', generateError);
      return NextResponse.json({
        success: false,
        error: errorMessage,
        execution_id: execution.id,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error running scheduled report:', error);
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
