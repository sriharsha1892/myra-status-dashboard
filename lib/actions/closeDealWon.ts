/**
 * Close Deal Won Action
 * Marks a deal as won/closed
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type CloseDealWonOutput,
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

export const closeDealWonSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Final deal value */
  dealValue: z.number().nonnegative().optional(),
});

export type CloseDealWonInput = z.infer<typeof closeDealWonSchema>;

// ============ ACTION IMPLEMENTATION ============

export const closeDealWon: Action<CloseDealWonInput, CloseDealWonOutput> = {
  name: 'CLOSE_DEAL_WON',
  description: 'Mark a deal as won/closed',
  schema: closeDealWonSchema,

  async execute(input, context): Promise<ActionResult<CloseDealWonOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = closeDealWonSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, dealValue } = validation.data;

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
      deal_value: org.deal_value,
      org_lifecycle_stage: org.org_lifecycle_stage,
      trial_status: org.trial_status,
    };

    // Update organization
    const updateData: Record<string, any> = {
      deal_stage: 'closed',
      deal_outcome: 'won',
      org_lifecycle_stage: 'customer',
      trial_status: 'completed',
    };

    if (dealValue !== undefined) {
      updateData.deal_value = dealValue;
    }

    const { error: updateError } = await updateById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId,
      updateData
    );

    if (updateError) {
      return failedResult(updateError, 'Failed to close deal as won');
    }

    // Track the update for undo
    changes.push(trackUpdate(TABLES.ORGANIZATIONS, orgId, previousValues, updateData));

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'deal_closed_won',
      eventCategory: 'milestones',
      title: 'Deal closed - Won!',
      description: dealValue ? `Deal won at $${dealValue.toLocaleString()}` : 'Deal closed as won',
      loggedBy: userId,
      sentiment: 'positive',
      severity: 'high',
      metadata: {
        deal_value: dealValue,
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
      commandText: `CLOSE_DEAL_WON: ${dealValue || 'no value'}`,
      changes,
    });

    const summary = dealValue
      ? `${orgName || 'Deal'} won at $${dealValue.toLocaleString()}`
      : `${orgName || 'Deal'} closed as won`;

    return {
      success: true,
      data: {
        orgId,
        dealValue,
      },
      changes,
      summary,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToCloseDealWonInput(
  fields: Record<string, any>,
  orgId: string
): CloseDealWonInput {
  return {
    orgId,
    dealValue: fields.deal_value ? Number(fields.deal_value) : undefined,
  };
}

export default closeDealWon;
