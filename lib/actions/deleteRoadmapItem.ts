/**
 * Delete Roadmap Item Action
 * Deletes a roadmap item
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

export interface DeleteRoadmapItemOutput {
  roadmapItemId: string;
  title: string;
}

// ============ INPUT SCHEMA ============

export const deleteRoadmapItemSchema = z.object({
  roadmapItemId: z.string().min(1, 'Roadmap item is required'),
});

export type DeleteRoadmapItemInput = z.infer<typeof deleteRoadmapItemSchema>;

// ============ ACTION IMPLEMENTATION ============

export const deleteRoadmapItem: Action<DeleteRoadmapItemInput, DeleteRoadmapItemOutput> = {
  name: 'DELETE_ROADMAP_ITEM',
  description: 'Delete a roadmap item',
  schema: deleteRoadmapItemSchema,

  async execute(input, context): Promise<ActionResult<DeleteRoadmapItemOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    // Validate input
    const validation = deleteRoadmapItemSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { roadmapItemId } = validation.data;

    // Fetch the roadmap item first
    const { data: item, error: fetchError } = await fetchById(
      supabase,
      TABLES.PRODUCT_ROADMAP,
      roadmapItemId
    );

    if (fetchError || !item) {
      return failedResult(
        fetchError || { code: 'NOT_FOUND', message: 'Roadmap item not found' },
        'Roadmap item not found'
      );
    }

    const itemData = item as any;
    const title = itemData.title || itemData.feature_name || 'Untitled';

    // Delete the roadmap item
    const { error: deleteError } = await deleteById(
      supabase,
      TABLES.PRODUCT_ROADMAP,
      roadmapItemId
    );

    if (deleteError) {
      return failedResult(deleteError, 'Failed to delete roadmap item');
    }

    // Track the deletion
    changes.push(trackDelete(TABLES.PRODUCT_ROADMAP, roadmapItemId, itemData));

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `DELETE_ROADMAP_ITEM: ${title}`,
      changes,
    });

    return {
      success: true,
      data: {
        roadmapItemId,
        title,
      },
      changes,
      summary: `Deleted roadmap item "${title}"`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToDeleteRoadmapItemInput(
  fields: Record<string, any>,
  roadmapItemId?: string
): DeleteRoadmapItemInput {
  return {
    roadmapItemId: roadmapItemId || fields.roadmap_item_id || fields.roadmapItemId,
  };
}

export default deleteRoadmapItem;
