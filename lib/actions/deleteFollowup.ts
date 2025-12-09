/**
 * Delete Follow-up Action
 * Deletes a follow-up reminder
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type DatabaseChange,
  fetchById,
  deleteById,
  failedResult,
  validationError,
  storeUndoInfo,
  trackDelete,
} from './_shared';

// Follow-ups table name
const FOLLOWUPS_TABLE = 'followups';

// ============ OUTPUT TYPE ============

export interface DeleteFollowupOutput {
  followupId: string;
  title: string;
}

// ============ INPUT SCHEMA ============

export const deleteFollowupSchema = z.object({
  followupId: z.string().min(1, 'Follow-up is required'),
});

export type DeleteFollowupInput = z.infer<typeof deleteFollowupSchema>;

// ============ ACTION IMPLEMENTATION ============

export const deleteFollowup: Action<DeleteFollowupInput, DeleteFollowupOutput> = {
  name: 'DELETE_FOLLOWUP',
  description: 'Delete a follow-up reminder',
  schema: deleteFollowupSchema,

  async execute(input, context): Promise<ActionResult<DeleteFollowupOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    // Validate input
    const validation = deleteFollowupSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { followupId } = validation.data;

    // Fetch the follow-up first
    const { data: followup, error: fetchError } = await fetchById(
      supabase,
      FOLLOWUPS_TABLE,
      followupId
    );

    if (fetchError || !followup) {
      return failedResult(
        fetchError || { code: 'NOT_FOUND', message: 'Follow-up not found' },
        'Follow-up not found'
      );
    }

    const followupData = followup as any;
    const title = followupData.title || followupData.description || 'Untitled follow-up';

    // Delete the follow-up
    const { error: deleteError } = await deleteById(
      supabase,
      FOLLOWUPS_TABLE,
      followupId
    );

    if (deleteError) {
      return failedResult(deleteError, 'Failed to delete follow-up');
    }

    // Track the deletion
    changes.push(trackDelete(FOLLOWUPS_TABLE, followupId, followupData));

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `DELETE_FOLLOWUP: ${title}`,
      changes,
    });

    return {
      success: true,
      data: {
        followupId,
        title,
      },
      changes,
      summary: `Deleted follow-up "${title}"`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToDeleteFollowupInput(
  fields: Record<string, any>,
  followupId?: string
): DeleteFollowupInput {
  return {
    followupId: followupId || fields.followup_id || fields.followupId,
  };
}

export default deleteFollowup;
