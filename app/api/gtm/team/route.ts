import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireGtmAuth } from '@/lib/gtm/auth';

export interface TeamMember {
  salesPoc: string;
  totalOrgs: number;
  wonDeals: number;
  demos: number;
  trials: number;
  inNegotiation: number;
  lost: number;
  pipelineValue: number;
  wonValue: number;
  totalArr: number;
  trialToWonRate: number;
  avgDaysInPipeline: number;
}

export interface TeamPerformanceResponse {
  team: TeamMember[];
  summary: {
    totalReps: number;
    totalPipelineValue: number;
    totalWonValue: number;
    totalArr: number;
    avgTrialToWonRate: number;
    topPerformer: string | null;
  };
}

function mapTeamMember(data: Record<string, unknown>): TeamMember {
  return {
    salesPoc: data.sales_poc as string,
    totalOrgs: Number(data.total_orgs || 0),
    wonDeals: Number(data.won_deals || 0),
    demos: Number(data.demos || 0),
    trials: Number(data.trials || 0),
    inNegotiation: Number(data.in_negotiation || 0),
    lost: Number(data.lost || 0),
    pipelineValue: Number(data.pipeline_value || 0),
    wonValue: Number(data.won_value || 0),
    totalArr: Number(data.total_arr || 0),
    trialToWonRate: Number(data.trial_to_won_rate || 0),
    avgDaysInPipeline: Number(data.avg_days_in_pipeline || 0),
  };
}

/**
 * GET - Fetch team performance metrics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const gtmEmail = requireGtmAuth(request);
    if (!gtmEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'won_value';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? true : false;

    // Fetch team performance
    const { data: teamData, error: teamError } = await supabase
      .from('gtm_team_performance')
      .select('*')
      .order(sortBy, { ascending: sortOrder });

    if (teamError) {
      throw teamError;
    }

    const team = (teamData || []).map(mapTeamMember);

    // Calculate summary
    const totalPipelineValue = team.reduce((sum, m) => sum + m.pipelineValue, 0);
    const totalWonValue = team.reduce((sum, m) => sum + m.wonValue, 0);
    const totalArr = team.reduce((sum, m) => sum + m.totalArr, 0);
    const avgTrialToWonRate = team.length > 0
      ? team.reduce((sum, m) => sum + m.trialToWonRate, 0) / team.length
      : 0;

    // Find top performer by won value
    const topPerformer = team.length > 0
      ? team.reduce((best, m) => m.wonValue > best.wonValue ? m : best, team[0]).salesPoc
      : null;

    const response: TeamPerformanceResponse = {
      team,
      summary: {
        totalReps: team.length,
        totalPipelineValue,
        totalWonValue,
        totalArr,
        avgTrialToWonRate,
        topPerformer,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Team performance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team performance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Get detailed breakdown for a specific sales POC
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { salesPoc } = body;

    if (!salesPoc) {
      return NextResponse.json({ error: 'salesPoc is required' }, { status: 400 });
    }

    // Fetch orgs for this sales POC
    const { data: orgs, error: orgsError } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('sales_poc', salesPoc)
      .order('updated_at', { ascending: false });

    if (orgsError) {
      throw orgsError;
    }

    // Group by stage
    const byStage: Record<string, typeof orgs> = {};
    for (const org of orgs || []) {
      const stage = org.org_lifecycle_stage;
      if (!byStage[stage]) {
        byStage[stage] = [];
      }
      byStage[stage].push(org);
    }

    // Calculate stage transitions over time (simplified - would need more data for real trends)
    const stageHistory = (orgs || []).map((org) => ({
      orgId: org.org_id,
      orgName: org.org_name,
      currentStage: org.org_lifecycle_stage,
      stageUpdatedAt: org.updated_at,
      createdAt: org.created_at,
      dealValue: org.deal_value,
    }));

    return NextResponse.json({
      success: true,
      salesPoc,
      totalOrgs: (orgs || []).length,
      byStage,
      stageHistory,
    });
  } catch (error) {
    console.error('Sales POC detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales POC details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
