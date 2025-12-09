/**
 * Delete Feature Request Action
 * Deletes a feature request
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

export interface DeleteFeatureRequestOutput {
  featureRequestId: string;
  title: string;
}

// ============ INPUT SCHEMA ============

export const deleteFeatureRequestSchema = z.object({
  featureRequestId: z.string().min(1, 'Feature request is required'),
});

export type DeleteFeatureRequestInput = z.infer<typeof deleteFeatureRequestSchema>;

// ============ ACTION IMPLEMENTATION ============

export const deleteFeatureRequest: Action<DeleteFeatureRequestInput, DeleteFeatureRequestOutput> = {
  name: 'DELETE_FEATURE_REQUEST',
  description: 'Delete a feature request',
  schema: deleteFeatureRequestSchema,

  async execute(input, context): Promise<ActionResult<DeleteFeatureRequestOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    // Validate input
    const validation = deleteFeatureRequestSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { featureRequestId } = validation.data;

    // Fetch the feature request first
    const { data: request, error: fetchError } = await fetchById(
      supabase,
      TABLES.FEATURE_REQUESTS,
      featureRequestId
    );

    if (fetchError || !request) {
      return failedResult(
        fetchError || { code: 'NOT_FOUND', message: 'Feature request not found' },
        'Feature request not found'
      );
    }

    const requestData = request as any;
    const title = requestData.title || requestData.feature_name || 'Untitled';

    // Delete the feature request
    const { error: deleteError } = await deleteById(
      supabase,
      TABLES.FEATURE_REQUESTS,
      featureRequestId
    );

    if (deleteError) {
      return failedResult(deleteError, 'Failed to delete feature request');
    }

    // Track the deletion
    changes.push(trackDelete(TABLES.FEATURE_REQUESTS, featureRequestId, requestData));

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `DELETE_FEATURE_REQUEST: ${title}`,
      changes,
    });

    return {
      success: true,
      data: {
        featureRequestId,
        title,
      },
      changes,
      summary: `Deleted feature request "${title}"`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToDeleteFeatureRequestInput(
  fields: Record<string, any>,
  featureRequestId?: string
): DeleteFeatureRequestInput {
  return {
    featureRequestId: featureRequestId || fields.feature_request_id || fields.featureRequestId,
  };
}

export default deleteFeatureRequest;
