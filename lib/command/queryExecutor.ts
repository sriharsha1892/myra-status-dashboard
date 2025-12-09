/**
 * Query Executor - Execute data queries and format responses
 *
 * Handles questions like "How many demos at ABB?" by querying
 * the database and formatting human-readable responses.
 */

import { createClient } from '@/lib/supabase/server';
import type { DetectedQuery, QueryType } from './queryDetector';
import { resolveOrganization, resolveUser } from './entityResolver';

export interface QueryResult {
  success: boolean;
  type: QueryType | null;
  answer: string;
  data?: any;
  suggestions?: string[];
  error?: string;
}

// Type definitions for Supabase query results
interface OrgValueData {
  contract_value: number | null;
  lifecycle_stage: string | null;
  deal_status: string | null;
}

interface OrgStatusData {
  lifecycle_stage: string | null;
  trial_status: string | null;
  deal_status: string | null;
  contract_value: number | null;
  last_activity_at: string | null;
}

interface UserListData {
  name: string | null;
  email: string | null;
  role: string | null;
  last_login_at: string | null;
}

interface ActivityListData {
  event_type: string;
  event_timestamp: string;
  created_by: string | null;
}

interface RecentActivityData {
  event_type: string;
  event_timestamp: string;
  event_details: any;
  trial_users: { name: string } | null;
}

interface OrgSummaryData {
  org_id: string;
  org_name: string;
  org_domain: string | null;
  lifecycle_stage: string | null;
  trial_status: string | null;
  deal_status: string | null;
  contract_value: number | null;
  last_activity_at: string | null;
}

/**
 * Execute a detected query and return formatted results
 */
export async function executeQuery(query: DetectedQuery): Promise<QueryResult> {
  if (!query.isQuery || !query.type) {
    return {
      success: false,
      type: null,
      answer: "I couldn't understand that question. Try asking something like 'How many demos at ABB?' or 'What stage is BASF at?'",
      error: 'Unrecognized query',
    };
  }

  // Resolve organization if specified
  let orgId: string | null = null;
  let orgName: string | null = query.orgName;

  if (query.orgName) {
    const resolved = await resolveOrganization(query.orgName);
    if (resolved && resolved.id) {
      orgId = resolved.id;
      orgName = resolved.name;
    } else {
      return {
        success: false,
        type: query.type,
        answer: `I couldn't find an organization named "${query.orgName}". Did you mean one of these?`,
        suggestions: resolved?.alternatives?.map(a => a.name) || [],
        error: 'Organization not found',
      };
    }
  }

  // Execute based on query type
  switch (query.type) {
    case 'count':
      return executeCountQuery(query, orgId, orgName);
    case 'value':
      return executeValueQuery(orgId, orgName);
    case 'status':
      return executeStatusQuery(orgId, orgName);
    case 'list':
      return executeListQuery(query, orgId, orgName);
    case 'recent':
      return executeRecentQuery(orgId, orgName);
    case 'summary':
      return executeSummaryQuery(orgId, orgName);
    default:
      return {
        success: false,
        type: query.type,
        answer: "I'm not sure how to answer that question yet.",
        error: 'Unsupported query type',
      };
  }
}

/**
 * Count query - "How many demos at ABB?"
 */
async function executeCountQuery(
  query: DetectedQuery,
  orgId: string | null,
  orgName: string | null
): Promise<QueryResult> {
  if (!orgId) {
    return {
      success: false,
      type: 'count',
      answer: "Please specify an organization. For example: 'How many demos at ABB?'",
      error: 'No organization specified',
    };
  }

  const supabase = await createClient();
  const metric = query.metric?.toLowerCase() || 'activities';

  // Determine what to count based on metric
  let table = 'org_timeline_events';
  let filter: Record<string, any> = { org_id: orgId };

  if (metric.includes('demo')) {
    filter.event_type = 'demo';
  } else if (metric.includes('query') || metric.includes('queries')) {
    filter.event_type = 'query';
  } else if (metric.includes('login')) {
    filter.event_type = 'login';
  } else if (metric.includes('call')) {
    filter.event_type = 'call';
  } else if (metric.includes('meeting')) {
    filter.event_type = 'meeting';
  } else if (metric.includes('user') || metric.includes('contact')) {
    table = 'trial_users';
  } else if (metric.includes('ticket')) {
    table = 'tickets';
  } else if (metric.includes('note')) {
    table = 'org_activity_notes';
  }

  // Apply time range filter
  if (query.timeRange && table === 'org_timeline_events') {
    const now = new Date();
    let startDate: Date;

    switch (query.timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    filter.event_timestamp = startDate.toISOString();
  }

  // Execute count query
  let queryBuilder = supabase.from(table).select('*', { count: 'exact', head: true });

  // Apply filters
  for (const [key, value] of Object.entries(filter)) {
    if (key === 'event_timestamp') {
      queryBuilder = queryBuilder.gte(key, value);
    } else {
      queryBuilder = queryBuilder.eq(key, value);
    }
  }

  const { count, error } = await queryBuilder;

  if (error) {
    return {
      success: false,
      type: 'count',
      answer: 'Sorry, I had trouble fetching that data.',
      error: error.message,
    };
  }

  // Format response
  const timeRangeText = query.timeRange
    ? query.timeRange === 'today' ? ' today'
      : query.timeRange === 'week' ? ' this week'
      : query.timeRange === 'month' ? ' this month'
      : query.timeRange === 'quarter' ? ' this quarter'
      : ''
    : '';

  const metricLabel = metric.includes('user') ? 'users'
    : metric.includes('ticket') ? 'tickets'
    : metric.includes('note') ? 'notes'
    : filter.event_type ? `${filter.event_type}s`
    : 'activities';

  return {
    success: true,
    type: 'count',
    answer: `${orgName} has **${count || 0} ${metricLabel}**${timeRangeText}.`,
    data: { count, metric: metricLabel, orgName, timeRange: query.timeRange },
  };
}

/**
 * Value query - "What's the deal value for ABB?"
 */
async function executeValueQuery(
  orgId: string | null,
  orgName: string | null
): Promise<QueryResult> {
  if (!orgId) {
    return {
      success: false,
      type: 'value',
      answer: "Please specify an organization. For example: 'What's ABB's deal value?'",
      error: 'No organization specified',
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trial_organizations')
    .select('contract_value, lifecycle_stage, deal_status')
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    return {
      success: false,
      type: 'value',
      answer: `Sorry, I couldn't find deal information for ${orgName}.`,
      error: error?.message || 'Not found',
    };
  }

  const orgData = data as unknown as OrgValueData;
  const value = orgData.contract_value;
  const formattedValue = value
    ? `$${value.toLocaleString()}`
    : 'not set';

  return {
    success: true,
    type: 'value',
    answer: `${orgName}'s deal value is **${formattedValue}** (${orgData.deal_status || 'no status'}).`,
    data: { value, dealStatus: orgData.deal_status, stage: orgData.lifecycle_stage, orgName },
  };
}

/**
 * Status query - "What stage is ABB at?"
 */
async function executeStatusQuery(
  orgId: string | null,
  orgName: string | null
): Promise<QueryResult> {
  if (!orgId) {
    return {
      success: false,
      type: 'status',
      answer: "Please specify an organization. For example: 'What stage is ABB at?'",
      error: 'No organization specified',
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trial_organizations')
    .select('lifecycle_stage, trial_status, deal_status, contract_value, last_activity_at')
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    return {
      success: false,
      type: 'status',
      answer: `Sorry, I couldn't find status information for ${orgName}.`,
      error: error?.message || 'Not found',
    };
  }

  const statusData = data as unknown as OrgStatusData;
  const lastActivity = statusData.last_activity_at
    ? new Date(statusData.last_activity_at).toLocaleDateString()
    : 'never';

  return {
    success: true,
    type: 'status',
    answer: `**${orgName}** is at **${statusData.lifecycle_stage}** stage (trial: ${statusData.trial_status || 'N/A'}). Last activity: ${lastActivity}.`,
    data: {
      stage: statusData.lifecycle_stage,
      trialStatus: statusData.trial_status,
      dealStatus: statusData.deal_status,
      value: statusData.contract_value,
      lastActivity: statusData.last_activity_at,
      orgName,
    },
    suggestions: [
      `Update ${orgName} stage`,
      `Log activity at ${orgName}`,
      `View ${orgName} details`,
    ],
  };
}

/**
 * List query - "List users at ABB"
 */
async function executeListQuery(
  query: DetectedQuery,
  orgId: string | null,
  orgName: string | null
): Promise<QueryResult> {
  if (!orgId) {
    return {
      success: false,
      type: 'list',
      answer: "Please specify an organization. For example: 'List users at ABB'",
      error: 'No organization specified',
    };
  }

  const supabase = await createClient();
  const entity = query.entity || 'user';

  if (entity === 'user') {
    const { data, error } = await supabase
      .from('trial_users')
      .select('name, email, role, last_login_at')
      .eq('org_id', orgId)
      .order('last_login_at', { ascending: false, nullsFirst: false })
      .limit(10);

    if (error) {
      return {
        success: false,
        type: 'list',
        answer: `Sorry, I couldn't fetch users for ${orgName}.`,
        error: error.message,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        type: 'list',
        answer: `${orgName} has no users registered yet.`,
        data: { users: [], orgName },
        suggestions: [`Add user at ${orgName}`],
      };
    }

    const users = data as unknown as UserListData[];
    const userList = users
      .map(u => `• **${u.name}** (${u.role || 'no role'})${u.email ? ` - ${u.email}` : ''}`)
      .join('\n');

    return {
      success: true,
      type: 'list',
      answer: `**${orgName}** has ${data.length} user${data.length !== 1 ? 's' : ''}:\n${userList}`,
      data: { users: data, orgName },
    };
  }

  if (entity === 'activity') {
    const { data, error } = await supabase
      .from('org_timeline_events')
      .select('event_type, event_timestamp, created_by')
      .eq('org_id', orgId)
      .order('event_timestamp', { ascending: false })
      .limit(10);

    if (error) {
      return {
        success: false,
        type: 'list',
        answer: `Sorry, I couldn't fetch activities for ${orgName}.`,
        error: error.message,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        type: 'list',
        answer: `${orgName} has no recorded activities yet.`,
        data: { activities: [], orgName },
        suggestions: [`Log activity at ${orgName}`],
      };
    }

    const activities = data as unknown as ActivityListData[];
    const activityList = activities
      .map(a => {
        const date = new Date(a.event_timestamp).toLocaleDateString();
        return `• ${a.event_type} on ${date}`;
      })
      .join('\n');

    return {
      success: true,
      type: 'list',
      answer: `**${orgName}**'s recent activities:\n${activityList}`,
      data: { activities: data, orgName },
    };
  }

  return {
    success: false,
    type: 'list',
    answer: "I'm not sure what to list. Try 'list users at ABB' or 'list activities at ABB'.",
    error: 'Unknown list entity',
  };
}

/**
 * Recent query - "Last activity at ABB"
 */
async function executeRecentQuery(
  orgId: string | null,
  orgName: string | null
): Promise<QueryResult> {
  if (!orgId) {
    return {
      success: false,
      type: 'recent',
      answer: "Please specify an organization. For example: 'Last activity at ABB'",
      error: 'No organization specified',
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('org_timeline_events')
    .select('event_type, event_timestamp, event_details, trial_users(name)')
    .eq('org_id', orgId)
    .order('event_timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return {
      success: true,
      type: 'recent',
      answer: `${orgName} has no recorded activities yet.`,
      data: { activity: null, orgName },
      suggestions: [`Log activity at ${orgName}`],
    };
  }

  const recentData = data as unknown as RecentActivityData;
  const date = new Date(recentData.event_timestamp);
  const relativeTime = getRelativeTime(date);
  const userName = recentData.trial_users?.name || 'Unknown';

  return {
    success: true,
    type: 'recent',
    answer: `${orgName}'s last activity was a **${recentData.event_type}** ${relativeTime} by ${userName}.`,
    data: { activity: data, orgName },
    suggestions: [
      `Log activity at ${orgName}`,
      `List all activities at ${orgName}`,
    ],
  };
}

/**
 * Summary query - "Tell me about ABB"
 */
async function executeSummaryQuery(
  orgId: string | null,
  orgName: string | null
): Promise<QueryResult> {
  if (!orgId) {
    return {
      success: false,
      type: 'summary',
      answer: "Please specify an organization. For example: 'Tell me about ABB'",
      error: 'No organization specified',
    };
  }

  const supabase = await createClient();

  // Fetch org details
  const { data: org, error: orgError } = await supabase
    .from('trial_organizations')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (orgError || !org) {
    return {
      success: false,
      type: 'summary',
      answer: `Sorry, I couldn't find information for ${orgName}.`,
      error: orgError?.message || 'Not found',
    };
  }

  const summaryOrg = org as unknown as OrgSummaryData;

  // Get user count
  const { count: userCount } = await supabase
    .from('trial_users')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // Get recent activity count (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: activityCount } = await supabase
    .from('org_timeline_events')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('event_timestamp', thirtyDaysAgo);

  // Format summary
  const value = summaryOrg.contract_value
    ? `$${summaryOrg.contract_value.toLocaleString()}`
    : 'not set';

  const lastActivity = summaryOrg.last_activity_at
    ? getRelativeTime(new Date(summaryOrg.last_activity_at))
    : 'never';

  const summary = [
    `## ${summaryOrg.org_name}`,
    ``,
    `**Stage:** ${summaryOrg.lifecycle_stage} | **Trial:** ${summaryOrg.trial_status || 'N/A'}`,
    `**Deal:** ${value} (${summaryOrg.deal_status || 'no status'})`,
    `**Users:** ${userCount || 0} | **Activities (30d):** ${activityCount || 0}`,
    `**Last Activity:** ${lastActivity}`,
    summaryOrg.org_domain ? `**Domain:** ${summaryOrg.org_domain}` : '',
  ].filter(Boolean).join('\n');

  return {
    success: true,
    type: 'summary',
    answer: summary,
    data: {
      org,
      userCount,
      activityCount,
      orgName,
    },
    suggestions: [
      `Log activity at ${orgName}`,
      `Update ${orgName} stage`,
      `List users at ${orgName}`,
    ],
  };
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

export default executeQuery;
