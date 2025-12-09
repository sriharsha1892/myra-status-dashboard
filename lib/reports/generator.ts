// Report Generation Service
// Generates various report types for scheduled delivery

import { SupabaseClient } from '@supabase/supabase-js';

export type ReportType =
  | 'trial_summary'
  | 'engagement'
  | 'pipeline'
  | 'at_risk'
  | 'activity'
  | 'follow_ups'
  | 'team_performance'
  | 'custom';

export interface ReportFilters {
  stage?: string[];
  account_manager_id?: string;
  date_range?: 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month';
  org_ids?: string[];
}

export interface ReportResult {
  title: string;
  generated_at: string;
  data: any;
  summary: {
    total_items: number;
    key_metrics: Record<string, number | string>;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

export async function generateReport(
  supabase: AnySupabaseClient,
  reportType: ReportType,
  filters: ReportFilters = {},
  maxItems: number = 10
): Promise<ReportResult> {
  const generators: Record<ReportType, () => Promise<ReportResult>> = {
    trial_summary: () => generateTrialSummary(supabase, filters, maxItems),
    engagement: () => generateEngagementReport(supabase, filters, maxItems),
    pipeline: () => generatePipelineReport(supabase, filters, maxItems),
    at_risk: () => generateAtRiskReport(supabase, filters, maxItems),
    activity: () => generateActivityReport(supabase, filters, maxItems),
    follow_ups: () => generateFollowUpsReport(supabase, filters, maxItems),
    team_performance: () => generateTeamPerformanceReport(supabase, filters, maxItems),
    custom: () => generateCustomReport(supabase, filters, maxItems),
  };

  return generators[reportType]();
}

// Trial Summary Report
async function generateTrialSummary(
  supabase: AnySupabaseClient,
  filters: ReportFilters,
  maxItems: number
): Promise<ReportResult> {
  const dateFilter = getDateFilter(filters.date_range);

  // Get trial organizations
  let query = supabase
    .from('trial_organizations')
    .select(`
      org_id, org_name, org_lifecycle_stage, health_status,
      trial_start_date, trial_end_date, deal_momentum, engagement_score,
      account_manager:users!trial_organizations_account_manager_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(maxItems);

  if (filters.stage?.length) {
    query = query.in('org_lifecycle_stage', filters.stage);
  }
  if (filters.account_manager_id) {
    query = query.eq('account_manager_id', filters.account_manager_id);
  }

  const { data: orgs, error } = await query;

  if (error) throw error;

  // Get summary stats
  const { data: stageStats } = await supabase
    .from('trial_organizations')
    .select('org_lifecycle_stage');

  const stageCounts: Record<string, number> = {};
  stageStats?.forEach((o: any) => {
    stageCounts[o.org_lifecycle_stage] = (stageCounts[o.org_lifecycle_stage] || 0) + 1;
  });

  return {
    title: 'Trial Summary Report',
    generated_at: new Date().toISOString(),
    data: {
      organizations: orgs || [],
      stage_breakdown: stageCounts,
    },
    summary: {
      total_items: orgs?.length || 0,
      key_metrics: {
        total_trials: stageStats?.length || 0,
        active_trials: stageCounts['trial_active'] || 0,
        converted: stageCounts['converted_paying'] || 0,
      },
    },
  };
}

// Engagement Report
async function generateEngagementReport(
  supabase: AnySupabaseClient,
  filters: ReportFilters,
  maxItems: number
): Promise<ReportResult> {
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select(`
      org_id, org_name, engagement_score, health_status,
      account_manager:users!trial_organizations_account_manager_id_fkey(full_name)
    `)
    .order('engagement_score', { ascending: true })
    .limit(maxItems);

  const avgEngagement =
    orgs?.reduce((sum: number, o: any) => sum + (o.engagement_score || 0), 0) /
      (orgs?.length || 1) || 0;

  return {
    title: 'Engagement Report',
    generated_at: new Date().toISOString(),
    data: {
      low_engagement_orgs: orgs?.filter((o: any) => (o.engagement_score || 0) < 50) || [],
      all_orgs: orgs || [],
    },
    summary: {
      total_items: orgs?.length || 0,
      key_metrics: {
        average_engagement: Math.round(avgEngagement),
        low_engagement_count: orgs?.filter((o: any) => (o.engagement_score || 0) < 50).length || 0,
      },
    },
  };
}

// Pipeline Report
async function generatePipelineReport(
  supabase: AnySupabaseClient,
  filters: ReportFilters,
  maxItems: number
): Promise<ReportResult> {
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_lifecycle_stage, deal_value, health_status');

  const pipeline: Record<string, { count: number; value: number }> = {};
  orgs?.forEach((o: any) => {
    const stage = o.org_lifecycle_stage || 'unknown';
    if (!pipeline[stage]) {
      pipeline[stage] = { count: 0, value: 0 };
    }
    pipeline[stage].count++;
    pipeline[stage].value += o.deal_value || 0;
  });

  const totalValue = orgs?.reduce((sum: number, o: any) => sum + (o.deal_value || 0), 0) || 0;

  return {
    title: 'Pipeline Report',
    generated_at: new Date().toISOString(),
    data: {
      pipeline_stages: pipeline,
    },
    summary: {
      total_items: orgs?.length || 0,
      key_metrics: {
        total_pipeline_value: totalValue,
        total_deals: orgs?.length || 0,
      },
    },
  };
}

// At-Risk Report
async function generateAtRiskReport(
  supabase: AnySupabaseClient,
  filters: ReportFilters,
  maxItems: number
): Promise<ReportResult> {
  const { data: atRiskOrgs } = await supabase
    .from('trial_organizations')
    .select(`
      org_id, org_name, health_status, deal_momentum, engagement_score,
      trial_end_date, last_activity_date,
      account_manager:users!trial_organizations_account_manager_id_fkey(full_name)
    `)
    .or('health_status.eq.at_risk,health_status.eq.critical,deal_momentum.eq.at_risk,deal_momentum.eq.stalled')
    .order('engagement_score', { ascending: true })
    .limit(maxItems);

  // Calculate days until trial expires
  const orgsWithDaysLeft = atRiskOrgs?.map((o: any) => ({
    ...o,
    days_until_expiry: o.trial_end_date
      ? Math.ceil((new Date(o.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  }));

  return {
    title: 'At-Risk Trials Report',
    generated_at: new Date().toISOString(),
    data: {
      at_risk_organizations: orgsWithDaysLeft || [],
    },
    summary: {
      total_items: atRiskOrgs?.length || 0,
      key_metrics: {
        critical_count: atRiskOrgs?.filter((o: any) => o.health_status === 'critical').length || 0,
        expiring_soon: orgsWithDaysLeft?.filter((o: any) => o.days_until_expiry !== null && o.days_until_expiry <= 7).length || 0,
      },
    },
  };
}

// Activity Report
async function generateActivityReport(
  supabase: AnySupabaseClient,
  filters: ReportFilters,
  maxItems: number
): Promise<ReportResult> {
  const dateFilter = getDateFilter(filters.date_range || 'last_7_days');

  const { data: activities } = await supabase
    .from('trial_activities')
    .select(`
      id, activity_type, notes, created_at,
      trial_organizations(org_name)
    `)
    .gte('created_at', dateFilter.start)
    .order('created_at', { ascending: false })
    .limit(maxItems);

  // Activity type breakdown
  const activityTypes: Record<string, number> = {};
  activities?.forEach((a: any) => {
    activityTypes[a.activity_type] = (activityTypes[a.activity_type] || 0) + 1;
  });

  return {
    title: 'Activity Report',
    generated_at: new Date().toISOString(),
    data: {
      recent_activities: activities || [],
      activity_breakdown: activityTypes,
    },
    summary: {
      total_items: activities?.length || 0,
      key_metrics: {
        total_activities: activities?.length || 0,
        activity_types: Object.keys(activityTypes).length,
      },
    },
  };
}

// Follow-ups Report
async function generateFollowUpsReport(
  supabase: AnySupabaseClient,
  filters: ReportFilters,
  maxItems: number
): Promise<ReportResult> {
  const now = new Date().toISOString();

  const { data: overdueFollowUps } = await supabase
    .from('follow_ups')
    .select(`
      id, title, due_date, priority, status,
      trial_organizations(org_name),
      assigned_to_user:users!follow_ups_assigned_to_fkey(full_name)
    `)
    .lt('due_date', now)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(maxItems);

  const { data: upcomingFollowUps } = await supabase
    .from('follow_ups')
    .select(`
      id, title, due_date, priority, status,
      trial_organizations(org_name),
      assigned_to_user:users!follow_ups_assigned_to_fkey(full_name)
    `)
    .gte('due_date', now)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(maxItems);

  return {
    title: 'Follow-ups Report',
    generated_at: new Date().toISOString(),
    data: {
      overdue: overdueFollowUps || [],
      upcoming: upcomingFollowUps || [],
    },
    summary: {
      total_items: (overdueFollowUps?.length || 0) + (upcomingFollowUps?.length || 0),
      key_metrics: {
        overdue_count: overdueFollowUps?.length || 0,
        upcoming_count: upcomingFollowUps?.length || 0,
        high_priority_overdue: overdueFollowUps?.filter((f: any) => f.priority === 'high').length || 0,
      },
    },
  };
}

// Team Performance Report
async function generateTeamPerformanceReport(
  supabase: AnySupabaseClient,
  filters: ReportFilters,
  maxItems: number
): Promise<ReportResult> {
  // Get users with account manager role
  const { data: managers } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('role', 'Account Manager');

  // Get org counts per manager
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('account_manager_id, org_lifecycle_stage, health_status');

  const managerStats: Record<string, any> = {};
  managers?.forEach((m: any) => {
    managerStats[m.id] = {
      name: m.full_name || m.email,
      total_accounts: 0,
      active_trials: 0,
      converted: 0,
      at_risk: 0,
    };
  });

  orgs?.forEach((o: any) => {
    if (o.account_manager_id && managerStats[o.account_manager_id]) {
      managerStats[o.account_manager_id].total_accounts++;
      if (o.org_lifecycle_stage === 'trial_active') {
        managerStats[o.account_manager_id].active_trials++;
      }
      if (o.org_lifecycle_stage === 'converted_paying') {
        managerStats[o.account_manager_id].converted++;
      }
      if (o.health_status === 'at_risk' || o.health_status === 'critical') {
        managerStats[o.account_manager_id].at_risk++;
      }
    }
  });

  const sortedManagers = Object.values(managerStats)
    .sort((a: any, b: any) => b.converted - a.converted)
    .slice(0, maxItems);

  return {
    title: 'Team Performance Report',
    generated_at: new Date().toISOString(),
    data: {
      manager_stats: sortedManagers,
    },
    summary: {
      total_items: sortedManagers.length,
      key_metrics: {
        total_managers: managers?.length || 0,
        total_conversions: sortedManagers.reduce((sum: number, m: any) => sum + m.converted, 0),
      },
    },
  };
}

// Custom Report (placeholder)
async function generateCustomReport(
  supabase: AnySupabaseClient,
  filters: ReportFilters,
  maxItems: number
): Promise<ReportResult> {
  return {
    title: 'Custom Report',
    generated_at: new Date().toISOString(),
    data: {},
    summary: {
      total_items: 0,
      key_metrics: {
        message: 'Custom reports require specific query configuration',
      },
    },
  };
}

// Helper to get date range filter
function getDateFilter(range?: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  switch (range) {
    case 'today':
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      return { start: startOfDay.toISOString(), end };

    case 'last_7_days':
      const week = new Date(now);
      week.setDate(week.getDate() - 7);
      return { start: week.toISOString(), end };

    case 'last_30_days':
      const month = new Date(now);
      month.setDate(month.getDate() - 30);
      return { start: month.toISOString(), end };

    case 'this_month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth.toISOString(), end };

    case 'last_month':
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: lastMonthStart.toISOString(), end: lastMonthEnd.toISOString() };

    default:
      const defaultStart = new Date(now);
      defaultStart.setDate(defaultStart.getDate() - 7);
      return { start: defaultStart.toISOString(), end };
  }
}
