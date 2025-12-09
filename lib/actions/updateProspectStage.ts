/**
 * Update Prospect Stage Action
 * Updates the prospect pipeline stage for an organization
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type UpdateProspectStageOutput,
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
import {
  PROSPECT_STAGE_VALUES,
  type ProspectStageValue,
} from '@/lib/prospects/config';

// Re-export type for backwards compatibility
export type ProspectStage = ProspectStageValue;

// Stage aliases for natural language
const STAGE_ALIASES: Record<string, ProspectStage> = {
  'new': 'cold_lead',
  'cold': 'cold_lead',
  'initial': 'cold_lead',
  'reached_out': 'contacted',
  'emailed': 'contacted',
  'replied': 'responded',
  'answered': 'responded',
  'qualifying': 'screening',
  'qualified': 'screening',
  'icp_check': 'screening',
  'demo_booked': 'demo_scheduled',
  'meeting_scheduled': 'demo_scheduled',
  'demo_complete': 'demo_done',
  'demo_completed': 'demo_done',
  'not_a_fit': 'disqualified',
  'bad_fit': 'disqualified',
  'unqualified': 'disqualified',
};

function normalizeProspectStage(stage: string): ProspectStage | null {
  const normalized = stage.toLowerCase().replace(/\s+/g, '_').trim();

  if (PROSPECT_STAGE_VALUES.includes(normalized as ProspectStage)) {
    return normalized as ProspectStage;
  }

  return STAGE_ALIASES[normalized] || null;
}

// ============ INPUT SCHEMA ============

export const updateProspectStageSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** New prospect stage */
  prospectStage: z.string().min(1, 'Prospect stage is required'),
});

export type UpdateProspectStageInput = z.infer<typeof updateProspectStageSchema>;

// ============ ACTION IMPLEMENTATION ============

export const updateProspectStage: Action<UpdateProspectStageInput, UpdateProspectStageOutput> = {
  name: 'UPDATE_PROSPECT_STAGE',
  description: 'Update the prospect pipeline stage',
  schema: updateProspectStageSchema,

  async execute(input, context): Promise<ActionResult<UpdateProspectStageOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = updateProspectStageSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, prospectStage } = validation.data;

    // Normalize stage
    const normalizedStage = normalizeProspectStage(prospectStage);
    if (!normalizedStage) {
      return failedResult(
        fieldError('prospectStage', `Invalid prospect stage: ${prospectStage}`),
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

    const previousStage = (currentOrg as any).prospect_stage;

    // Update organization
    const updateData = {
      prospect_stage: normalizedStage,
      is_prospect: true, // Ensure it's marked as a prospect
    };

    const { error: updateError } = await updateById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId,
      updateData
    );

    if (updateError) {
      return failedResult(updateError, 'Failed to update prospect stage');
    }

    // Track the update for undo
    changes.push(
      trackUpdate(
        TABLES.ORGANIZATIONS,
        orgId,
        { prospect_stage: previousStage, is_prospect: (currentOrg as any).is_prospect },
        updateData
      )
    );

    // Determine sentiment
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (normalizedStage === 'demo_scheduled' || normalizedStage === 'demo_done') {
      sentiment = 'positive';
    } else if (normalizedStage === 'disqualified') {
      sentiment = 'negative';
    }

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'prospect_stage_changed',
      eventCategory: 'milestones',
      title: `Prospect stage: ${normalizedStage}`,
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
      commandText: `UPDATE_PROSPECT_STAGE: ${normalizedStage}`,
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
      summary: `Updated prospect stage to ${normalizedStage}${orgName ? ` for ${orgName}` : ''}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToUpdateProspectStageInput(
  fields: Record<string, any>,
  orgId: string
): UpdateProspectStageInput {
  return {
    orgId,
    prospectStage: fields.prospect_stage || '',
  };
}

export default updateProspectStage;
