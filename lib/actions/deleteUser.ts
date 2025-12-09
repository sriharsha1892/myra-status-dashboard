/**
 * Delete User Action
 * Deletes a trial user/contact
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

export interface DeleteUserOutput {
  userId: string;
  userName: string;
  email?: string;
}

// ============ INPUT SCHEMA ============

export const deleteUserSchema = z.object({
  userId: z.string().min(1, 'User is required'),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

// ============ ACTION IMPLEMENTATION ============

export const deleteUser: Action<DeleteUserInput, DeleteUserOutput> = {
  name: 'DELETE_USER',
  description: 'Delete a trial user/contact',
  schema: deleteUserSchema,

  async execute(input, context): Promise<ActionResult<DeleteUserOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    // Validate input
    const validation = deleteUserSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { userId: targetUserId } = validation.data;

    // Fetch the user first
    const { data: user, error: fetchError } = await fetchById(
      supabase,
      TABLES.USERS,
      targetUserId
    );

    if (fetchError || !user) {
      return failedResult(
        fetchError || { code: 'NOT_FOUND', message: 'User not found' },
        'User not found'
      );
    }

    const userData = user as any;
    const userName = userData.name || userData.full_name || 'Unknown';
    const email = userData.email;

    // Delete the user
    const { error: deleteError } = await deleteById(
      supabase,
      TABLES.USERS,
      targetUserId
    );

    if (deleteError) {
      return failedResult(deleteError, 'Failed to delete user');
    }

    // Track the deletion
    changes.push(trackDelete(TABLES.USERS, targetUserId, userData));

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `DELETE_USER: ${userName}`,
      changes,
    });

    return {
      success: true,
      data: {
        userId: targetUserId,
        userName,
        email,
      },
      changes,
      summary: `Deleted user "${userName}"${email ? ` (${email})` : ''}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToDeleteUserInput(
  fields: Record<string, any>,
  userId: string
): DeleteUserInput {
  return {
    userId,
  };
}

export default deleteUser;
