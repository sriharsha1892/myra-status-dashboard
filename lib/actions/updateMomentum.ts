/**
 * Update Momentum Action
 * Updates deal momentum signals for an organization
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type UpdateMomentumOutput,
  type DatabaseChange,
  TABLES,
  fetchById,
  updateById,
  validationError,
  failedResult,
  notFoundError,
  createTimelineEvent,
  storeUndoInfo,
  trackUpdate,
} from './_shared';

// ============ MOMENTUM TYPES ============

export const MOMENTUM_TYPES = [
  'positive',   // Deal moving forward
  'neutral',    // Stable, neither growing nor shrinking
  'stalled',    // Deal has stalled
  'at_risk',    // Deal at risk of being lost
] as const;

export type MomentumType = typeof MOMENTUM_TYPES[number];

export const MOMENTUM_LABELS: Record<MomentumType, string> = {
  positive: 'Positive Momentum',
  neutral: 'Neutral',
  stalled: 'Stalled',
  at_risk: 'At Risk',
};

// ============ INPUT SCHEMA ============

export const updateMomentumSchema = z.object({
  /** Organization ID to update */
  orgId: z.string().min(1, 'Organization is required'),

  /** New momentum status */
  momentum: z.enum(MOMENTUM_TYPES),

  /** Signal/reason for this status */
  momentumSignal: z.string().max(500).optional(),
});

export type UpdateMomentumInput = z.infer<typeof updateMomentumSchema>;

// ============ ACTION IMPLEMENTATION ============

export const updateMomentum: Action<UpdateMomentumInput, UpdateMomentumOutput> = {
  name: 'UPDATE_MOMENTUM',
  description: 'Update deal momentum status',
  schema: updateMomentumSchema,

  async execute(input, context): Promise<ActionResult<UpdateMomentumOutput>> {
    const { supabase, userId: updatedBy } = context;
    const changes: DatabaseChange[] = [];
    const summaryParts: string[] = [];

    // Validate input
    const validation = updateMomentumSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, momentum, momentumSignal } = validation.data;

    // Fetch current org data
    const { data: org, error: orgError } = await fetchById(supabase, TABLES.ORGANIZATIONS, orgId);
    if (orgError || !org) {
      return failedResult(notFoundError('Organization', orgId), 'Organization not found');
    }

    const previousMomentum = (org as any).deal_momentum;
    const orgName = (org as any).org_name || 'Organization';

    // Update organization's momentum
    const updateData: Record<string, any> = {
      deal_momentum: momentum,
      momentum_updated_at: new Date().toISOString(),
    };

    if (momentumSignal) {
      updateData.last_momentum_signal = momentumSignal;
    }

    const { error: updateError } = await updateById(supabase, TABLES.ORGANIZATIONS, orgId, updateData);

    if (updateError) {
      // Column might not exist yet (migration pending)
      return failedResult(
        { code: 'DATABASE_ERROR', message: 'Momentum columns not available. Please apply migration.', technical: updateError.message },
        'Database error'
      );
    }

    changes.push(trackUpdate(
      TABLES.ORGANIZATIONS,
      orgId,
      { deal_momentum: previousMomentum, last_momentum_signal: (org as any).last_momentum_signal },
      updateData
    ));

    const momentumLabel = MOMENTUM_LABELS[momentum];
    summaryParts.push(`Set ${orgName} momentum to ${momentumLabel}`);

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'momentum_updated',
      eventCategory: 'milestones',
      title: `Deal momentum: ${momentumLabel}`,
      description: previousMomentum
        ? `Changed from ${MOMENTUM_LABELS[previousMomentum as MomentumType] || previousMomentum} to ${momentumLabel}${momentumSignal ? `. Signal: ${momentumSignal}` : ''}`
        : `Set to ${momentumLabel}${momentumSignal ? `. Signal: ${momentumSignal}` : ''}`,
      eventTimestamp: new Date().toISOString(),
      loggedBy: updatedBy,
      sentiment: momentum === 'positive' ? 'positive' : momentum === 'at_risk' ? 'negative' : 'neutral',
      severity: momentum === 'at_risk' ? 'high' : momentum === 'stalled' ? 'medium' : 'low',
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
      summaryParts.push('Created timeline event');
    }

    // Store undo info
    const undoResult = await storeUndoInfo({
      supabase,
      userId: updatedBy,
      commandText: `UPDATE_MOMENTUM: ${orgName} → ${momentumLabel}`,
      changes,
    });

    return {
      success: true,
      data: {
        orgId,
        momentum,
        previousMomentum,
      },
      changes,
      summary: summaryParts.join(', ') || `Updated ${orgName} to ${momentumLabel}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToUpdateMomentumInput(
  fields: Record<string, any>,
  orgId: string
): UpdateMomentumInput {
  return {
    orgId,
    momentum: fields.momentum || fields.deal_momentum || 'neutral',
    momentumSignal: fields.momentum_signal || fields.signal || fields.reason || undefined,
  };
}

export default updateMomentum;
