/**
 * Create Timeline Event Action
 * Creates a custom timeline event
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type CreateTimelineEventOutput,
  type DatabaseChange,
  TABLES,
  insertOne,
  validationError,
  failedResult,
  storeUndoInfo,
  trackInsert,
  parseRelativeDate,
} from './_shared';

// ============ INPUT SCHEMA ============

export const createTimelineEventSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Event type (required) */
  eventType: z.string().min(1, 'Event type is required'),

  /** Event title (required) */
  title: z.string().min(1, 'Event title is required').max(500),

  /** Event category */
  category: z.string().default('activity'),

  /** Event description */
  description: z.string().max(10000).optional(),

  /** Event date (relative or ISO) */
  date: z.string().optional(),

  /** Sentiment */
  sentiment: z.enum(['positive', 'neutral', 'negative']).default('neutral'),

  /** User ID (optional) */
  userId: z.string().optional(),
});

export type CreateTimelineEventInput = z.infer<typeof createTimelineEventSchema>;

// ============ ACTION IMPLEMENTATION ============

export const createTimelineEventAction: Action<CreateTimelineEventInput, CreateTimelineEventOutput> = {
  name: 'CREATE_TIMELINE_EVENT',
  description: 'Create a custom timeline event',
  schema: createTimelineEventSchema,

  async execute(input, context): Promise<ActionResult<CreateTimelineEventOutput>> {
    const { supabase, userId: loggedBy } = context;
    const changes: DatabaseChange[] = [];

    const validation = createTimelineEventSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, eventType, title, category, description, date, sentiment, userId } = validation.data;

    const eventTimestamp = (date ? parseRelativeDate(date) : null) || new Date().toISOString();

    const eventData: Record<string, any> = {
      org_id: orgId,
      event_type: eventType,
      event_category: category,
      title,
      description: description || '',
      event_timestamp: eventTimestamp,
      logged_by: loggedBy,
      sentiment,
    };

    if (userId || context.trialUserId) {
      eventData.user_id = userId || context.trialUserId;
    }

    const { data: event, error } = await insertOne(supabase, TABLES.TIMELINE_EVENTS, eventData);

    if (error || !event) {
      return failedResult(error || { code: 'DATABASE_ERROR', message: 'Failed to create timeline event' }, 'Failed to create timeline event');
    }

    const eventId = (event as any).id;
    changes.push(trackInsert(TABLES.TIMELINE_EVENTS, eventId, eventData));

    const undoResult = await storeUndoInfo({
      supabase,
      userId: loggedBy,
      commandText: `CREATE_TIMELINE_EVENT: ${title}`,
      changes,
    });

    return {
      success: true,
      data: { eventId, eventType },
      changes,
      summary: `Created event: "${title}"`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

export function mapToCreateTimelineEventInput(fields: Record<string, any>, orgId: string, userId?: string): CreateTimelineEventInput {
  return {
    orgId,
    eventType: fields.event_type || '',
    title: fields.event_title || '',
    category: fields.event_category || 'activity',
    description: fields.details || undefined,
    date: fields.date || undefined,
    sentiment: fields.event_sentiment || 'neutral',
    userId: userId || undefined,
  };
}

export { createTimelineEventAction as createTimelineEvent };
export default createTimelineEventAction;
