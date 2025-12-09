/**
 * Add Note Action
 * Adds a note to an organization's activity log
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type AddNoteOutput,
  type DatabaseChange,
  TABLES,
  insertOne,
  validationError,
  failedResult,
  createTimelineEvent,
  noteAddedEvent,
  storeUndoInfo,
  trackInsert,
} from './_shared';

// ============ NOTE CATEGORIES ============

/**
 * Valid note categories
 */
export const NOTE_CATEGORIES = [
  'general',
  'meeting',
  'call',
  'email',
  'feedback',
  'issue',
  'action_item',
  'other',
] as const;

export type NoteCategory = typeof NOTE_CATEGORIES[number];

// ============ INPUT SCHEMA ============

/**
 * Input schema for addNote action
 */
export const addNoteSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** User ID (optional - for user-specific notes) */
  userId: z.string().optional(),

  /** Note text (required) */
  noteText: z.string().min(1, 'Note text is required').max(10000),

  /** Note category */
  category: z.string().default('other'),

  /** Linked roadmap item ID (optional) */
  linkedRoadmapId: z.string().optional(),

  /** Mentions (array of user IDs or names) */
  mentions: z.array(z.string()).optional(),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;

// ============ ACTION IMPLEMENTATION ============

export const addNote: Action<AddNoteInput, AddNoteOutput> = {
  name: 'ADD_NOTE',
  description: 'Add a note to an organization',
  schema: addNoteSchema,

  async execute(input, context): Promise<ActionResult<AddNoteOutput>> {
    const { supabase, userId: loggedBy } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = addNoteSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, userId, noteText, category, linkedRoadmapId, mentions } = validation.data;

    // Prepare note data
    const noteData: Record<string, any> = {
      org_id: orgId,
      trial_user_id: userId || null,
      logged_by: loggedBy,
      note_category: category,
      note_text: noteText,
      created_at: new Date().toISOString(),
    };

    if (linkedRoadmapId) {
      noteData.linked_roadmap_id = linkedRoadmapId;
    }

    if (mentions && mentions.length > 0) {
      noteData.mentions = mentions;
    }

    // Insert note
    const { data: note, error: noteError } = await insertOne(
      supabase,
      TABLES.ACTIVITY_NOTES,
      noteData
    );

    if (noteError || !note) {
      return failedResult(
        noteError || { code: 'DATABASE_ERROR', message: 'Failed to create note' },
        'Failed to add note'
      );
    }

    const noteId = (note as any).note_id;

    // Track the insert for undo
    changes.push(trackInsert(TABLES.ACTIVITY_NOTES, noteId, noteData));

    // Create timeline event
    const notePreview = noteText.length > 200 ? noteText.substring(0, 197) + '...' : noteText;
    const timelineResult = await createTimelineEvent(
      supabase,
      noteAddedEvent(orgId, category, notePreview, loggedBy)
    );

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId: loggedBy,
      commandText: `ADD_NOTE: ${noteText.substring(0, 50)}`,
      changes,
    });

    // Create summary with truncated note text
    const summaryText = noteText.length > 50 ? noteText.substring(0, 50) + '...' : noteText;

    return {
      success: true,
      data: {
        noteId,
      },
      changes,
      summary: `Note added: "${summaryText}"`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

/**
 * Maps parsed command fields to addNote input
 */
export function mapToAddNoteInput(
  fields: Record<string, any>,
  orgId: string,
  userId?: string
): AddNoteInput {
  return {
    orgId,
    userId: userId || fields.user_id || undefined,
    noteText: fields.note_text || fields.details || 'Note added via command',
    category: fields.note_category || 'other',
    linkedRoadmapId: fields.linked_roadmap_id || undefined,
    mentions: fields.mentions || undefined,
  };
}

export default addNote;
