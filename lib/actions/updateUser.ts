/**
 * Update User Action
 * Updates user details
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type DatabaseChange,
  TABLES,
  fetchById,
  updateById,
  validationError,
  failedResult,
  fieldError,
  notFoundError,
  storeUndoInfo,
  trackUpdate,
} from './_shared';

// ============ OUTPUT TYPE ============

interface UpdateUserOutput {
  userId: string;
  fieldsUpdated: string[];
}

// ============ INPUT SCHEMA ============

export const updateUserSchema = z.object({
  /** User ID (required) */
  userId: z.string().min(1, 'User is required'),

  /** User's designation/role */
  designation: z.string().max(255).optional(),

  /** User's phone number */
  phone: z.string().max(50).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ============ ACTION IMPLEMENTATION ============

export const updateUser: Action<UpdateUserInput, UpdateUserOutput> = {
  name: 'UPDATE_USER',
  description: 'Update user details',
  schema: updateUserSchema,

  async execute(input, context): Promise<ActionResult<UpdateUserOutput>> {
    const { supabase, userId: loggedBy } = context;
    const changes: DatabaseChange[] = [];
    const summaryParts: string[] = [];

    const validation = updateUserSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { userId, designation, phone } = validation.data;

    // Get current user state
    const { data: currentUser, error: fetchError } = await fetchById(supabase, TABLES.USERS, userId);

    if (fetchError || !currentUser) {
      return failedResult(notFoundError('User', userId), 'User not found');
    }

    const updateData: Record<string, any> = {};

    if (designation) {
      updateData.designation = designation;
      summaryParts.push(`role: ${designation}`);
    }
    if (phone) {
      updateData.phone = phone;
      summaryParts.push(`phone: ${phone}`);
    }

    if (Object.keys(updateData).length === 0) {
      return failedResult(fieldError('designation', 'At least one field is required'), 'No fields to update');
    }

    const { error: updateError } = await updateById(supabase, TABLES.USERS, userId, updateData);

    if (updateError) {
      return failedResult(updateError, 'Failed to update user');
    }

    changes.push(trackUpdate(TABLES.USERS, userId, currentUser as Record<string, any>, updateData));

    const undoResult = await storeUndoInfo({
      supabase,
      userId: loggedBy,
      commandText: `UPDATE_USER: ${summaryParts.join(', ')}`,
      changes,
    });

    return {
      success: true,
      data: { userId, fieldsUpdated: summaryParts },
      changes,
      summary: `Updated user: ${summaryParts.join(', ')}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

export function mapToUpdateUserInput(fields: Record<string, any>, userId: string): UpdateUserInput {
  return {
    userId,
    designation: fields.designation || fields.role || undefined,
    phone: fields.phone || undefined,
  };
}

export default updateUser;
