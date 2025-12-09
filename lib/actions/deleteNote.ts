/**
 * Delete Note Action
 * Deletes an activity note
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

export interface DeleteNoteOutput {
  noteId: string;
  preview: string;
}

// ============ INPUT SCHEMA ============

export const deleteNoteSchema = z.object({
  noteId: z.string().min(1, 'Note is required'),
});

export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;

// ============ ACTION IMPLEMENTATION ============

export const deleteNote: Action<DeleteNoteInput, DeleteNoteOutput> = {
  name: 'DELETE_NOTE',
  description: 'Delete an activity note',
  schema: deleteNoteSchema,

  async execute(input, context): Promise<ActionResult<DeleteNoteOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    // Validate input
    const validation = deleteNoteSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { noteId } = validation.data;

    // Fetch the note first
    const { data: note, error: fetchError } = await fetchById(
      supabase,
      TABLES.ACTIVITY_NOTES,
      noteId
    );

    if (fetchError || !note) {
      return failedResult(
        fetchError || { code: 'NOT_FOUND', message: 'Note not found' },
        'Note not found'
      );
    }

    const noteData = note as any;
    const content = noteData.note_content || noteData.content || '';
    // Create a preview (first 50 chars)
    const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;

    // Delete the note
    const { error: deleteError } = await deleteById(
      supabase,
      TABLES.ACTIVITY_NOTES,
      noteId
    );

    if (deleteError) {
      return failedResult(deleteError, 'Failed to delete note');
    }

    // Track the deletion
    changes.push(trackDelete(TABLES.ACTIVITY_NOTES, noteId, noteData));

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `DELETE_NOTE: ${preview}`,
      changes,
    });

    return {
      success: true,
      data: {
        noteId,
        preview,
      },
      changes,
      summary: `Deleted note "${preview}"`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToDeleteNoteInput(
  fields: Record<string, any>,
  noteId?: string
): DeleteNoteInput {
  return {
    noteId: noteId || fields.note_id || fields.noteId,
  };
}

export default deleteNote;
