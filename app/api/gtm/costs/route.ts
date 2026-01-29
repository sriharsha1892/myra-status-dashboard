import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireGtmAuth } from '@/lib/gtm/auth';

export interface CostsByOrgEntry {
  orgId: string;
  orgName: string;
  displayName: string | null;
  stage: string;
  vertical: string | null;
  salesPoc: string | null;
  userCount: number;
  conversations: number;
  cost: number;
  firstUsage: string | null;
  lastUsage: string | null;
}

export interface GtmCostsResponse {
  summary: {
    totalCost: number;
    totalConversations: number;
    totalUsers: number;
    avgCostPerOrg: number;
    avgCostPerConversation: number;
  };
  byOrg: CostsByOrgEntry[];
  byDate: Array<{
    date: string;
    cost: number;
    conversations: number;
    uniqueUsers: number;
  }>;
}

/**
 * GET - Fetch costs breakdown for gtm dashboard
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const gtmEmail = requireGtmAuth(request);
    if (!gtmEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch costs by org
    const { data: costsByOrg, error: costsError } = await supabase
      .from('gtm_costs_by_org')
      .select('*')
      .order('total_cost', { ascending: false });

    if (costsError) {
      console.error('Error fetching costs by org:', costsError);
    }

    // Fetch usage totals
    const { data: usageTotals, error: totalsError } = await supabase
      .from('myra_usage_totals')
      .select('*')
      .single();

    if (totalsError) {
      console.error('Error fetching usage totals:', totalsError);
    }

    // Fetch usage by date for the chart
    const { data: usageByDate, error: dateError } = await supabase
      .from('myra_usage_summary')
      .select('*')
      .gte('usage_date', startDate.toISOString().split('T')[0])
      .order('usage_date', { ascending: true });

    if (dateError) {
      console.error('Error fetching usage by date:', dateError);
    }

    // Transform costs by org
    const byOrg: CostsByOrgEntry[] = (costsByOrg || []).map((item) => ({
      orgId: item.org_id as string,
      orgName: item.org_name as string,
      displayName: (item.display_name as string | null) || null,
      stage: item.lifecycle_stage as string,
      vertical: (item.vertical as string | null) || null,
      salesPoc: (item.sales_poc as string | null) || null,
      userCount: Number(item.user_count || 0),
      conversations: Number(item.total_conversations || 0),
      cost: Number(item.total_cost || 0),
      firstUsage: (item.first_usage as string | null) || null,
      lastUsage: (item.last_usage as string | null) || null,
    }));

    // Calculate summary
    const totalCost = Number(usageTotals?.total_cost || 0);
    const totalConversations = Number(usageTotals?.total_conversations || 0);
    const totalUsers = Number(usageTotals?.total_users || 0);
    const orgsWithUsage = byOrg.filter((o) => o.cost > 0).length;

    const response: GtmCostsResponse = {
      summary: {
        totalCost,
        totalConversations,
        totalUsers,
        avgCostPerOrg: orgsWithUsage > 0 ? totalCost / orgsWithUsage : 0,
        avgCostPerConversation: totalConversations > 0 ? totalCost / totalConversations : 0,
      },
      byOrg,
      byDate: (usageByDate || []).map((item) => ({
        date: item.usage_date as string,
        cost: Number(item.total_cost || 0),
        conversations: Number(item.conversation_count || 0),
        uniqueUsers: Number(item.unique_users || 0),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GTM costs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gtm costs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
