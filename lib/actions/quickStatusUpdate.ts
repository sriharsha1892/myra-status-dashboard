/**
 * Quick Status Update Action
 * One-liner status updates with sentiment tracking
 * Examples: "Acme looking good", "DataFlow has concerns", "TechCorp demo went well"
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type DatabaseChange,
  TABLES,
  insertOne,
  validationError,
  failedResult,
  createTimelineEvent,
  storeUndoInfo,
  trackInsert,
} from './_shared';

// ============ SENTIMENT TYPES ============

/**
 * Status sentiment options
 */
export const STATUS_SENTIMENTS = ['positive', 'neutral', 'negative'] as const;

export type StatusSentiment = typeof STATUS_SENTIMENTS[number];

/**
 * Keywords for sentiment detection
 */
const POSITIVE_KEYWORDS = [
  'good', 'great', 'excellent', 'positive', 'happy', 'excited',
  'well', 'progressing', 'interested', 'engaged', 'promising',
  'success', 'won', 'closed', 'signed', 'approved', 'love',
];

const NEGATIVE_KEYWORDS = [
  'concern', 'worried', 'issue', 'problem', 'stuck', 'blocked',
  'delayed', 'risk', 'cold', 'unresponsive', 'silent', 'lost',
  'churned', 'declined', 'rejected', 'frustrated', 'unhappy',
];

/**
 * Detect sentiment from text
 */
function detectSentiment(text: string): StatusSentiment {
  const lowerText = text.toLowerCase();

  const positiveCount = POSITIVE_KEYWORDS.filter(k => lowerText.includes(k)).length;
  const negativeCount = NEGATIVE_KEYWORDS.filter(k => lowerText.includes(k)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

// ============ OUTPUT TYPE ============

export interface QuickStatusUpdateOutput {
  noteId: string;
  eventId: string;
  sentiment: StatusSentiment;
}

// ============ INPUT SCHEMA ============

/**
 * Input schema for quickStatusUpdate action
 */
export const quickStatusUpdateSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Status message (required) */
  statusText: z.string().min(1, 'Status text is required').max(500),

  /** Sentiment (optional - auto-detected if not provided) */
  sentiment: z.enum(STATUS_SENTIMENTS).optional(),
});

export type QuickStatusUpdateInput = z.infer<typeof quickStatusUpdateSchema>;

// ============ ACTION IMPLEMENTATION ============

export const quickStatusUpdate: Action<QuickStatusUpdateInput, QuickStatusUpdateOutput> = {
  name: 'QUICK_STATUS_UPDATE',
  description: 'Quick status update with sentiment tracking',
  schema: quickStatusUpdateSchema,

  async execute(input, context): Promise<ActionResult<QuickStatusUpdateOutput>> {
    const { supabase, userId: loggedBy } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = quickStatusUpdateSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, statusText, sentiment: inputSentiment } = validation.data;

    // Auto-detect sentiment if not provided
    const sentiment = inputSentiment || detectSentiment(statusText);

    // 1. Create activity note
    const noteData: Record<string, any> = {
      org_id: orgId,
      logged_by: loggedBy,
      note_category: 'status_update',
      note_text: statusText,
      created_at: new Date().toISOString(),
    };

    const { data: note, error: noteError } = await insertOne(
      supabase,
      TABLES.ACTIVITY_NOTES,
      noteData
    );

    if (noteError || !note) {
      return failedResult(
        noteError || { code: 'DATABASE_ERROR', message: 'Failed to create status note' },
        'Failed to add status update'
      );
    }

    const noteId = (note as any).note_id;
    changes.push(trackInsert(TABLES.ACTIVITY_NOTES, noteId, noteData));

    // 2. Create timeline event with sentiment
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'status_update',
      eventCategory: 'activity',
      title: `Status update: ${sentiment}`,
      description: statusText,
      loggedBy,
      sentiment,
      severity: sentiment === 'negative' ? 'medium' : 'low',
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    const eventId = timelineResult.data?.eventId || '';

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId: loggedBy,
      commandText: `QUICK_STATUS_UPDATE: ${statusText.substring(0, 50)}`,
      changes,
    });

    // Create sentiment emoji for summary
    const sentimentEmoji = sentiment === 'positive' ? '(+)' : sentiment === 'negative' ? '(-)' : '(~)';
    const summaryText = statusText.length > 50 ? statusText.substring(0, 50) + '...' : statusText;

    return {
      success: true,
      data: {
        noteId,
        eventId,
        sentiment,
      },
      changes,
      summary: `${sentimentEmoji} Status: "${summaryText}"`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

/**
 * Maps parsed command fields to quickStatusUpdate input
 */
export function mapToQuickStatusUpdateInput(
  fields: Record<string, any>,
  orgId: string
): QuickStatusUpdateInput {
  return {
    orgId,
    statusText: fields.status_text || fields.details || fields.note_text || 'Status update',
    sentiment: fields.sentiment || undefined,
  };
}

export default quickStatusUpdate;
