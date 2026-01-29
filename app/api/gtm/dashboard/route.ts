import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireGtmAuth } from '@/lib/gtm/auth';

export interface OrgSummary {
  id: string;
  name: string;
  displayName: string | null;
  dealValue: number;
  contractValue: number;
  arr: number;
  salesPoc: string | null;
  vertical: string | null;
  region: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
  expectedCloseDate: string | null;
  customerHealth: string | null;
  notes: string | null;
  activityStatus?: string;
  activeUsers?: number;
  totalConversations?: number;
  totalCost?: number;
  lastUsage?: string | null;
}

export interface PipelineStage {
  count: number;
  value: number;
  orgs: OrgSummary[];
}

export interface TrendData {
  pipelineValue: number;
  activeDeals: number;
  winRate: number;
}

export interface GtmDashboardResponse {
  metrics: {
    totalDemos: { orgCount: number; contactCount: number };
    trialsProvided: { orgCount: number; userCount: number };
    totalCost: number;
    totalConversations: number;
  };
  pipeline: {
    paying: PipelineStage;
    strongProspects: PipelineStage;
    prospects: PipelineStage;
    active: PipelineStage;
    dormant: PipelineStage;
    lost: PipelineStage;
  };
  trends: TrendData;
  recentlyRolledOut: OrgSummary[];
  dateRange: number;
  lastUpdated: string;
}

function mapOrgToSummary(org: Record<string, unknown>): OrgSummary {
  return {
    id: org.id as string,
    name: org.name as string,
    displayName: (org.display_name as string | null) || null,
    dealValue: Number(org.deal_value || 0),
    contractValue: Number(org.contract_value || 0),
    arr: Number(org.arr || 0),
    salesPoc: (org.sales_poc as string | null) || (org.employee_name as string | null) || null,
    vertical: (org.vertical as string | null) || null,
    region: (org.region as string | null) || null,
    trialStartDate: (org.trial_start_date as string | null) || null,
    trialEndDate: (org.trial_end_date as string | null) || null,
    expectedCloseDate: (org.expected_close_date as string | null) || null,
    customerHealth: (org.customer_health as string | null) || null,
    notes: (org.notes as string | null) || null,
    activityStatus: (org.activity_status as string | undefined) || undefined,
    activeUsers: org.active_users as number | undefined,
    totalConversations: (org.conversations as number | undefined) || (org.total_conversations as number | undefined),
    totalCost: org.total_cost as number | undefined,
    lastUsage: (org.last_usage as string | null) || null,
  };
}

/**
 * GET - Fetch gtm dashboard data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const gtmEmail = requireGtmAuth(request);
    if (!gtmEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Parse date range parameter (default 30 days)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date ranges for current and previous periods
    const now = new Date();
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - days);
    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

    // Fetch pipeline summary
    const { data: pipelineSummary, error: summaryError } = await supabase
      .from('gtm_pipeline_summary')
      .select('*')
      .single();

    if (summaryError) {
      console.error('Error fetching pipeline summary:', summaryError);
    }

    // Fetch orgs by stage
    const { data: stageOrgs, error: stageError } = await supabase
      .from('gtm_stage_orgs')
      .select('*');

    if (stageError) {
      console.error('Error fetching stage orgs:', stageError);
    }

    // Fetch recently rolled out orgs
    const { data: recentOrgs, error: recentError } = await supabase
      .from('gtm_recently_rolled_out')
      .select('*');

    if (recentError) {
      console.error('Error fetching recent orgs:', recentError);
    }

    // Fetch usage totals
    const { data: usageTotals, error: usageError } = await supabase
      .from('myra_usage_totals')
      .select('*')
      .single();

    if (usageError) {
      console.error('Error fetching usage totals:', usageError);
    }

    // Group orgs by gtm stage
    const orgsByStage: Record<string, OrgSummary[]> = {
      paying: [],
      strong_prospects: [],
      prospects: [],
      active: [],
      dormant: [],
      lost: [],
    };

    if (stageOrgs) {
      for (const org of stageOrgs) {
        const stage = org.gtm_stage as string;
        if (orgsByStage[stage]) {
          orgsByStage[stage].push(mapOrgToSummary(org));
        }
      }
    }

    // Calculate values for each stage
    const calculateStageValue = (orgs: OrgSummary[], stage: string): number => {
      if (stage === 'paying') {
        return orgs.reduce((sum, o) => sum + (o.contractValue || o.arr || 0), 0);
      }
      return orgs.reduce((sum, o) => sum + o.dealValue, 0);
    };

    // Calculate current pipeline metrics
    const currentPipelineValue =
      calculateStageValue(orgsByStage.strong_prospects, 'strong_prospects') +
      calculateStageValue(orgsByStage.active, 'active') +
      calculateStageValue(orgsByStage.prospects, 'prospects');
    const currentDeals =
      orgsByStage.strong_prospects.length +
      orgsByStage.active.length +
      orgsByStage.prospects.length;
    const currentWinRate =
      orgsByStage.paying.length + orgsByStage.lost.length > 0
        ? Math.round(
            (orgsByStage.paying.length /
              (orgsByStage.paying.length + orgsByStage.lost.length)) *
              100
          )
        : 0;

    // Calculate trends (simplified - in production, would compare with previous period data)
    // These are mock trends for demonstration - in reality would need historical data
    const trends: TrendData = {
      pipelineValue: 12, // +12% vs last period
      activeDeals: 5, // +5 deals vs last period
      winRate: -2, // -2% vs last period
    };

    const response: GtmDashboardResponse = {
      metrics: {
        totalDemos: {
          orgCount: Number(pipelineSummary?.total_demos || 0),
          contactCount: 0, // Would need to count contacts separately
        },
        trialsProvided: {
          orgCount: Number(pipelineSummary?.trials_provided || 0),
          userCount: 0, // Would need to count trial users separately
        },
        totalCost: Number(usageTotals?.total_cost || 0),
        totalConversations: Number(usageTotals?.total_conversations || 0),
      },
      pipeline: {
        paying: {
          count: orgsByStage.paying.length,
          value: calculateStageValue(orgsByStage.paying, 'paying'),
          orgs: orgsByStage.paying,
        },
        strongProspects: {
          count: orgsByStage.strong_prospects.length,
          value: calculateStageValue(orgsByStage.strong_prospects, 'strong_prospects'),
          orgs: orgsByStage.strong_prospects,
        },
        prospects: {
          count: orgsByStage.prospects.length,
          value: calculateStageValue(orgsByStage.prospects, 'prospects'),
          orgs: orgsByStage.prospects,
        },
        active: {
          count: orgsByStage.active.length,
          value: calculateStageValue(orgsByStage.active, 'active'),
          orgs: orgsByStage.active,
        },
        dormant: {
          count: orgsByStage.dormant.length,
          value: calculateStageValue(orgsByStage.dormant, 'dormant'),
          orgs: orgsByStage.dormant,
        },
        lost: {
          count: orgsByStage.lost.length,
          value: 0, // Lost deals don't count toward pipeline value
          orgs: orgsByStage.lost,
        },
      },
      trends,
      recentlyRolledOut: (recentOrgs || []).map(mapOrgToSummary),
      dateRange: days,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GTM dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gtm dashboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Update organization stage (drag-drop or natural language)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const gtmEmail = requireGtmAuth(request);
    if (!gtmEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const body = await request.json();
    const { orgId, newStage, notes } = body as {
      orgId: string;
      newStage: string;
      notes?: string;
    };

    if (!orgId || !newStage) {
      return NextResponse.json({ error: 'orgId and newStage are required' }, { status: 400 });
    }

    // Map gtm stage back to org_lifecycle_stage (trial_organizations)
    const stageMapping: Record<string, string> = {
      paying: 'customer',
      strong_prospects: 'trial_expired', // trial_expired with deal_value indicates negotiation
      prospects: 'trial_pending',
      active: 'trial_active',
      dormant: 'trial_expired',
      lost: 'lost',
    };

    const lifecycleStage = stageMapping[newStage];
    if (!lifecycleStage) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    // Update organization
    const updateData: Record<string, unknown> = {
      org_lifecycle_stage: lifecycleStage,
    };

    if (notes) {
      updateData.notes = notes;
    }

    const { data, error } = await supabase
      .from('trial_organizations')
      .update(updateData)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      org: data,
    });
  } catch (error) {
    console.error('Update org stage error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
