/**
 * Disqualify Prospect Action
 * Marks a prospect as disqualified (not a fit)
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type DisqualifyProspectOutput,
  type DatabaseChange,
  TABLES,
  fetchById,
  updateById,
  validationError,
  failedResult,
  fieldError,
  createTimelineEvent,
  storeUndoInfo,
  trackUpdate,
} from './_shared';

// ============ INPUT SCHEMA ============

export const disqualifyProspectSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Reason for disqualification */
  reason: z.string().optional(),
});

export type DisqualifyProspectInput = z.infer<typeof disqualifyProspectSchema>;

// ============ ACTION IMPLEMENTATION ============

export const disqualifyProspect: Action<DisqualifyProspectInput, DisqualifyProspectOutput> = {
  name: 'DISQUALIFY_PROSPECT',
  description: 'Mark a prospect as disqualified',
  schema: disqualifyProspectSchema,

  async execute(input, context): Promise<ActionResult<DisqualifyProspectOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = disqualifyProspectSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, reason } = validation.data;

    // Get current org state
    const { data: currentOrg, error: fetchError } = await fetchById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId
    );

    if (fetchError || !currentOrg) {
      return failedResult(
        fetchError || fieldError('orgId', 'Organization not found'),
        'Organization not found'
      );
    }

    const previousStage = (currentOrg as any).prospect_stage;
    const previousValues: Record<string, any> = {
      prospect_stage: previousStage,
    };

    // Update organization
    const updateData: Record<string, any> = {
      prospect_stage: 'disqualified',
    };

    if (reason) {
      updateData.disqualify_reason = reason;
      previousValues.disqualify_reason = (currentOrg as any).disqualify_reason;
    }

    const { error: updateError } = await updateById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId,
      updateData
    );

    if (updateError) {
      return failedResult(updateError, 'Failed to disqualify prospect');
    }

    // Track the update for undo
    changes.push(trackUpdate(TABLES.ORGANIZATIONS, orgId, previousValues, updateData));

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'prospect_disqualified',
      eventCategory: 'milestones',
      title: 'Prospect disqualified',
      description: reason || 'Prospect marked as not a fit',
      loggedBy: userId,
      sentiment: 'negative',
      severity: 'medium',
      metadata: {
        previous_stage: previousStage,
        reason,
      },
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `DISQUALIFY_PROSPECT: ${reason || 'no reason'}`,
      changes,
    });

    return {
      success: true,
      data: {
        orgId,
        reason,
      },
      changes,
      summary: `Disqualified prospect${orgName ? ` ${orgName}` : ''}${reason ? `: ${reason}` : ''}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToDisqualifyProspectInput(
  fields: Record<string, any>,
  orgId: string
): DisqualifyProspectInput {
  return {
    orgId,
    reason: fields.disqualify_reason || fields.reason || fields.details || undefined,
  };
}

export default disqualifyProspect;
