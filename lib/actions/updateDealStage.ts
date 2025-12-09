/**
 * Update Deal Stage Action
 * Updates the deal pipeline stage for a post-trial organization
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type UpdateDealStageOutput,
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

// ============ CONSTANTS ============

export const DEAL_PIPELINE_STAGES = [
  'evaluation',
  'trial_expired',
  'negotiation',
  'closed',
] as const;

export type DealPipelineStage = typeof DEAL_PIPELINE_STAGES[number];

// Stage aliases for natural language
const STAGE_ALIASES: Record<string, DealPipelineStage> = {
  'evaluating': 'evaluation',
  'in_trial': 'evaluation',
  'expired': 'trial_expired',
  'trial_ended': 'trial_expired',
  'negotiating': 'negotiation',
  'contract': 'negotiation',
  'pricing': 'negotiation',
  'done': 'closed',
  'finished': 'closed',
};

function normalizeDealStage(stage: string): DealPipelineStage | null {
  const normalized = stage.toLowerCase().replace(/\s+/g, '_').trim();

  if (DEAL_PIPELINE_STAGES.includes(normalized as DealPipelineStage)) {
    return normalized as DealPipelineStage;
  }

  return STAGE_ALIASES[normalized] || null;
}

// ============ INPUT SCHEMA ============

export const updateDealStageSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** New deal stage */
  dealStage: z.string().min(1, 'Deal stage is required'),
});

export type UpdateDealStageInput = z.infer<typeof updateDealStageSchema>;

// ============ ACTION IMPLEMENTATION ============

export const updateDealStage: Action<UpdateDealStageInput, UpdateDealStageOutput> = {
  name: 'UPDATE_DEAL_STAGE',
  description: 'Update the deal pipeline stage',
  schema: updateDealStageSchema,

  async execute(input, context): Promise<ActionResult<UpdateDealStageOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = updateDealStageSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, dealStage } = validation.data;

    // Normalize stage
    const normalizedStage = normalizeDealStage(dealStage);
    if (!normalizedStage) {
      return failedResult(
        fieldError('dealStage', `Invalid deal stage: ${dealStage}`),
        'Invalid stage'
      );
    }

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

    const previousStage = (currentOrg as any).deal_stage;

    // Update organization
    const updateData = {
      deal_stage: normalizedStage,
    };

    const { error: updateError } = await updateById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId,
      updateData
    );

    if (updateError) {
      return failedResult(updateError, 'Failed to update deal stage');
    }

    // Track the update for undo
    changes.push(
      trackUpdate(TABLES.ORGANIZATIONS, orgId, { deal_stage: previousStage }, updateData)
    );

    // Determine sentiment
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (normalizedStage === 'negotiation') {
      sentiment = 'positive';
    } else if (normalizedStage === 'trial_expired') {
      sentiment = 'negative';
    }

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'deal_stage_changed',
      eventCategory: 'milestones',
      title: `Deal stage: ${normalizedStage}`,
      description: `Moved from ${previousStage || 'unknown'} to ${normalizedStage}`,
      loggedBy: userId,
      sentiment,
      severity: 'medium',
      metadata: {
        previous_stage: previousStage,
        new_stage: normalizedStage,
      },
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `UPDATE_DEAL_STAGE: ${normalizedStage}`,
      changes,
    });

    return {
      success: true,
      data: {
        orgId,
        previousStage,
        newStage: normalizedStage,
      },
      changes,
      summary: `Updated deal stage to ${normalizedStage}${orgName ? ` for ${orgName}` : ''}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToUpdateDealStageInput(
  fields: Record<string, any>,
  orgId: string
): UpdateDealStageInput {
  return {
    orgId,
    dealStage: fields.deal_pipeline_stage || fields.deal_stage || '',
  };
}

export default updateDealStage;
