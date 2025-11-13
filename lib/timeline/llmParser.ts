/**
 * LLM-Powered Timeline Parser using Groq (Llama 3.1)
 * Extracts structured timeline events from unstructured narrative text
 * (emails, Teams messages, CRM notes, meeting summaries)
 */

import Groq from "groq-sdk";

// ===================================
// TYPES & INTERFACES
// ===================================

export interface ParsedEvent {
  event_timestamp: Date;
  event_type: string;
  event_category: string;
  title: string;
  description: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  mentioned_people: string[];
  mentioned_features: string[];
  follow_up_required: boolean;
  follow_up_date: Date | null;
  parse_confidence: number; // 0.0 to 1.0
  metadata: {
    original_segment: string;
    llm_suggested_type?: string;
    fuzzy_match_score?: number;
  };
}

export interface ParseContext {
  org_id: string;
  org_name: string;
  date_range_hint?: {
    start: Date;
    end: Date;
  };
  existing_events?: Array<{
    event_timestamp: Date;
    event_type: string;
    title: string;
  }>;
  user_correction_history?: Record<string, string>; // suggested_type => corrected_type
}

export interface ParseResult {
  success: boolean;
  events: ParsedEvent[];
  confidence_summary: {
    high: number;  // count of events with confidence >= 0.8
    medium: number; // count of events with confidence 0.5-0.79
    low: number;    // count of events with confidence < 0.5
  };
  processing_time_ms: number;
  error?: string;
}

// Event Type Taxonomy (47 types total)
export const EVENT_TAXONOMY = [
  // Onboarding (7)
  { type: 'trial_access_requested', category: 'onboarding', keywords: ['trial access', 'access requested', 'signup', 'register'], icon: '📧' },
  { type: 'credentials_shared', category: 'onboarding', keywords: ['credentials', 'login', 'password', 'username'], icon: '🔑' },
  { type: 'trial_access_provided', category: 'onboarding', keywords: ['access provided', 'granted access', 'activated'], icon: '✅' },
  { type: 'delivery_issue', category: 'onboarding', keywords: ['not receiving', 'delivery issue', 'didn\'t get', 'not received'], icon: '⚠️' },
  { type: 'first_login', category: 'onboarding', keywords: ['first login', 'logged in first time', 'initial access'], icon: '🚪' },
  { type: 'allowlist_support', category: 'onboarding', keywords: ['allowlist', 'whitelist', 'IT support', 'firewall', 'blocked'], icon: '🛡️' },
  { type: 'onboarding_complete', category: 'onboarding', keywords: ['onboarding complete', 'setup done', 'ready to use'], icon: '✅' },

  // Engagement (6)
  { type: 'usage_observed', category: 'engagement', keywords: ['usage', 'activity', 'using', 'explored'], icon: '📊' },
  { type: 'feature_tested', category: 'engagement', keywords: ['tested', 'tried', 'explored feature'], icon: '🧪' },
  { type: 'use_case_tested', category: 'engagement', keywords: ['use case', 'scenario', 'workflow'], icon: '🎯' },
  { type: 'user_logged_in', category: 'engagement', keywords: ['logged in', 'login', 'accessed'], icon: '👤' },
  { type: 'low_engagement', category: 'engagement', keywords: ['low activity', 'not using', 'inactive', 'couldn\'t explore'], icon: '📉' },
  { type: 'high_engagement', category: 'engagement', keywords: ['high activity', 'actively using', 'frequent'], icon: '📈' },

  // Communication (6)
  { type: 'call_scheduled', category: 'communication', keywords: ['scheduled call', 'call scheduled', 'meeting scheduled'], icon: '📅' },
  { type: 'call_completed', category: 'communication', keywords: ['call', 'spoke', 'discussed', 'conversation', 'output of call'], icon: '📞' },
  { type: 'meeting_held', category: 'communication', keywords: ['meeting', 'met with', 'discussed in meeting'], icon: '🤝' },
  { type: 'demo_conducted', category: 'communication', keywords: ['demo', 'demonstration', 'showed'], icon: '🖥️' },
  { type: 'email_exchange', category: 'communication', keywords: ['email', 'emailed', 'wrote'], icon: '📧' },
  { type: 'follow_up_sent', category: 'communication', keywords: ['follow up', 'following up', 'check in', 'next follow up'], icon: '➡️' },

  // Feedback (7)
  { type: 'feedback_received', category: 'feedback', keywords: ['feedback', 'opinion', 'thoughts'], icon: '💬' },
  { type: 'positive_feedback', category: 'feedback', keywords: ['liked', 'loved', 'impressed', 'positive', 'great', 'excellent'], icon: '👍' },
  { type: 'negative_feedback', category: 'feedback', keywords: ['didn\'t like', 'disappointed', 'issue', 'problem'], icon: '👎' },
  { type: 'feature_request', category: 'feedback', keywords: ['feature request', 'would like', 'need', 'requested'], icon: '💡' },
  { type: 'pain_point_identified', category: 'feedback', keywords: ['pain point', 'challenge', 'difficulty', 'concern'], icon: '⚠️' },
  { type: 'testimonial_received', category: 'feedback', keywords: ['testimonial', 'review', 'recommendation'], icon: '🏆' },
  { type: 'nps_survey_completed', category: 'feedback', keywords: ['NPS', 'survey', 'score'], icon: '📋' },

  // Support (6)
  { type: 'support_ticket_created', category: 'support', keywords: ['support ticket', 'ticket', 'support request'], icon: '🎫' },
  { type: 'technical_issue_reported', category: 'support', keywords: ['technical issue', 'error', 'not working'], icon: '🔧' },
  { type: 'bug_reported', category: 'support', keywords: ['bug', 'broken', 'error'], icon: '🐛' },
  { type: 'internal_escalation', category: 'support', keywords: ['escalated', 'escalation', 'internal'], icon: '⬆️' },
  { type: 'issue_resolved', category: 'support', keywords: ['resolved', 'fixed', 'solved'], icon: '✅' },
  { type: 'workaround_provided', category: 'support', keywords: ['workaround', 'temporary fix', 'alternative'], icon: '🔄' },

  // Milestones (8)
  { type: 'trial_extended', category: 'milestone', keywords: ['trial extended', 'extension', 'extended trial', 'trial window'], icon: '🕐' },
  { type: 'trial_converted', category: 'milestone', keywords: ['converted', 'became customer', 'signed up'], icon: '🎉' },
  { type: 'contract_signed', category: 'milestone', keywords: ['contract', 'signed', 'agreement'], icon: '📝' },
  { type: 'deal_lost', category: 'milestone', keywords: ['lost', 'churned', 'didn\'t convert'], icon: '❌' },
  { type: 'deal_deferred', category: 'milestone', keywords: ['deferred', 'postponed', 'delayed', 'will discuss', 'budgeting will'], icon: '⏸️' },
  { type: 'champion_identified', category: 'milestone', keywords: ['champion', 'advocate', 'internal champion'], icon: '⭐' },
  { type: 'budget_confirmed', category: 'milestone', keywords: ['budget', 'funding', 'approved'], icon: '💰' },
  { type: 'decision_maker_engaged', category: 'milestone', keywords: ['decision maker', 'stakeholder', 'executive'], icon: '👥' },

  // Sales Notes (5)
  { type: 'sales_note', category: 'sales', keywords: ['note', 'observation', 'update'], icon: '📝' },
  { type: 'internal_note', category: 'sales', keywords: ['internal', 'for team', 'internally'], icon: '📌' },
  { type: 'competitor_mentioned', category: 'sales', keywords: ['competitor', 'alternative', 'vs'], icon: '⚡' },
  { type: 'pricing_discussion', category: 'sales', keywords: ['pricing', 'cost', 'price'], icon: '💲' },
  { type: 'renewal_discussion', category: 'sales', keywords: ['renewal', 'renew', 'contract renewal'], icon: '🔄' },

  // Learnings (2)
  { type: 'learning_captured', category: 'learning', keywords: ['learning', 'insight', 'takeaway'], icon: '📚' },
  { type: 'follow_up_note', category: 'learning', keywords: ['follow up note', 'reminder', 'action item'], icon: '🔖' },
] as const;

// ===================================
// GROQ INTEGRATION
// ===================================

/**
 * Initialize Groq client
 */
function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY not found in environment variables');
    return null;
  }
  return new Groq({ apiKey });
}

/**
 * Call Groq API with retry logic (using Llama 3.1 70B)
 */
async function callGroqAPI(
  prompt: string,
  maxRetries: number = 3
): Promise<string> {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error('Groq API client not initialized');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.3-70b-versatile", // Latest production model (280 tokens/sec)
        temperature: 0.3, // Lower temperature for more consistent structured output
        max_tokens: 4000,
        top_p: 1,
        stream: false
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      // Handle rate limiting (429) with exponential backoff
      if (error.status === 429 && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Rate limited, retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

// ===================================
// PROMPT ENGINEERING
// ===================================

/**
 * Build structured prompt for Gemini Pro to extract timeline events
 */
function buildExtractionPrompt(
  text: string,
  context: ParseContext
): string {
  const dateHint = context.date_range_hint
    ? `Likely date range: ${context.date_range_hint.start.toISOString().split('T')[0]} to ${context.date_range_hint.end.toISOString().split('T')[0]}`
    : 'Infer dates from context (use year 2024-2025 if not specified)';

  const eventTypeList = EVENT_TAXONOMY.map(
    (et, idx) => `${idx + 1}. ${et.type} (${et.category}) - keywords: ${et.keywords.join(', ')}`
  ).join('\n');

  return `You are an expert at parsing account manager notes to extract structured timeline events.

ORGANIZATION: ${context.org_name}
DATE CONTEXT: ${dateHint}

VALID EVENT TYPES (47 total):
${eventTypeList}

IMPORTANT RULES:
1. Extract ALL events from the narrative (there may be multiple events in one paragraph)
2. Each event MUST have a date - infer from phrases like "28 Oct'25", "As of 13 Nov'25", "next week", "Nov'25 (17-21)"
3. Match to the CLOSEST event type from the list above (use exact type name, not keywords)
4. If uncertain about the type, use 'sales_note' as default
5. Split compound narratives into separate events (e.g., "call on 28th + follow-up on 14th" = 2 events)
6. Extract dates in any format and convert to ISO 8601 (YYYY-MM-DDTHH:MM:SS)
7. Infer sentiment from tone: positive (liked, great, impressed), neutral (update, note), negative (issue, problem, concern)
8. Rate your confidence 0-100 for each event (higher = more certain about date, type, details)
9. Extract mentioned people names, product features, and action items
10. Identify if follow-up is required and extract follow-up date if mentioned

NARRATIVE TEXT TO PARSE:
"""
${text}
"""

OUTPUT REQUIREMENTS:
Return ONLY valid JSON array, no markdown formatting, no explanations.
Each event object must have these fields:
{
  "date": "ISO 8601 timestamp",
  "event_type": "exact type from list",
  "event_category": "category from list",
  "title": "short title (5-10 words)",
  "description": "full details (preserve key information)",
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0-100,
  "original_segment": "the exact text snippet this event was extracted from",
  "mentioned_people": ["name1", "name2"],
  "mentioned_features": ["feature1", "feature2"],
  "follow_up_required": boolean,
  "follow_up_date": "ISO date or null",
  "tags": ["tag1", "tag2"]
}

JSON OUTPUT:`;
}

// ===================================
// POST-PROCESSING & VALIDATION
// ===================================

/**
 * Validate and enrich LLM-generated events
 */
function validateAndEnrichEvents(
  rawEvents: any[],
  context: ParseContext
): ParsedEvent[] {
  const validatedEvents: ParsedEvent[] = [];

  for (const raw of rawEvents) {
    try {
      // Validate required fields
      if (!raw.date || !raw.event_type || !raw.title) {
        console.warn('Skipping event with missing required fields:', raw);
        continue;
      }

      // Parse and validate date
      const eventDate = new Date(raw.date);
      if (isNaN(eventDate.getTime())) {
        console.warn('Invalid date:', raw.date);
        continue;
      }

      // Validate event type exists in taxonomy
      const taxonomyEntry = EVENT_TAXONOMY.find(et => et.type === raw.event_type);
      if (!taxonomyEntry) {
        console.warn('Unknown event type, using sales_note:', raw.event_type);
        raw.event_type = 'sales_note';
        raw.event_category = 'sales';
      }

      // Calculate severity based on category and sentiment
      const severity = calculateSeverity(raw.event_category, raw.sentiment);

      // Build validated event
      const validatedEvent: ParsedEvent = {
        event_timestamp: eventDate,
        event_type: raw.event_type,
        event_category: raw.event_category || taxonomyEntry?.category || 'sales',
        title: raw.title.trim(),
        description: raw.description?.trim() || '',
        sentiment: validateSentiment(raw.sentiment),
        severity,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        mentioned_people: Array.isArray(raw.mentioned_people) ? raw.mentioned_people : [],
        mentioned_features: Array.isArray(raw.mentioned_features) ? raw.mentioned_features : [],
        follow_up_required: raw.follow_up_required === true,
        follow_up_date: raw.follow_up_date ? new Date(raw.follow_up_date) : null,
        parse_confidence: Math.min(100, Math.max(0, raw.confidence || 50)) / 100, // Normalize to 0-1
        metadata: {
          original_segment: raw.original_segment || '',
          llm_suggested_type: raw.event_type,
        },
      };

      validatedEvents.push(validatedEvent);
    } catch (error) {
      console.error('Error validating event:', error, raw);
    }
  }

  return validatedEvents;
}

/**
 * Validate sentiment value
 */
function validateSentiment(sentiment: string): 'positive' | 'neutral' | 'negative' {
  const normalized = sentiment?.toLowerCase();
  if (normalized === 'positive') return 'positive';
  if (normalized === 'negative') return 'negative';
  return 'neutral';
}

/**
 * Calculate severity based on category and sentiment
 */
function calculateSeverity(
  category: string,
  sentiment: string
): 'low' | 'medium' | 'high' | 'critical' {
  // Critical: negative support/onboarding issues
  if (category === 'support' && sentiment === 'negative') return 'critical';
  if (category === 'onboarding' && sentiment === 'negative') return 'high';

  // High: milestones and important feedback
  if (category === 'milestone') return 'high';
  if (category === 'feedback' && sentiment === 'negative') return 'high';

  // Medium: communication and engagement
  if (category === 'communication') return 'medium';
  if (category === 'engagement') return 'medium';

  // Low: notes and neutral events
  return 'low';
}

// ===================================
// MAIN PARSER FUNCTION
// ===================================

/**
 * Parse narrative text into structured timeline events using Gemini Pro
 */
export async function parseNarrativeWithLLM(
  text: string,
  context: ParseContext
): Promise<ParseResult> {
  const startTime = Date.now();

  try {
    // Build prompt
    const prompt = buildExtractionPrompt(text, context);

    // Call Groq API
    const llmResponse = await callGroqAPI(prompt);

    // Parse JSON response
    let rawEvents: any[];
    try {
      // Clean up response (remove markdown formatting if present)
      const jsonText = llmResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      rawEvents = JSON.parse(jsonText);

      if (!Array.isArray(rawEvents)) {
        throw new Error('LLM response is not an array');
      }
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON:', llmResponse);
      throw new Error('Invalid JSON response from LLM');
    }

    // Validate and enrich events
    const events = validateAndEnrichEvents(rawEvents, context);

    // Calculate confidence summary
    const confidenceSummary = {
      high: events.filter(e => e.parse_confidence >= 0.8).length,
      medium: events.filter(e => e.parse_confidence >= 0.5 && e.parse_confidence < 0.8).length,
      low: events.filter(e => e.parse_confidence < 0.5).length,
    };

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      events,
      confidence_summary: confidenceSummary,
      processing_time_ms: processingTime,
    };
  } catch (error: any) {
    console.error('Error in parseNarrativeWithLLM:', error);

    return {
      success: false,
      events: [],
      confidence_summary: { high: 0, medium: 0, low: 0 },
      processing_time_ms: Date.now() - startTime,
      error: error.message || 'Unknown error during parsing',
    };
  }
}
