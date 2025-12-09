/**
 * AI Inference for Enrichment Suggestions
 *
 * Uses Groq LLM for intelligent suggestions based on entity data.
 * Falls back to heuristics if Groq is unavailable.
 */

import Groq from 'groq-sdk';
import type { AISuggestion, EntityType } from './types';

interface EntityData {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  title?: string;
  org_name?: string;
  industry?: string;
  mrr?: number;
  employee_count?: number;
  recentEvents?: Array<{
    event_type?: string;
    sentiment?: string;
    timestamp?: string;
  }>;
  health_status?: string;
  deal_momentum?: string;
  influence?: string;
}

// Lazy Groq client initialization (server-side only)
let groqClient: Groq | null = null;

function getGroqClient(): Groq | null {
  if (typeof window !== 'undefined') {
    // Client-side - no Groq available
    return null;
  }
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groqClient;
}

/**
 * Infer suggestions for all questions based on entity data using Groq
 */
export async function inferSuggestionsWithGroq(
  entityType: EntityType,
  entities: EntityData[],
  questionIds: string[]
): Promise<Map<string, AISuggestion>> {
  const suggestions = new Map<string, AISuggestion>();

  // Get Groq client (server-side only)
  const groq = getGroqClient();

  // Skip if no Groq client or no entities - fall back to heuristics
  if (!groq || entities.length === 0) {
    return inferSuggestions(entityType, entities, questionIds);
  }

  try {
    // Build context about the entities
    const entityContext = entities.slice(0, 5).map(e => {
      if (entityType === 'organization') {
        return {
          name: e.org_name || e.name,
          mrr: e.mrr,
          employees: e.employee_count,
          industry: e.industry,
          recentActivityCount: e.recentEvents?.length || 0,
          recentEventTypes: e.recentEvents?.slice(0, 5).map(ev => ev.event_type) || [],
        };
      } else {
        return {
          name: e.name,
          email: e.email,
          title: e.title || e.role,
        };
      }
    });

    // Build prompts for each question
    for (const questionId of questionIds) {
      const suggestion = await inferSingleQuestion(questionId, entityType, entityContext);
      if (suggestion) {
        suggestions.set(questionId, suggestion);
      }
    }
  } catch (error) {
    console.error('Groq inference error, falling back to heuristics:', error);
    return inferSuggestions(entityType, entities, questionIds);
  }

  return suggestions;
}

/**
 * Infer a single question using Groq
 */
async function inferSingleQuestion(
  questionId: string,
  entityType: EntityType,
  entityContext: Array<Record<string, unknown>>
): Promise<AISuggestion | null> {
  const questionPrompts: Record<string, { prompt: string; options: string[] }> = {
    org_health_status: {
      prompt: `Based on the following organization data, assess the health of the customer relationship.
Consider: MRR (higher is better), employee count (stability indicator), recent activity (engagement).

Organization data:
${JSON.stringify(entityContext, null, 2)}

Choose ONE of these values and explain briefly:
- "healthy": Strong engagement, good MRR, active usage
- "warning": Some concerns but manageable
- "at_risk": Significant concerns, needs attention
- "churning": High churn risk, immediate action needed`,
      options: ['healthy', 'warning', 'at_risk', 'churning'],
    },
    org_deal_momentum: {
      prompt: `Based on the following organization data, assess the deal momentum.
Consider: Recent activity frequency, event types, engagement patterns.

Organization data:
${JSON.stringify(entityContext, null, 2)}

Choose ONE of these values and explain briefly:
- "fast_track": High momentum, frequent engagement, moving quickly
- "steady": Consistent progress, regular touchpoints
- "slow": Limited recent activity, needs nurturing
- "stalled": No recent engagement, deal may be stuck`,
      options: ['fast_track', 'steady', 'slow', 'stalled'],
    },
    user_influence: {
      prompt: `Based on the following contact data, assess their influence level in purchasing decisions.
Consider: Job title, seniority indicators, role type.

Contact data:
${JSON.stringify(entityContext, null, 2)}

Choose ONE of these values and explain briefly:
- "champion": Executive/C-level, final decision maker, strong advocate
- "decision_maker": VP/Director level, significant influence on decisions
- "influencer": Manager/Lead, can influence but not decide alone
- "evaluator": Individual contributor, evaluates but doesn't decide
- "blocker": May oppose or slow down the deal`,
      options: ['champion', 'decision_maker', 'influencer', 'evaluator', 'blocker'],
    },
  };

  const questionConfig = questionPrompts[questionId];
  if (!questionConfig) {
    return null;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant helping sales teams assess customer data.
Respond ONLY with valid JSON in this exact format:
{"value": "one_of_the_options", "confidence": 0.0_to_1.0, "reasoning": "brief explanation"}

Be conservative with confidence scores:
- 0.9+: Very clear signals
- 0.7-0.9: Strong signals
- 0.5-0.7: Moderate signals
- Below 0.5: Weak signals (don't suggest)`,
        },
        {
          role: 'user',
          content: questionConfig.prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) return null;

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate the response
    if (
      !parsed.value ||
      !questionConfig.options.includes(parsed.value) ||
      typeof parsed.confidence !== 'number'
    ) {
      return null;
    }

    // Only return if confidence is meaningful
    if (parsed.confidence < 0.4) {
      return null;
    }

    return {
      value: parsed.value,
      confidence: Math.min(0.95, parsed.confidence),
      reasoning: parsed.reasoning || 'AI analysis',
    };
  } catch (error) {
    console.error(`Groq inference error for ${questionId}:`, error);
    return null;
  }
}

/**
 * Synchronous heuristic-based inference (fallback)
 */
export function inferSuggestions(
  entityType: EntityType,
  entities: EntityData[],
  questionIds: string[]
): Map<string, AISuggestion> {
  const suggestions = new Map<string, AISuggestion>();

  for (const questionId of questionIds) {
    const result = inferForQuestion(questionId, entityType, entities);
    if (result) {
      suggestions.set(questionId, result);
    }
  }

  return suggestions;
}

function inferForQuestion(
  questionId: string,
  entityType: EntityType,
  entities: EntityData[]
): AISuggestion | null {
  switch (questionId) {
    case 'org_health_status':
      return inferHealthStatus(entities);
    case 'org_deal_momentum':
      return inferDealMomentum(entities);
    case 'user_influence':
      return inferUserInfluence(entities);
    default:
      return null;
  }
}

function inferHealthStatus(entities: EntityData[]): AISuggestion | null {
  const signals = entities.map(entity => {
    let score = 50;
    let confidence = 0.3;

    if (entity.mrr !== undefined) {
      if (entity.mrr > 10000) { score += 20; confidence += 0.15; }
      else if (entity.mrr > 5000) { score += 10; confidence += 0.1; }
      else if (entity.mrr < 1000) { score -= 10; confidence += 0.1; }
    }

    if (entity.recentEvents && entity.recentEvents.length > 0) {
      const positiveEvents = entity.recentEvents.filter(
        e => e.sentiment === 'positive' || e.event_type?.includes('upgrade')
      ).length;
      const negativeEvents = entity.recentEvents.filter(
        e => e.sentiment === 'negative' || e.event_type?.includes('complaint')
      ).length;
      score += (positiveEvents * 10) - (negativeEvents * 15);
      confidence += Math.min(0.2, entity.recentEvents.length * 0.05);
    }

    if (entity.employee_count !== undefined) {
      if (entity.employee_count > 500) { score += 10; confidence += 0.1; }
      else if (entity.employee_count > 100) { score += 5; confidence += 0.05; }
    }

    return { score, confidence };
  });

  const avgScore = signals.reduce((sum, s) => sum + s.score, 0) / signals.length;
  const avgConfidence = Math.min(0.85, signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length);

  let value: string;
  if (avgScore >= 70) value = 'healthy';
  else if (avgScore >= 50) value = 'warning';
  else if (avgScore >= 30) value = 'at_risk';
  else value = 'churning';

  if (avgConfidence < 0.4) return null;

  return { value, confidence: avgConfidence, reasoning: 'Based on MRR and engagement signals' };
}

function inferDealMomentum(entities: EntityData[]): AISuggestion | null {
  const signals = entities.map(entity => {
    let score = 50;
    let confidence = 0.3;

    if (entity.recentEvents && entity.recentEvents.length > 0) {
      const recentCount = entity.recentEvents.filter(e => {
        if (!e.timestamp) return false;
        const daysSince = (Date.now() - new Date(e.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 14;
      }).length;

      if (recentCount >= 5) { score += 30; confidence += 0.25; }
      else if (recentCount >= 2) { score += 15; confidence += 0.15; }
      else if (recentCount === 0) { score -= 20; confidence += 0.1; }

      const expansionEvents = entity.recentEvents.filter(
        e => e.event_type?.includes('expand') || e.event_type?.includes('upgrade')
      ).length;
      if (expansionEvents > 0) { score += 20; confidence += 0.15; }
    }

    return { score, confidence };
  });

  const avgScore = signals.reduce((sum, s) => sum + s.score, 0) / signals.length;
  const avgConfidence = Math.min(0.85, signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length);

  let value: string;
  if (avgScore >= 75) value = 'fast_track';
  else if (avgScore >= 55) value = 'steady';
  else if (avgScore >= 35) value = 'slow';
  else value = 'stalled';

  if (avgConfidence < 0.4) return null;

  return { value, confidence: avgConfidence, reasoning: 'Based on recent engagement patterns' };
}

function inferUserInfluence(entities: EntityData[]): AISuggestion | null {
  const suggestions = entities.map(entity => {
    const title = (entity.title || entity.role || '').toLowerCase();

    if (/\b(ceo|cto|cfo|coo|cmo|chief|president|founder|owner)\b/.test(title)) {
      return { value: 'champion', confidence: 0.85 };
    }
    if (/\b(vp|vice president|director|head of|general manager)\b/.test(title)) {
      return { value: 'decision_maker', confidence: 0.8 };
    }
    if (/\b(manager|lead|principal|senior|architect)\b/.test(title)) {
      return { value: 'influencer', confidence: 0.7 };
    }
    if (/\b(analyst|specialist|consultant|engineer|developer)\b/.test(title)) {
      return { value: 'evaluator', confidence: 0.6 };
    }
    return { value: null, confidence: 0 };
  });

  const validSuggestions = suggestions.filter(s => s.value !== null);
  if (validSuggestions.length === 0) return null;

  const valueCounts = new Map<string, number>();
  let maxCount = 0;
  let bestValue = '';
  let avgConfidence = 0;

  for (const s of validSuggestions) {
    if (s.value) {
      const count = (valueCounts.get(s.value) || 0) + 1;
      valueCounts.set(s.value, count);
      avgConfidence += s.confidence;
      if (count > maxCount) { maxCount = count; bestValue = s.value; }
    }
  }

  return {
    value: bestValue,
    confidence: avgConfidence / validSuggestions.length,
    reasoning: `Based on job title analysis`,
  };
}

export default inferSuggestionsWithGroq;
