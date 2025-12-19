import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Capture a pipeline snapshot
// This endpoint can be triggered by a cron job or manually
export async function POST(request: NextRequest) {
  try {
    // Optional: Check for a secret header for cron job authentication
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is configured, validate it
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // First, delete any existing snapshot for today (in case we're re-running)
    await supabase
      .from('pipeline_snapshots')
      .delete()
      .eq('snapshot_date', today);

    // Get current pipeline counts and values by stage
    const { data: pipelineData, error: fetchError } = await supabase
      .from('sales_pipeline')
      .select('stage, deal_value');

    if (fetchError) {
      console.error('Failed to fetch pipeline data:', fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    // Aggregate by stage
    const stageStats: Record<string, { count: number; total_value: number }> = {};

    for (const entry of pipelineData || []) {
      const stage = entry.stage || 'unknown';
      if (!stageStats[stage]) {
        stageStats[stage] = { count: 0, total_value: 0 };
      }
      stageStats[stage].count += 1;
      stageStats[stage].total_value += entry.deal_value || 0;
    }

    // Insert snapshot records
    const snapshotRecords = Object.entries(stageStats).map(([stage, stats]) => ({
      snapshot_date: today,
      stage,
      count: stats.count,
      total_value: stats.total_value,
    }));

    if (snapshotRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('pipeline_snapshots')
        .insert(snapshotRecords);

      if (insertError) {
        console.error('Failed to insert snapshot:', insertError);
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      snapshot_date: today,
      stages_captured: snapshotRecords.length,
      data: snapshotRecords,
    });
  } catch (error) {
    console.error('Pipeline snapshot error:', error);
    return NextResponse.json(
      { error: 'Failed to capture snapshot' },
      { status: 500 }
    );
  }
}

// GET - Fetch snapshot data for trend analysis
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('pipeline_snapshots')
      .select('*')
      .gte('snapshot_date', startDateStr)
      .order('snapshot_date', { ascending: true });

    if (error) {
      console.error('Failed to fetch snapshots:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by date for easier consumption
    const byDate: Record<string, Record<string, { count: number; total_value: number }>> = {};

    for (const snapshot of data || []) {
      const date = snapshot.snapshot_date;
      if (!byDate[date]) {
        byDate[date] = {};
      }
      byDate[date][snapshot.stage] = {
        count: snapshot.count,
        total_value: parseFloat(snapshot.total_value) || 0,
      };
    }

    // Convert to array format for charts
    const chartData = Object.entries(byDate).map(([date, stages]) => ({
      date,
      ...Object.entries(stages).reduce(
        (acc, [stage, stats]) => ({
          ...acc,
          [`${stage}_count`]: stats.count,
          [`${stage}_value`]: stats.total_value,
        }),
        {}
      ),
    }));

    return NextResponse.json({
      data: chartData,
      raw: data,
      days,
      startDate: startDateStr,
    });
  } catch (error) {
    console.error('Snapshot GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}
