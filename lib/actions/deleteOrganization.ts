/**
 * Delete Organization Action
 * Deletes a trial organization and cascades to related records
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type DatabaseChange,
  TABLES,
  fetchById,
  deleteById,
  fetchMany,
  failedResult,
  validationError,
  storeUndoInfo,
  trackDelete,
} from './_shared';

// ============ OUTPUT TYPE ============

export interface DeleteOrgOutput {
  orgId: string;
  orgName: string;
  deletedRelated: {
    users: number;
    notes: number;
    timelineEvents: number;
  };
}

// ============ INPUT SCHEMA ============

export const deleteOrganizationSchema = z.object({
  orgId: z.string().min(1, 'Organization is required'),
  confirmName: z.string().optional(), // Optional confirmation to match org name
});

export type DeleteOrganizationInput = z.infer<typeof deleteOrganizationSchema>;

// ============ ACTION IMPLEMENTATION ============

export const deleteOrganization: Action<DeleteOrganizationInput, DeleteOrgOutput> = {
  name: 'DELETE_ORG',
  description: 'Delete a trial organization and all related data',
  schema: deleteOrganizationSchema,

  async execute(input, context): Promise<ActionResult<DeleteOrgOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    // Validate input
    const validation = deleteOrganizationSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, confirmName } = validation.data;

    // Fetch the organization first
    const { data: org, error: fetchError } = await fetchById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId
    );

    if (fetchError || !org) {
      return failedResult(
        fetchError || { code: 'NOT_FOUND', message: 'Organization not found' },
        'Organization not found'
      );
    }

    const orgData = org as any;
    const orgName = orgData.company_name || orgData.name || 'Unknown';

    // Optional: Verify confirmation name matches
    if (confirmName && confirmName.toLowerCase() !== orgName.toLowerCase()) {
      return failedResult(
        {
          code: 'VALIDATION_ERROR',
          message: 'Confirmation name does not match organization name',
          field: 'confirmName',
          suggestion: `Enter "${orgName}" to confirm deletion`,
        },
        'Confirmation failed'
      );
    }

    // Track counts of related records
    const deletedRelated = { users: 0, notes: 0, timelineEvents: 0 };

    // Fetch and delete related users (trial_users) - batch delete
    const { data: users } = await fetchMany(
      supabase,
      TABLES.USERS,
      { trial_org_id: orgId }
    );
    if (users && users.length > 0) {
      // Track deletions for undo
      for (const user of users) {
        const userData = user as any;
        changes.push(trackDelete(TABLES.USERS, userData.user_id, userData));
      }
      // Batch delete all users at once
      const userIds = users.map((u: any) => u.user_id);
      await supabase.from(TABLES.USERS).delete().in('user_id', userIds);
      deletedRelated.users = users.length;
    }

    // Fetch and delete activity notes - batch delete
    const { data: notes } = await fetchMany(
      supabase,
      TABLES.ACTIVITY_NOTES,
      { trial_org_id: orgId }
    );
    if (notes && notes.length > 0) {
      // Track deletions for undo
      for (const note of notes) {
        const noteData = note as any;
        changes.push(trackDelete(TABLES.ACTIVITY_NOTES, noteData.note_id, noteData));
      }
      // Batch delete all notes at once
      const noteIds = notes.map((n: any) => n.note_id);
      await supabase.from(TABLES.ACTIVITY_NOTES).delete().in('note_id', noteIds);
      deletedRelated.notes = notes.length;
    }

    // Fetch and delete timeline events - batch delete
    const { data: events } = await fetchMany(
      supabase,
      TABLES.TIMELINE_EVENTS,
      { trial_org_id: orgId }
    );
    if (events && events.length > 0) {
      // Track deletions for undo
      for (const event of events) {
        const eventData = event as any;
        changes.push(trackDelete(TABLES.TIMELINE_EVENTS, eventData.event_id, eventData));
      }
      // Batch delete all events at once
      const eventIds = events.map((e: any) => e.event_id);
      await supabase.from(TABLES.TIMELINE_EVENTS).delete().in('event_id', eventIds);
      deletedRelated.timelineEvents = events.length;
    }

    // Delete the organization itself
    const { error: deleteError } = await deleteById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId
    );

    if (deleteError) {
      return failedResult(deleteError, 'Failed to delete organization');
    }

    // Track the org deletion
    changes.push(trackDelete(TABLES.ORGANIZATIONS, orgId, orgData));

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `DELETE_ORG: ${orgName}`,
      changes,
    });

    const relatedSummary = [];
    if (deletedRelated.users > 0) relatedSummary.push(`${deletedRelated.users} users`);
    if (deletedRelated.notes > 0) relatedSummary.push(`${deletedRelated.notes} notes`);
    if (deletedRelated.timelineEvents > 0) relatedSummary.push(`${deletedRelated.timelineEvents} events`);

    return {
      success: true,
      data: {
        orgId,
        orgName,
        deletedRelated,
      },
      changes,
      summary: `Deleted "${orgName}"${relatedSummary.length > 0 ? ` and ${relatedSummary.join(', ')}` : ''}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToDeleteOrganizationInput(
  fields: Record<string, any>,
  orgId: string
): DeleteOrganizationInput {
  return {
    orgId,
    confirmName: fields.confirm_name || fields.confirmName || undefined,
  };
}

export default deleteOrganization;
