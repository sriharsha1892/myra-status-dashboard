/**
 * Health Score Generator
 * Uses Groq AI to analyze trial organizations and generate health assessments
 */

import { callGroqJSON, isGroqAvailable, formatPrompt } from './groqClient';

// Health status levels
export type HealthStatus = 'healthy' | 'warning' | 'at-risk' | 'critical';

// Issue and recommendation types
export interface HealthIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface HealthRecommendation {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action: string;
  rationale: string;
}

// Organization data for health analysis
export interface OrgDataForHealth {
  org_id: string;
  org_name: string;
  org_lifecycle_stage?: string;
  trial_start?: string;
  trial_end?: string;
  engagement_score?: number;
  // Activity metrics
  event_count?: number;
  user_count?: number;
  days_since_last_activity?: number;
  days_in_trial?: number;
  // Timeline data
  recent_events?: Array<{
    event_type: string;
    event_category: string;
    sentiment?: string;
    title: string;
    event_timestamp: string;
  }>;
}

// Health analysis result
export interface HealthAnalysis {
  success: boolean;
  health_status: HealthStatus;
  engagement_score: number;
  health_issues: HealthIssue[];
  health_recommendations: HealthRecommendation[];
  summary: string;
  confidence: number;
  error?: string;
}

/**
 * Generate health score for an organization
 * Analyzes engagement, activity, and timeline data to assess trial health
 */
export async function generateHealthScore(
  orgData: OrgDataForHealth
): Promise<HealthAnalysis> {
  // Check if Groq is available
  if (!isGroqAvailable()) {
    return {
      success: false,
      health_status: 'warning',
      engagement_score: orgData.engagement_score || 50,
      health_issues: [],
      health_recommendations: [],
      summary: '',
      confidence: 0,
      error: 'Groq AI not configured - please set GROQ_API_KEY',
    };
  }

  // Build analysis context
  const context = buildHealthContext(orgData);

  // Create analysis prompt
  const prompt = formatPrompt(
    `You are an expert at analyzing B2B SaaS trial health and predicting conversion likelihood.

Analyze the following trial organization data and provide a comprehensive health assessment.

ORGANIZATION DATA:
${JSON.stringify(context, null, 2)}

ANALYSIS FRAMEWORK:
1. Engagement Level: Based on activity frequency, event count, user participation
2. Trial Progress: Days in trial, milestones reached, feature adoption
3. Risk Factors: Inactivity, low engagement, negative sentiment, blockers
4. Conversion Signals: Power user behavior, feature depth, timeline activity

OUTPUT FORMAT (JSON only):
{
  "health_status": "healthy" | "warning" | "at-risk" | "critical",
  "engagement_score": 0-100,
  "health_issues": [
    {
      "type": "low-activity" | "no-engagement" | "negative-feedback" | "technical-blocker" | "timeline-gaps" | "user-churn" | "trial-expiring",
      "severity": "low" | "medium" | "high" | "critical",
      "description": "Brief description of the issue"
    }
  ],
  "health_recommendations": [
    {
      "priority": "low" | "medium" | "high" | "urgent",
      "action": "Specific action to take",
      "rationale": "Why this action matters"
    }
  ],
  "summary": "2-3 sentence executive summary of trial health",
  "confidence": 0.0-1.0
}

HEALTH STATUS DEFINITIONS:
- healthy: Active engagement, regular activity, positive signals, on track for conversion
- warning: Some concerns (inactivity 3-7 days, moderate engagement), needs monitoring
- at-risk: Significant issues (inactivity 7-14 days, low engagement), intervention needed
- critical: Severe problems (inactivity 14+ days, no engagement), likely to churn without action

ENGAGEMENT SCORE FACTORS:
- Recent activity (weight: 30%)
- Event frequency (weight: 25%)
- User participation (weight: 20%)
- Sentiment trends (weight: 15%)
- Trial progress (weight: 10%)

Return ONLY valid JSON, no markdown, no explanation outside JSON.`,
    context
  );

  // Call Groq
  const result = await callGroqJSON<{
    health_status: HealthStatus;
    engagement_score: number;
    health_issues: HealthIssue[];
    health_recommendations: HealthRecommendation[];
    summary: string;
    confidence: number;
  }>(prompt, {
    temperature: 0.2, // Lower for consistent, analytical output
    max_tokens: 2000,
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      health_status: 'warning',
      engagement_score: orgData.engagement_score || 50,
      health_issues: [],
      health_recommendations: [],
      summary: '',
      confidence: 0,
      error: result.error || 'Failed to generate health score',
    };
  }

  // Validate and normalize data
  const healthStatus = validateHealthStatus(result.data.health_status);
  const engagementScore = Math.max(0, Math.min(100, result.data.engagement_score || 50));
  const issues = (result.data.health_issues || []).slice(0, 10); // Max 10 issues
  const recommendations = (result.data.health_recommendations || []).slice(0, 10); // Max 10 recommendations

  return {
    success: true,
    health_status: healthStatus,
    engagement_score: engagementScore,
    health_issues: issues,
    health_recommendations: recommendations,
    summary: result.data.summary || '',
    confidence: result.data.confidence || 0.7,
  };
}

/**
 * Batch generate health scores for multiple organizations
 */
export async function batchGenerateHealthScores(
  orgs: OrgDataForHealth[]
): Promise<Map<string, HealthAnalysis>> {
  const results = new Map<string, HealthAnalysis>();

  console.log(`Starting batch health score generation for ${orgs.length} organizations...`);

  for (let i = 0; i < orgs.length; i++) {
    const org = orgs[i];
    console.log(`Analyzing ${i + 1}/${orgs.length}: ${org.org_name}...`);

    const result = await generateHealthScore(org);
    results.set(org.org_id, result);

    // Small delay between requests to avoid rate limits
    if (i < orgs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`Batch health score generation complete: ${results.size} organizations analyzed`);

  return results;
}

/**
 * Build context for health analysis
 */
function buildHealthContext(orgData: OrgDataForHealth): Record<string, any> {
  const context: Record<string, any> = {
    organization: orgData.org_name,
  };

  // Trial timeline
  if (orgData.trial_start) {
    context.trial_start = orgData.trial_start;

    if (orgData.days_in_trial !== undefined) {
      context.days_in_trial = orgData.days_in_trial;

      if (orgData.trial_end) {
        const daysRemaining = Math.ceil(
          (new Date(orgData.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        context.days_remaining = Math.max(0, daysRemaining);
      }
    }
  }

  // Lifecycle stage
  if (orgData.org_lifecycle_stage) {
    context.lifecycle_stage = orgData.org_lifecycle_stage;
  }

  // Current engagement
  if (orgData.engagement_score !== undefined) {
    context.current_engagement_score = orgData.engagement_score;
  }

  // Activity metrics
  if (orgData.event_count !== undefined) {
    context.total_timeline_events = orgData.event_count;

    if (orgData.days_in_trial && orgData.days_in_trial > 0) {
      context.avg_events_per_day = Number((orgData.event_count / orgData.days_in_trial).toFixed(2));
    }
  }

  if (orgData.user_count !== undefined) {
    context.total_users = orgData.user_count;
  }

  // Inactivity tracking
  if (orgData.days_since_last_activity !== undefined) {
    context.days_since_last_activity = orgData.days_since_last_activity;

    context.activity_status =
      orgData.days_since_last_activity === 0 ? 'active_today' :
      orgData.days_since_last_activity <= 1 ? 'active_recently' :
      orgData.days_since_last_activity <= 3 ? 'moderately_active' :
      orgData.days_since_last_activity <= 7 ? 'low_activity' :
      orgData.days_since_last_activity <= 14 ? 'at_risk_inactive' :
      'critical_inactive';
  }

  // Recent timeline events
  if (orgData.recent_events && orgData.recent_events.length > 0) {
    context.recent_activity = orgData.recent_events.map(event => ({
      type: event.event_type,
      category: event.event_category,
      sentiment: event.sentiment,
      title: event.title,
      days_ago: Math.floor(
        (Date.now() - new Date(event.event_timestamp).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    // Sentiment analysis
    const sentiments = orgData.recent_events
      .map(e => e.sentiment)
      .filter(s => s);

    if (sentiments.length > 0) {
      const positive = sentiments.filter(s => s === 'positive').length;
      const negative = sentiments.filter(s => s === 'negative').length;
      const neutral = sentiments.filter(s => s === 'neutral').length;

      context.sentiment_distribution = {
        positive,
        negative,
        neutral,
        overall: positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral',
      };
    }
  }

  return context;
}

/**
 * Validate health status
 */
function validateHealthStatus(status: any): HealthStatus {
  const validStatuses: HealthStatus[] = ['healthy', 'warning', 'at-risk', 'critical'];

  if (validStatuses.includes(status)) {
    return status;
  }

  return 'warning'; // Default to warning if invalid
}

/**
 * Get health status color for UI
 */
export function getHealthStatusColor(status: HealthStatus): string {
  const colors: Record<HealthStatus, string> = {
    healthy: 'green',
    warning: 'yellow',
    'at-risk': 'orange',
    critical: 'red',
  };

  return colors[status] || 'gray';
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: 'blue',
    medium: 'yellow',
    high: 'orange',
    critical: 'red',
  };

  return colors[severity] || 'gray';
}

/**
 * Get priority color for UI
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'gray',
    medium: 'blue',
    high: 'orange',
    urgent: 'red',
  };

  return colors[priority] || 'gray';
}
