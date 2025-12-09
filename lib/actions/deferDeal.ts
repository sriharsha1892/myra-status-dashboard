/**
 * Defer Deal Action
 * Defers a deal to a future date
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type DeferDealOutput,
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
  parseRelativeDate,
} from './_shared';

// ============ INPUT SCHEMA ============

export const deferDealSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Date to revisit */
  deferredUntil: z.string().optional(),

  /** Reason for deferring */
  reason: z.string().optional(),
});

export type DeferDealInput = z.infer<typeof deferDealSchema>;

// ============ ACTION IMPLEMENTATION ============

export const deferDeal: Action<DeferDealInput, DeferDealOutput> = {
  name: 'DEFER_DEAL',
  description: 'Defer a deal to a future date',
  schema: deferDealSchema,

  async execute(input, context): Promise<ActionResult<DeferDealOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = deferDealSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, deferredUntil, reason } = validation.data;

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
      deal_deferred_until: org.deal_deferred_until,
    };

    // Parse deferred date
    let deferDate: string | undefined;
    if (deferredUntil) {
      const parsed = parseRelativeDate(deferredUntil);
      deferDate = parsed || deferredUntil;
    }

    // Update organization
    const updateData: Record<string, any> = {
      deal_outcome: 'deferred',
    };

    if (deferDate) {
      updateData.deal_deferred_until = deferDate;
    }

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
      return failedResult(updateError, 'Failed to defer deal');
    }

    // Track the update for undo
    changes.push(trackUpdate(TABLES.ORGANIZATIONS, orgId, previousValues, updateData));

    // Format date for display
    let displayDate = deferDate ? new Date(deferDate).toLocaleDateString() : 'a future date';

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'deal_deferred',
      eventCategory: 'milestones',
      title: 'Deal deferred',
      description: `Deferred to ${displayDate}${reason ? `: ${reason}` : ''}`,
      loggedBy: userId,
      sentiment: 'neutral',
      severity: 'medium',
      metadata: {
        deferred_until: deferDate,
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
      commandText: `DEFER_DEAL: ${displayDate}`,
      changes,
    });

    const summary = `${orgName || 'Deal'} deferred to ${displayDate}${reason ? `: ${reason}` : ''}`;

    return {
      success: true,
      data: {
        orgId,
        deferredUntil: deferDate,
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

export function mapToDeferDealInput(
  fields: Record<string, any>,
  orgId: string
): DeferDealInput {
  return {
    orgId,
    deferredUntil: fields.deferred_until || fields.date || undefined,
    reason: fields.deal_outcome_reason || fields.reason || fields.details || undefined,
  };
}

export default deferDeal;
