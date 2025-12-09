/**
 * POST /api/command/suggest
 * AI-powered command suggestions based on session context
 * Uses Groq to predict next likely actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callGroqJSON, isGroqAvailable } from '@/lib/ai/groqClient';

// Request/Response types
interface SuggestionRequest {
  sessionContext: {
    recentOrgs: string[];
    recentActions: string[];
    lastActionTime: string | null;
  };
  currentOrgId?: string;
}

interface Suggestion {
  id: string;
  label: string;
  template: string;
  confidence: number;
  reasoning: string;
  icon: 'activity' | 'note' | 'stage' | 'deal' | 'ticket' | 'followup' | 'call';
}

interface SuggestionResponse {
  suggestions: Suggestion[];
  source: 'ai' | 'rules';
}

// Simple cache for suggestions (2 min TTL)
const suggestionsCache = new Map<string, { data: Suggestion[]; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SuggestionRequest = await request.json();
    const { sessionContext, currentOrgId } = body;

    // Generate cache key from context
    const cacheKey = JSON.stringify({
      orgs: sessionContext.recentOrgs.slice(0, 3),
      actions: sessionContext.recentActions.slice(0, 3),
      orgId: currentOrgId,
    });

    // Check cache
    const cached = suggestionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ suggestions: cached.data, source: 'ai' });
    }

    // Fetch current org context if provided
    let orgContext: any = null;
    if (currentOrgId) {
      const { data: org } = await supabase
        .from('trial_organizations')
        .select('org_name, health_status, org_lifecycle_stage, trial_end_date, engagement_score')
        .eq('org_id', currentOrgId)
        .single();

      if (org) {
        const orgAny = org as any;
        const trialDaysRemaining = orgAny.trial_end_date
          ? Math.max(0, Math.ceil((new Date(orgAny.trial_end_date).getTime() - Date.now()) / 86400000))
          : null;

        // Get pending follow-ups count
        const { count: pendingFollowups } = await supabase
          .from('follow_ups')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', currentOrgId)
          .eq('status', 'pending');

        // Get days since last contact
        const { data: lastEvent } = await supabase
          .from('trial_timeline_events')
          .select('event_timestamp')
          .eq('org_id', currentOrgId)
          .order('event_timestamp', { ascending: false })
          .limit(1)
          .single();

        const daysSinceLastContact = lastEvent?.event_timestamp
          ? Math.floor((Date.now() - new Date(lastEvent.event_timestamp).getTime()) / 86400000)
          : null;

        orgContext = {
          name: orgAny.org_name,
          healthStatus: orgAny.health_status || 'warning',
          lifecycleStage: orgAny.org_lifecycle_stage || 'trial_active',
          trialDaysRemaining,
          engagementScore: orgAny.engagement_score || 50,
          pendingFollowups: pendingFollowups || 0,
          daysSinceLastContact,
        };
      }
    }

    // Generate suggestions
    let suggestions: Suggestion[];
    let source: 'ai' | 'rules' = 'rules';

    if (isGroqAvailable()) {
      const aiSuggestions = await generateAISuggestions(sessionContext, orgContext);
      if (aiSuggestions.length > 0) {
        suggestions = aiSuggestions;
        source = 'ai';
        // Cache AI results
        suggestionsCache.set(cacheKey, { data: suggestions, timestamp: Date.now() });
      } else {
        suggestions = generateRuleBasedSuggestions(sessionContext, orgContext);
      }
    } else {
      suggestions = generateRuleBasedSuggestions(sessionContext, orgContext);
    }

    return NextResponse.json({ suggestions, source });
  } catch (error: any) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

// Generate AI-powered suggestions using Groq
async function generateAISuggestions(
  sessionContext: SuggestionRequest['sessionContext'],
  orgContext: any
): Promise<Suggestion[]> {
  const timeSinceLastAction = sessionContext.lastActionTime
    ? Math.floor((Date.now() - new Date(sessionContext.lastActionTime).getTime()) / 60000)
    : null;

  const prompt = `You are analyzing a user's command center session to suggest their next likely action.

SESSION CONTEXT:
- Recent orgs worked with: ${sessionContext.recentOrgs.slice(0, 5).join(', ') || 'None'}
- Recent actions: ${sessionContext.recentActions.slice(0, 5).join(', ') || 'None'}
- Minutes since last action: ${timeSinceLastAction ?? 'Unknown'}
- Current time: ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}

${orgContext ? `CURRENT FOCUSED ORG:
- Name: ${orgContext.name}
- Health: ${orgContext.healthStatus}
- Stage: ${orgContext.lifecycleStage}
- Trial days remaining: ${orgContext.trialDaysRemaining ?? 'N/A'}
- Engagement score: ${orgContext.engagementScore}/100
- Pending follow-ups: ${orgContext.pendingFollowups}
- Days since last contact: ${orgContext.daysSinceLastContact ?? 'Unknown'}` : 'No org currently focused.'}

Generate 3-5 suggested next actions. Each suggestion must be:
1. Actionable and specific
2. Based on the context provided
3. Prioritized by relevance

Return JSON array with this exact structure:
[
  {
    "id": "unique-id",
    "label": "Short label (3-5 words)",
    "template": "Command template starting with / (e.g., /log call at \\"OrgName\\")",
    "confidence": 0.0-1.0,
    "reasoning": "Brief reason why this is suggested",
    "icon": "activity" | "note" | "stage" | "deal" | "ticket" | "followup" | "call"
  }
]

PRIORITIZE:
1. Time-sensitive: expiring trials, overdue follow-ups
2. Engagement gaps: no contact in X days
3. Logical next steps after recent actions
4. Time-of-day appropriate (morning check-ins, EOD updates)

Return ONLY valid JSON array, no markdown.`;

  const result = await callGroqJSON<Suggestion[]>(prompt, {
    temperature: 0.4,
    max_tokens: 800,
    timeout_ms: 5000,
  });

  if (result.success && Array.isArray(result.data)) {
    // Validate and clean suggestions
    return result.data
      .filter((s) => s.label && s.template && typeof s.confidence === 'number')
      .slice(0, 5)
      .map((s, i) => ({
        ...s,
        id: s.id || `ai-${i}`,
        confidence: Math.min(1, Math.max(0, s.confidence)),
      }));
  }

  return [];
}

// Rule-based fallback suggestions
function generateRuleBasedSuggestions(
  sessionContext: SuggestionRequest['sessionContext'],
  orgContext: any
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const hour = new Date().getHours();
  const recentOrg = sessionContext.recentOrgs[0];

  // Time-based suggestions
  if (hour >= 8 && hour < 12) {
    suggestions.push({
      id: 'morning-checkin',
      label: 'Morning check-in',
      template: recentOrg ? `/log check_in at "${recentOrg}"` : '/log check_in at ',
      confidence: 0.7,
      reasoning: 'Good time for morning check-ins',
      icon: 'call',
    });
  } else if (hour >= 17 && hour < 20) {
    suggestions.push({
      id: 'eod-update',
      label: 'EOD status update',
      template: recentOrg ? `/su "${recentOrg}" ` : '/su ',
      confidence: 0.7,
      reasoning: 'End of day status updates',
      icon: 'activity',
    });
  }

  // Org-specific suggestions
  if (orgContext) {
    // Expiring trial
    if (orgContext.trialDaysRemaining !== null && orgContext.trialDaysRemaining <= 7) {
      suggestions.push({
        id: 'trial-expiring',
        label: `Discuss conversion`,
        template: `/log call at "${orgContext.name}" discussed conversion timeline`,
        confidence: 0.9,
        reasoning: `Trial expires in ${orgContext.trialDaysRemaining} days`,
        icon: 'deal',
      });
    }

    // No recent contact
    if (orgContext.daysSinceLastContact && orgContext.daysSinceLastContact >= 3) {
      suggestions.push({
        id: 'follow-up',
        label: `Follow up with ${orgContext.name}`,
        template: `/log call at "${orgContext.name}" `,
        confidence: 0.85,
        reasoning: `No contact in ${orgContext.daysSinceLastContact} days`,
        icon: 'call',
      });
    }

    // Pending follow-ups
    if (orgContext.pendingFollowups > 0) {
      suggestions.push({
        id: 'pending-followup',
        label: 'Complete follow-up',
        template: `/note at "${orgContext.name}" Completed follow-up: `,
        confidence: 0.8,
        reasoning: `${orgContext.pendingFollowups} pending follow-up(s)`,
        icon: 'followup',
      });
    }

    // Low engagement
    if (orgContext.engagementScore < 40) {
      suggestions.push({
        id: 'engagement-call',
        label: 'Schedule engagement call',
        template: `/followup "${orgContext.name}" Schedule engagement call`,
        confidence: 0.75,
        reasoning: 'Low engagement score',
        icon: 'call',
      });
    }
  }

  // Recent action based suggestions
  if (sessionContext.recentActions.includes('LOG_ACTIVITY')) {
    suggestions.push({
      id: 'follow-log-note',
      label: 'Add follow-up note',
      template: recentOrg ? `/note at "${recentOrg}" Follow-up: ` : '/note Follow-up: ',
      confidence: 0.65,
      reasoning: 'Add context after logging activity',
      icon: 'note',
    });
  }

  if (sessionContext.recentActions.includes('UPDATE_STAGE')) {
    suggestions.push({
      id: 'follow-stage-deal',
      label: 'Update deal value',
      template: recentOrg ? `/deal "${recentOrg}" $` : '/deal ',
      confidence: 0.6,
      reasoning: 'Update deal after stage change',
      icon: 'deal',
    });
  }

  // Default suggestions if nothing specific
  if (suggestions.length < 3) {
    const defaults: Suggestion[] = [
      {
        id: 'log-activity',
        label: 'Log activity',
        template: recentOrg ? `/log query at "${recentOrg}"` : '/log query at ',
        confidence: 0.5,
        reasoning: 'Common action',
        icon: 'activity',
      },
      {
        id: 'add-note',
        label: 'Add note',
        template: recentOrg ? `/note at "${recentOrg}" ` : '/note ',
        confidence: 0.45,
        reasoning: 'Document updates',
        icon: 'note',
      },
      {
        id: 'create-ticket',
        label: 'Create ticket',
        template: '/ticket "',
        confidence: 0.4,
        reasoning: 'Track issues',
        icon: 'ticket',
      },
    ];

    suggestions.push(...defaults.slice(0, 5 - suggestions.length));
  }

  // Sort by confidence and return top 5
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}
