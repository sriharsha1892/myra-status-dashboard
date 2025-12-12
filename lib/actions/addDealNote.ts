/**
 * Add Deal Note Action
 * Adds a deal-specific note to org_activity_notes with deal context
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

// ============ OUTPUT TYPE ============

export interface AddDealNoteOutput {
  noteId: string;
  orgId: string;
}

// ============ INPUT SCHEMA ============

/**
 * Input schema for addDealNote action
 */
export const addDealNoteSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Deal note text (required) */
  dealNote: z.string().min(1, 'Deal note is required').max(5000),
});

export type AddDealNoteInput = z.infer<typeof addDealNoteSchema>;

// ============ ACTION IMPLEMENTATION ============

export const addDealNote: Action<AddDealNoteInput, AddDealNoteOutput> = {
  name: 'ADD_DEAL_NOTE',
  description: 'Add a deal-specific note for tracking deal progress',
  schema: addDealNoteSchema,

  async execute(input, context): Promise<ActionResult<AddDealNoteOutput>> {
    const { supabase, userId: loggedBy, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = addDealNoteSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, dealNote } = validation.data;

    // Prepare note data with deal context
    const noteData: Record<string, any> = {
      org_id: orgId,
      logged_by: loggedBy,
      note_category: 'deal', // Mark as deal note for filtering
      note_text: dealNote,
      created_at: new Date().toISOString(),
    };

    // Insert note
    const { data: note, error: noteError } = await insertOne(
      supabase,
      TABLES.ACTIVITY_NOTES,
      noteData
    );

    if (noteError || !note) {
      return failedResult(
        noteError || { code: 'DATABASE_ERROR', message: 'Failed to add deal note' },
        'Failed to add deal note'
      );
    }

    const noteId = (note as any).note_id;

    // Track the insert for undo
    changes.push(trackInsert(TABLES.ACTIVITY_NOTES, noteId, noteData));

    // Create timeline event
    const notePreview = dealNote.length > 150 ? dealNote.substring(0, 147) + '...' : dealNote;

    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'note_added',
      eventCategory: 'activity',
      title: 'Deal note added',
      description: notePreview,
      sentiment: 'neutral',
      severity: 'low',
      metadata: { noteId, noteType: 'deal' },
      loggedBy,
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId: loggedBy,
      commandText: `ADD_DEAL_NOTE: ${dealNote.substring(0, 50)}`,
      changes,
    });

    // Create summary
    const summaryText = dealNote.length > 50 ? dealNote.substring(0, 50) + '...' : dealNote;
    const summary = orgName
      ? `Deal note added for ${orgName}: "${summaryText}"`
      : `Deal note added: "${summaryText}"`;

    return {
      success: true,
      data: {
        noteId,
        orgId,
      },
      changes,
      summary,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

/**
 * Maps parsed command fields to addDealNote input
 */
export function mapToAddDealNoteInput(
  fields: Record<string, any>,
  orgId: string
): AddDealNoteInput {
  return {
    orgId,
    dealNote: fields.deal_note || fields.note_text || fields.details || 'Deal note added',
  };
}

export default addDealNote;
