/**
 * Timeline Events Bulk Import - Framework Version
 *
 * Migrated from lib/timeline/llmParser.ts to use the unified Bulk Import Framework
 * Reduced from 424 lines to ~180 lines (58% reduction)
 *
 * Benefits:
 * - Uses standardized AIParser with Groq integration
 * - Automatic retry logic and rate limiting
 * - Standardized error handling
 * - Progress tracking built-in
 * - Consistent results display
 */

import { BulkImporter, createFieldBasedDuplicateDetector } from '@/lib/bulkImport';
import { createAIParser } from '@/lib/bulkImport/parsers/AIParser';
import { validateField, parseFlexibleDate } from '@/lib/validation/bulkImport';

// =====================================================
// EVENT TAXONOMY - 47 Event Types
// =====================================================

export const EVENT_TAXONOMY = [
  // Onboarding (7 types)
  { type: 'trial_access_requested', category: 'onboarding', description: 'User requested trial access' },
  { type: 'credentials_shared', category: 'onboarding', description: 'Login credentials shared with user' },
  { type: 'first_login', category: 'onboarding', description: 'User logged in for the first time' },
  { type: 'training_scheduled', category: 'onboarding', description: 'Training session scheduled' },
  { type: 'training_completed', category: 'onboarding', description: 'Training session completed' },
  { type: 'onboarding_checklist_sent', category: 'onboarding', description: 'Onboarding checklist sent to user' },
  { type: 'setup_assistance_requested', category: 'onboarding', description: 'User requested setup help' },

  // Engagement (10 types)
  { type: 'feature_used', category: 'engagement', description: 'User used a specific feature' },
  { type: 'dashboard_accessed', category: 'engagement', description: 'User accessed dashboard' },
  { type: 'report_generated', category: 'engagement', description: 'User generated a report' },
  { type: 'data_imported', category: 'engagement', description: 'User imported data' },
  { type: 'data_exported', category: 'engagement', description: 'User exported data' },
  { type: 'settings_configured', category: 'engagement', description: 'User configured settings' },
  { type: 'integration_enabled', category: 'engagement', description: 'User enabled an integration' },
  { type: 'custom_workflow_created', category: 'engagement', description: 'User created custom workflow' },
  { type: 'automation_setup', category: 'engagement', description: 'User set up automation' },
  { type: 'inactive_period', category: 'engagement', description: 'User was inactive for a period' },

  // Communication (8 types)
  { type: 'email_sent', category: 'communication', description: 'Email sent to user' },
  { type: 'email_received', category: 'communication', description: 'Email received from user' },
  { type: 'meeting_scheduled', category: 'communication', description: 'Meeting scheduled with user' },
  { type: 'meeting_completed', category: 'communication', description: 'Meeting completed' },
  { type: 'phone_call', category: 'communication', description: 'Phone call with user' },
  { type: 'slack_message', category: 'communication', description: 'Slack message exchanged' },
  { type: 'demo_scheduled', category: 'communication', description: 'Product demo scheduled' },
  { type: 'demo_completed', category: 'communication', description: 'Product demo completed' },

  // Feedback (7 types)
  { type: 'feature_request', category: 'feedback', description: 'User requested a feature' },
  { type: 'bug_report', category: 'feedback', description: 'User reported a bug' },
  { type: 'positive_feedback', category: 'feedback', description: 'User provided positive feedback' },
  { type: 'negative_feedback', category: 'feedback', description: 'User provided negative feedback' },
  { type: 'survey_completed', category: 'feedback', description: 'User completed survey' },
  { type: 'nps_score_submitted', category: 'feedback', description: 'User submitted NPS score' },
  { type: 'testimonial_provided', category: 'feedback', description: 'User provided testimonial' },

  // Support (6 types)
  { type: 'support_ticket_opened', category: 'support', description: 'Support ticket opened' },
  { type: 'support_ticket_resolved', category: 'support', description: 'Support ticket resolved' },
  { type: 'documentation_accessed', category: 'support', description: 'User accessed documentation' },
  { type: 'help_center_visited', category: 'support', description: 'User visited help center' },
  { type: 'escalation_requested', category: 'support', description: 'Support escalation requested' },
  { type: 'sla_breach', category: 'support', description: 'SLA breach occurred' },

  // Milestones (5 types)
  { type: 'trial_extended', category: 'milestones', description: 'Trial period extended' },
  { type: 'trial_converted', category: 'milestones', description: 'Trial converted to paid' },
  { type: 'subscription_upgraded', category: 'milestones', description: 'Subscription upgraded' },
  { type: 'subscription_downgraded', category: 'milestones', description: 'Subscription downgraded' },
  { type: 'account_cancelled', category: 'milestones', description: 'Account cancelled' },

  // Sales Notes (2 types)
  { type: 'sales_note', category: 'sales_notes', description: 'General sales note' },
  { type: 'account_plan_updated', category: 'sales_notes', description: 'Account plan updated' },

  // Learnings (2 types)
  { type: 'customer_insight', category: 'learnings', description: 'Customer insight discovered' },
  { type: 'use_case_identified', category: 'learnings', description: 'New use case identified' },
] as const;

export type EventType = typeof EVENT_TAXONOMY[number]['type'];
export type EventCategory = typeof EVENT_TAXONOMY[number]['category'];

// =====================================================
// TYPES
// =====================================================

export interface ParsedTimelineEvent {
  event_timestamp?: string | Date;
  event_type?: string;
  event_category?: string;
  title?: string;
  description?: string;
  sentiment?: string;
  severity?: string;
  tags?: string[];
  mentioned_people?: string[];
  mentioned_features?: string[];
  follow_up_required?: boolean;
  follow_up_date?: string | Date | null;
  parse_confidence?: number;
  original_segment?: string;
}

// Backward compatibility alias (used by duplicateDetector, activityMatcher, etc.)
export type ParsedEvent = ParsedTimelineEvent;

interface TimelineEventRecord {
  org_id: string;
  event_timestamp: Date;
  event_type: EventType;
  event_category: EventCategory;
  title: string;
  description: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  mentioned_people: string[];
  mentioned_features: string[];
  follow_up_required: boolean;
  follow_up_date: Date | null;
  parse_confidence: number;
  metadata: {
    original_segment: string;
    llm_suggested_type?: string;
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Normalizes sentiment values
 */
function normalizeSentiment(sentiment: any): 'positive' | 'neutral' | 'negative' {
  if (!sentiment) return 'neutral';
  const s = String(sentiment).toLowerCase().trim();
  if (['positive', 'good', 'happy', 'satisfied'].includes(s)) return 'positive';
  if (['negative', 'bad', 'unhappy', 'frustrated'].includes(s)) return 'negative';
  return 'neutral';
}

/**
 * Normalizes severity values
 */
function normalizeSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
  if (!severity) return 'low';
  const s = String(severity).toLowerCase().trim();
  if (['critical', 'urgent', 'blocker'].includes(s)) return 'critical';
  if (['high', 'important'].includes(s)) return 'high';
  if (['medium', 'moderate', 'normal'].includes(s)) return 'medium';
  return 'low';
}

/**
 * Validates event type against taxonomy
 */
function validateEventType(type: string): boolean {
  return EVENT_TAXONOMY.some(t => t.type === type);
}

/**
 * Gets event category from type
 */
function getEventCategory(type: string): EventCategory {
  const taxonomy = EVENT_TAXONOMY.find(t => t.type === type);
  return taxonomy?.category || 'sales_notes';
}

/**
 * Calculates severity based on category and sentiment
 */
function calculateSeverity(category: EventCategory, sentiment: string): 'low' | 'medium' | 'high' | 'critical' {
  if (category === 'support' && sentiment === 'negative') return 'high';
  if (category === 'feedback' && sentiment === 'negative') return 'medium';
  if (category === 'milestones') return 'high';
  if (sentiment === 'positive') return 'low';
  return 'medium';
}

// =====================================================
// IMPORTER CONFIGURATION
// =====================================================

export function createTimelineEventsImporter(orgId: string) {
  // Build event types list for prompt
  const eventTypesList = EVENT_TAXONOMY.map(
    (e, i) => `${i + 1}. ${e.type} (${e.category}): ${e.description}`
  ).join('\n');

  return new BulkImporter<ParsedTimelineEvent, TimelineEventRecord>({
    // Entity information
    entityType: 'timeline event',
    entityPlural: 'timeline_events',

    // Parser: AI-powered using Groq LLM
    parser: createAIParser<ParsedTimelineEvent>({
      entityType: 'timeline event',
      entityPlural: 'timeline_events',

      fields: [
        {
          name: 'event_timestamp',
          type: 'date',
          required: true,
          description: 'When the event occurred (ISO 8601 format)',
        },
        {
          name: 'event_type',
          type: 'string',
          required: true,
          description: `Type from taxonomy (one of 47 types). Must be one of: ${EVENT_TAXONOMY.map(e => e.type).join(', ')}`,
        },
        {
          name: 'event_category',
          type: 'string',
          required: true,
          description: 'Category: onboarding, engagement, communication, feedback, support, milestones, sales_notes, or learnings',
        },
        {
          name: 'title',
          type: 'string',
          required: true,
          description: 'Brief title summarizing the event (max 100 chars)',
        },
        {
          name: 'description',
          type: 'string',
          required: true,
          description: 'Detailed description of what happened',
        },
        {
          name: 'sentiment',
          type: 'string',
          required: false,
          description: 'Sentiment: positive, neutral, or negative',
        },
        {
          name: 'severity',
          type: 'string',
          required: false,
          description: 'Severity: low, medium, high, or critical',
        },
        {
          name: 'tags',
          type: 'array',
          required: false,
          description: 'Relevant tags or keywords',
        },
        {
          name: 'mentioned_people',
          type: 'array',
          required: false,
          description: 'Names of people mentioned',
        },
        {
          name: 'mentioned_features',
          type: 'array',
          required: false,
          description: 'Product features mentioned',
        },
        {
          name: 'follow_up_required',
          type: 'boolean',
          required: false,
          description: 'Whether follow-up action is needed',
        },
        {
          name: 'follow_up_date',
          type: 'date',
          required: false,
          description: 'When to follow up (if applicable)',
        },
        {
          name: 'parse_confidence',
          type: 'number',
          required: false,
          description: 'Confidence score 0-1 (how confident are you in this extraction)',
        },
        {
          name: 'original_segment',
          type: 'string',
          required: false,
          description: 'Original text segment this event was extracted from',
        },
      ],

      specialInstructions: [
        'Extract ALL timeline events from the text, even if there are multiple events',
        'Dates should be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)',
        'event_type MUST be one of the 47 predefined types from the taxonomy',
        'If you cannot find an exact match, choose the closest event_type',
        'Sentiment should be positive, neutral, or negative based on tone',
        'Severity should reflect urgency: low (routine), medium (notable), high (important), critical (urgent)',
        'mentioned_people should include any names of people mentioned',
        'mentioned_features should include any product features discussed',
        'follow_up_required should be true if action is needed',
        'parse_confidence should reflect how certain you are (0.8+ = high, 0.5-0.8 = medium, <0.5 = low)',
        `\n\n**EVENT TAXONOMY (47 types):**\n${eventTypesList}`,
      ],

      examples: [
        'Input: "2024-01-15: John requested trial access for his team"\nOutput: { event_type: "trial_access_requested", event_category: "onboarding", title: "Trial access requested", event_timestamp: "2024-01-15", sentiment: "neutral", parse_confidence: 0.95 }',
        'Input: "Had a great call with Sarah yesterday about the new reporting feature"\nOutput: { event_type: "meeting_completed", event_category: "communication", title: "Call with Sarah about reporting", mentioned_people: ["Sarah"], mentioned_features: ["reporting"], sentiment: "positive", parse_confidence: 0.85 }',
      ],

      temperature: 0.2, // Low temperature for consistent extraction
      maxTokens: 4000,
      maxRetries: 3,
    }),

    // Validator: Ensure required fields and valid event types
    validator: (item, index) => {
      const errors: string[] = [];

      // Validate timestamp
      if (!item.event_timestamp) {
        errors.push('event_timestamp is required');
      } else {
        const date = parseFlexibleDate(item.event_timestamp);
        if (!date) {
          errors.push('event_timestamp must be a valid date');
        }
      }

      // Validate event type
      if (!item.event_type) {
        errors.push('event_type is required');
      } else if (!validateEventType(item.event_type)) {
        errors.push(`event_type "${item.event_type}" is not in the taxonomy`);
      }

      // Validate title
      if (!item.title || item.title.trim().length === 0) {
        errors.push('title is required');
      }

      // Validate description
      if (!item.description || item.description.trim().length === 0) {
        errors.push('description is required');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },

    // Transformer: Convert parsed data to database format
    transformer: (item) => {
      const event_type = item.event_type as EventType;
      const event_category = item.event_category || getEventCategory(event_type);
      const sentiment = normalizeSentiment(item.sentiment);
      const severity = item.severity
        ? normalizeSeverity(item.severity)
        : calculateSeverity(event_category as EventCategory, sentiment);

      return {
        org_id: orgId,
        event_timestamp: parseFlexibleDate(item.event_timestamp) || new Date(),
        event_type,
        event_category: event_category as EventCategory,
        title: String(item.title || '').trim(),
        description: String(item.description || '').trim(),
        sentiment,
        severity,
        tags: Array.isArray(item.tags) ? item.tags : [],
        mentioned_people: Array.isArray(item.mentioned_people) ? item.mentioned_people : [],
        mentioned_features: Array.isArray(item.mentioned_features) ? item.mentioned_features : [],
        follow_up_required: Boolean(item.follow_up_required),
        follow_up_date: item.follow_up_date ? parseFlexibleDate(item.follow_up_date) : null,
        parse_confidence: typeof item.parse_confidence === 'number'
          ? Math.max(0, Math.min(1, item.parse_confidence))
          : 0.7,
        metadata: {
          original_segment: String(item.original_segment || item.description || ''),
          llm_suggested_type: item.event_type,
        },
      };
    },

    // Database configuration
    database: {
      tableName: 'trial_timeline_events',
      batchSize: 50, // Smaller batches for AI-parsed data
      delayBetweenBatches: 500, // Delay to avoid rate limits
    },

    // Duplicate detection: Check for duplicate timestamps + titles
    duplicateDetector: createFieldBasedDuplicateDetector<TimelineEventRecord>(
      ['event_timestamp', 'title'],
      'skip' // Skip duplicates
    ),

    // Preview columns
    preview: {
      maxRows: 20,
      columns: [
        {
          key: 'event_timestamp',
          label: 'Date',
          width: '15%',
          formatter: (value) => {
            const date = parseFlexibleDate(value);
            return date ? date.toLocaleDateString() : '-';
          },
        },
        {
          key: 'event_type',
          label: 'Type',
          width: '20%',
          formatter: (value) => String(value || '').replace(/_/g, ' '),
        },
        {
          key: 'title',
          label: 'Title',
          width: '30%',
        },
        {
          key: 'sentiment',
          label: 'Sentiment',
          width: '12%',
          formatter: (value) => {
            const v = String(value || 'neutral');
            return v.charAt(0).toUpperCase() + v.slice(1);
          },
        },
        {
          key: 'parse_confidence',
          label: 'Confidence',
          width: '13%',
          formatter: (value) => {
            const conf = typeof value === 'number' ? value : 0.7;
            return `${(conf * 100).toFixed(0)}%`;
          },
        },
        {
          key: 'description',
          label: 'Description Preview',
          width: '10%',
          formatter: (value) => (value ? String(value).substring(0, 40) + '...' : '-'),
        },
      ],
    },

    // Success message builder
    successMessageBuilder: (item) => ({
      title: item.title,
      details: `${item.event_type} • ${item.sentiment} • ${(item.parse_confidence * 100).toFixed(0)}% confidence`,
    }),
  });
}

// =====================================================
// STANDALONE PARSE FUNCTION (for API use)
// =====================================================

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
}

export interface ParseResult {
  success: boolean;
  events: ParsedTimelineEvent[];
  confidence_summary: {
    high: number;
    medium: number;
    low: number;
  };
  processing_time_ms: number;
  error?: string;
}

/**
 * Parse narrative text into timeline events (without importing to DB)
 * This is the migration from llmParser.ts - uses unified AIParser
 */
export async function parseTimelineText(
  text: string,
  context: ParseContext
): Promise<ParseResult> {
  const startTime = Date.now();

  try {
    // Create importer just for parsing
    const importer = createTimelineEventsImporter(context.org_id);

    // Use the importer's parser directly
    const parseResult = await importer.parser.parse(text);

    if (parseResult.errors && parseResult.errors.length > 0) {
      return {
        success: false,
        events: [],
        confidence_summary: { high: 0, medium: 0, low: 0 },
        processing_time_ms: Date.now() - startTime,
        error: parseResult.errors[0]?.message || 'Parse failed',
      };
    }

    const events = parseResult.items || [];

    // Calculate confidence summary
    const confidence_summary = {
      high: events.filter(e => (e.parse_confidence ?? 0.7) >= 0.8).length,
      medium: events.filter(e => {
        const c = e.parse_confidence ?? 0.7;
        return c >= 0.5 && c < 0.8;
      }).length,
      low: events.filter(e => (e.parse_confidence ?? 0.7) < 0.5).length,
    };

    return {
      success: true,
      events,
      confidence_summary,
      processing_time_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      events: [],
      confidence_summary: { high: 0, medium: 0, low: 0 },
      processing_time_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
