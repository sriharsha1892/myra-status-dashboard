/**
 * Delete Timeline Event Action
 * Deletes a timeline event
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type DatabaseChange,
  TABLES,
  fetchById,
  deleteById,
  failedResult,
  validationError,
  storeUndoInfo,
  trackDelete,
} from './_shared';

// ============ OUTPUT TYPE ============

export interface DeleteTimelineEventOutput {
  eventId: string;
  title: string;
  eventType: string;
}

// ============ INPUT SCHEMA ============

export const deleteTimelineEventSchema = z.object({
  eventId: z.string().min(1, 'Event is required'),
});

export type DeleteTimelineEventInput = z.infer<typeof deleteTimelineEventSchema>;

// ============ ACTION IMPLEMENTATION ============

export const deleteTimelineEvent: Action<DeleteTimelineEventInput, DeleteTimelineEventOutput> = {
  name: 'DELETE_TIMELINE_EVENT',
  description: 'Delete a timeline event',
  schema: deleteTimelineEventSchema,

  async execute(input, context): Promise<ActionResult<DeleteTimelineEventOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    // Validate input
    const validation = deleteTimelineEventSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { eventId } = validation.data;

    // Fetch the event first
    const { data: event, error: fetchError } = await fetchById(
      supabase,
      TABLES.TIMELINE_EVENTS,
      eventId
    );

    if (fetchError || !event) {
      return failedResult(
        fetchError || { code: 'NOT_FOUND', message: 'Timeline event not found' },
        'Timeline event not found'
      );
    }

    const eventData = event as any;
    const title = eventData.title || eventData.event_title || 'Untitled';
    const eventType = eventData.event_type || 'unknown';

    // Delete the event
    const { error: deleteError } = await deleteById(
      supabase,
      TABLES.TIMELINE_EVENTS,
      eventId
    );

    if (deleteError) {
      return failedResult(deleteError, 'Failed to delete timeline event');
    }

    // Track the deletion
    changes.push(trackDelete(TABLES.TIMELINE_EVENTS, eventId, eventData));

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `DELETE_TIMELINE_EVENT: ${title}`,
      changes,
    });

    return {
      success: true,
      data: {
        eventId,
        title,
        eventType,
      },
      changes,
      summary: `Deleted timeline event "${title}"`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToDeleteTimelineEventInput(
  fields: Record<string, any>,
  eventId?: string
): DeleteTimelineEventInput {
  return {
    eventId: eventId || fields.event_id || fields.eventId,
  };
}

export default deleteTimelineEvent;
