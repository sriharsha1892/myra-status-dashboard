/**
 * GET /api/command/org-context/[id]
 * Fetch aggregated org context for the Command Center sidebar
 * Returns org details, contacts, recent events, and AI insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callGroqJSON, isGroqAvailable } from '@/lib/ai/groqClient';
import type { HealthStatus } from '@/lib/ai/healthScorer';

// Response types
export interface OrgContextResponse {
  org: {
    id: string;
    name: string;
    healthStatus: HealthStatus;
    lifecycleStage: string;
    trialDaysRemaining: number | null;
    lastActivityAt: string | null;
    dealValue: number | null;
    dealStatus: string | null;
    accountManager: string | null;
    engagementScore: number;
  };
  contacts: Array<{
    id: string;
    name: string;
    email: string;
    role: string | null;
    influence: string | null;
    lastLoginAt: string | null;
  }>;
  recentEvents: Array<{
    id: string;
    type: string;
    summary: string;
    timestamp: string;
    sentiment?: string;
  }>;
  insights: Array<{
    type: 'suggestion' | 'risk' | 'opportunity';
    text: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

// Simple in-memory cache for insights (5 min TTL)
const insightsCache = new Map<string, { data: OrgContextResponse['insights']; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orgId } = await context.params;

    // Fetch org data
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .select(`
        org_id,
        org_name,
        org_lifecycle_stage,
        trial_start_date,
        trial_end_date,
        account_manager_id,
        engagement_score,
        health_status,
        deal_momentum
      `)
      .eq('org_id', orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Calculate trial days remaining
    let trialDaysRemaining: number | null = null;
    if ((org as any).trial_end_date) {
      const daysRemaining = Math.ceil(
        (new Date((org as any).trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      trialDaysRemaining = Math.max(0, daysRemaining);
    }

    // Fetch contacts (trial users)
    const { data: contacts } = await supabase
      .from('trial_users')
      .select(`
        user_id,
        name,
        email,
        role,
        influence,
        last_login
      `)
      .eq('org_id', orgId)
      .order('influence', { ascending: false })
      .limit(10);

    // Fetch recent timeline events
    const { data: events } = await supabase
      .from('trial_timeline_events')
      .select(`
        id,
        event_type,
        title,
        event_timestamp,
        sentiment
      `)
      .eq('org_id', orgId)
      .order('event_timestamp', { ascending: false })
      .limit(5);

    // Get last activity timestamp
    const lastActivityAt = events && events.length > 0
      ? (events[0] as any).event_timestamp
      : null;

    // Generate AI insights (cached)
    const orgAny = org as any;
    const insights = await getOrgInsights(orgId, {
      orgName: orgAny.org_name,
      healthStatus: orgAny.health_status,
      lifecycleStage: orgAny.org_lifecycle_stage,
      trialDaysRemaining,
      engagementScore: orgAny.engagement_score,
      recentEvents: events?.map((e: any) => ({
        type: e.event_type,
        title: e.title,
        sentiment: e.sentiment,
      })) || [],
      contactCount: contacts?.length || 0,
    });

    // Build response
    const response: OrgContextResponse = {
      org: {
        id: orgAny.org_id,
        name: orgAny.org_name,
        healthStatus: (orgAny.health_status || 'warning') as HealthStatus,
        lifecycleStage: orgAny.org_lifecycle_stage || 'trial_active',
        trialDaysRemaining,
        lastActivityAt,
        dealValue: null, // No deal_value column exists
        dealStatus: orgAny.deal_momentum || null,
        accountManager: orgAny.account_manager_id,
        engagementScore: orgAny.engagement_score || 50,
      },
      contacts: (contacts || []).map((c: any) => ({
        id: c.user_id,
        name: c.name || c.email?.split('@')[0] || 'Unknown',
        email: c.email,
        role: c.role,
        influence: c.influence,
        lastLoginAt: c.last_login,
      })),
      recentEvents: (events || []).map((e: any) => ({
        id: e.id,
        type: e.event_type,
        summary: e.title,
        timestamp: e.event_timestamp,
        sentiment: e.sentiment,
      })),
      insights,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching org context:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch org context' },
      { status: 500 }
    );
  }
}

// Generate AI insights with caching
async function getOrgInsights(
  orgId: string,
  context: {
    orgName: string;
    healthStatus: string;
    lifecycleStage: string;
    trialDaysRemaining: number | null;
    engagementScore: number;
    recentEvents: Array<{ type: string; title: string; sentiment?: string }>;
    contactCount: number;
  }
): Promise<OrgContextResponse['insights']> {
  // Check cache
  const cached = insightsCache.get(orgId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // If Groq not available, return rule-based insights
  if (!isGroqAvailable()) {
    return generateRuleBasedInsights(context);
  }

  try {
    const prompt = `You are an expert sales analyst. Analyze this trial organization and provide 2-3 actionable insights.

ORGANIZATION DATA:
- Name: ${context.orgName}
- Health Status: ${context.healthStatus}
- Lifecycle Stage: ${context.lifecycleStage}
- Trial Days Remaining: ${context.trialDaysRemaining ?? 'Unknown'}
- Engagement Score: ${context.engagementScore}/100
- Contact Count: ${context.contactCount}
- Recent Events: ${JSON.stringify(context.recentEvents.slice(0, 3))}

Generate insights in this JSON format:
[
  {
    "type": "suggestion" | "risk" | "opportunity",
    "text": "Brief actionable insight (max 50 chars)",
    "priority": "low" | "medium" | "high"
  }
]

FOCUS ON:
- Time-sensitive actions (expiring trials, follow-up timing)
- Engagement patterns (active/inactive, sentiment trends)
- Conversion opportunities or churn risks

Return ONLY valid JSON array, no markdown.`;

    const result = await callGroqJSON<OrgContextResponse['insights']>(prompt, {
      temperature: 0.3,
      max_tokens: 500,
      timeout_ms: 5000, // Fast timeout for sidebar
    });

    if (result.success && result.data) {
      // Cache results
      insightsCache.set(orgId, { data: result.data, timestamp: Date.now() });
      return result.data;
    }
  } catch (error) {
    console.warn('Failed to generate AI insights, falling back to rules:', error);
  }

  // Fallback to rule-based
  return generateRuleBasedInsights(context);
}

// Rule-based fallback insights
function generateRuleBasedInsights(context: {
  healthStatus: string;
  lifecycleStage: string;
  trialDaysRemaining: number | null;
  engagementScore: number;
  recentEvents: Array<{ type: string; title: string; sentiment?: string }>;
  contactCount: number;
}): OrgContextResponse['insights'] {
  const insights: OrgContextResponse['insights'] = [];

  // Trial expiring soon
  if (context.trialDaysRemaining !== null && context.trialDaysRemaining <= 7) {
    insights.push({
      type: 'risk',
      text: `Trial expires in ${context.trialDaysRemaining} days`,
      priority: context.trialDaysRemaining <= 3 ? 'high' : 'medium',
    });
  }

  // Low engagement
  if (context.engagementScore < 40) {
    insights.push({
      type: 'risk',
      text: 'Low engagement - schedule check-in',
      priority: 'high',
    });
  }

  // Health status risks
  if (context.healthStatus === 'at-risk' || context.healthStatus === 'critical') {
    insights.push({
      type: 'risk',
      text: 'Account health declining',
      priority: 'high',
    });
  }

  // Opportunities
  if (context.engagementScore >= 70 && context.lifecycleStage === 'trial_active') {
    insights.push({
      type: 'opportunity',
      text: 'High engagement - propose conversion',
      priority: 'medium',
    });
  }

  // No contacts
  if (context.contactCount === 0) {
    insights.push({
      type: 'suggestion',
      text: 'Add contacts for this org',
      priority: 'medium',
    });
  }

  // Recent negative sentiment
  const negativeEvents = context.recentEvents.filter(e => e.sentiment === 'negative');
  if (negativeEvents.length > 0) {
    insights.push({
      type: 'risk',
      text: 'Recent negative feedback detected',
      priority: 'high',
    });
  }

  return insights.slice(0, 3); // Max 3 insights
}
