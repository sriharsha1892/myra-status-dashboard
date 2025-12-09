/**
 * Close Deal Lost Action
 * Marks a deal as lost
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type CloseDealLostOutput,
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

export const closeDealLostSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Reason for losing the deal */
  reason: z.string().optional(),
});

export type CloseDealLostInput = z.infer<typeof closeDealLostSchema>;

// ============ ACTION IMPLEMENTATION ============

export const closeDealLost: Action<CloseDealLostInput, CloseDealLostOutput> = {
  name: 'CLOSE_DEAL_LOST',
  description: 'Mark a deal as lost',
  schema: closeDealLostSchema,

  async execute(input, context): Promise<ActionResult<CloseDealLostOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = closeDealLostSchema.safeParse(input);
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

    const org = currentOrg as any;
    const previousValues: Record<string, any> = {
      deal_stage: org.deal_stage,
      deal_outcome: org.deal_outcome,
      deal_outcome_reason: org.deal_outcome_reason,
      org_lifecycle_stage: org.org_lifecycle_stage,
      trial_status: org.trial_status,
    };

    // Update organization
    const updateData: Record<string, any> = {
      deal_stage: 'closed',
      deal_outcome: 'lost',
      org_lifecycle_stage: 'lost',
      trial_status: 'closed',
    };

    if (reason) {
      updateData.deal_outcome_reason = reason;
    }

    const { error: updateError } = await updateById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId,
      updateData
    );

    if (updateError) {
      return failedResult(updateError, 'Failed to close deal as lost');
    }

    // Track the update for undo
    changes.push(trackUpdate(TABLES.ORGANIZATIONS, orgId, previousValues, updateData));

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'deal_closed_lost',
      eventCategory: 'milestones',
      title: 'Deal closed - Lost',
      description: reason || 'Deal closed as lost',
      loggedBy: userId,
      sentiment: 'negative',
      severity: 'high',
      metadata: {
        reason,
        previous_stage: previousValues.deal_stage,
      },
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `CLOSE_DEAL_LOST: ${reason || 'no reason'}`,
      changes,
    });

    const summary = reason
      ? `${orgName || 'Deal'} lost: ${reason}`
      : `${orgName || 'Deal'} closed as lost`;

    return {
      success: true,
      data: {
        orgId,
        reason,
      },
      changes,
      summary,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToCloseDealLostInput(
  fields: Record<string, any>,
  orgId: string
): CloseDealLostInput {
  return {
    orgId,
    reason: fields.deal_outcome_reason || fields.reason || fields.details || undefined,
  };
}

export default closeDealLost;
