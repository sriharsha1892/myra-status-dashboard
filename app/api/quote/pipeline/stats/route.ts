import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch pipeline statistics (counts per stage)
export async function GET() {
  try {
    // Get counts per stage
    const { data: stageData, error: stageError } = await supabase
      .from('sales_pipeline')
      .select('stage');

    if (stageError) {
      console.error('Stats fetch error:', stageError);
      return NextResponse.json({ error: stageError.message }, { status: 500 });
    }

    // Count by stage
    const stageCounts: Record<string, number> = {
      prospect: 0,
      demo: 0,
      trial: 0,
      quote: 0,
      msa: 0,
      onboarded: 0,
    };

    for (const entry of stageData || []) {
      if (entry.stage && stageCounts.hasOwnProperty(entry.stage)) {
        stageCounts[entry.stage]++;
      }
    }

    // Get total value by stage
    const { data: valueData, error: valueError } = await supabase
      .from('sales_pipeline')
      .select('stage, deal_value');

    const stageValues: Record<string, number> = {
      prospect: 0,
      demo: 0,
      trial: 0,
      quote: 0,
      msa: 0,
      onboarded: 0,
    };

    if (!valueError && valueData) {
      for (const entry of valueData) {
        if (entry.stage && entry.deal_value && stageValues.hasOwnProperty(entry.stage)) {
          stageValues[entry.stage] += Number(entry.deal_value) || 0;
        }
      }
    }

    // Get recent activity
    const { data: activityData } = await supabase
      .from('pipeline_activity_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      counts: stageCounts,
      values: stageValues,
      total: stageData?.length || 0,
      recentActivity: activityData || [],
    });
  } catch (error) {
    console.error('Stats GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline stats' },
      { status: 500 }
    );
  }
}
