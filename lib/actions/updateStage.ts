/**
 * Update Stage Action
 * Updates organization lifecycle stage and trial status
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type UpdateStageOutput,
  type DatabaseChange,
  TABLES,
  fetchById,
  updateById,
  validationError,
  failedResult,
  fieldError,
  createTimelineEvent,
  stageChangedEvent,
  storeUndoInfo,
  trackUpdate,
} from './_shared';

// ============ STAGE CONSTANTS ============

/**
 * Valid lifecycle stages (matches database constraint)
 * prospect → trial_pending → trial_active → trial_expired → customer | lost
 */
export const LIFECYCLE_STAGES = [
  'prospect',
  'trial_pending',
  'trial_active',
  'trial_expired',
  'customer',
  'lost',
] as const;

export type LifecycleStage = typeof LIFECYCLE_STAGES[number];

/**
 * Valid trial statuses (matches database constraint)
 */
export const TRIAL_STATUSES = [
  'requested',
  'approved',
  'in_progress',
  'active',
  'extended',
  'completed',
  'closed',
] as const;

export type TrialStatus = typeof TRIAL_STATUSES[number];

/**
 * Map common variations to valid lifecycle stages
 */
const STAGE_ALIASES: Record<string, LifecycleStage> = {
  // Trial expiration mappings (time-based, automatic)
  'ended': 'trial_expired',
  'trial_ended': 'trial_expired',
  'expired': 'trial_expired',
  // Sales lost mappings (they decided not to buy)
  'cancelled': 'lost',
  'churned': 'lost',
  // Customer/converted mappings
  'won': 'customer',
  'signed': 'customer',
  'converted': 'customer',
  // Active trial mappings
  'active': 'trial_active',
  'started': 'trial_active',
  // Prospect mappings
  'new': 'prospect',
  'lead': 'prospect',
  // Trial pending (demo scheduled) mappings
  'demo_scheduled': 'trial_pending',
  'scheduled': 'trial_pending',
};

/**
 * Normalize stage value to valid lifecycle stage
 */
function normalizeStage(stage: string): LifecycleStage | null {
  const normalized = stage.toLowerCase().trim();

  // Check if it's a valid stage directly
  if (LIFECYCLE_STAGES.includes(normalized as LifecycleStage)) {
    return normalized as LifecycleStage;
  }

  // Check aliases
  return STAGE_ALIASES[normalized] || null;
}

/**
 * Infer trial status from lifecycle stage
 */
function inferTrialStatus(stage: LifecycleStage): TrialStatus | null {
  switch (stage) {
    case 'customer':
      return 'completed';
    case 'lost':
    case 'trial_expired':
      return 'closed';
    default:
      return null;
  }
}

// ============ INPUT SCHEMA ============

/**
 * Input schema for updateStage action
 */
export const updateStageSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** New lifecycle stage */
  lifecycleStage: z.string().optional(),

  /** New trial status */
  trialStatus: z.string().optional(),
});

export type UpdateStageInput = z.infer<typeof updateStageSchema>;

// ============ ACTION IMPLEMENTATION ============

export const updateStage: Action<UpdateStageInput, UpdateStageOutput> = {
  name: 'UPDATE_STAGE',
  description: 'Update organization lifecycle stage and trial status',
  schema: updateStageSchema,

  async execute(input, context): Promise<ActionResult<UpdateStageOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];
    const summaryParts: string[] = [];

    // Validate input with Zod
    const validation = updateStageSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, lifecycleStage, trialStatus } = validation.data;

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

    const updateData: Record<string, any> = {};

    // Process lifecycle stage
    if (lifecycleStage) {
      const normalizedStage = normalizeStage(lifecycleStage);
      if (normalizedStage) {
        updateData.org_lifecycle_stage = normalizedStage;
        if (normalizedStage !== lifecycleStage.toLowerCase()) {
          summaryParts.push(`Lifecycle: ${normalizedStage} (from "${lifecycleStage}")`);
        } else {
          summaryParts.push(`Lifecycle: ${normalizedStage}`);
        }
      }
    }

    // Process trial status
    if (trialStatus && TRIAL_STATUSES.includes(trialStatus as TrialStatus)) {
      updateData.trial_status = trialStatus;
      summaryParts.push(`Trial status: ${trialStatus}`);
    }

    // Infer trial status from lifecycle stage if not provided
    if (updateData.org_lifecycle_stage && !updateData.trial_status) {
      const inferredStatus = inferTrialStatus(updateData.org_lifecycle_stage);
      if (inferredStatus) {
        updateData.trial_status = inferredStatus;
      }
    }

    // Check if we have anything to update
    if (Object.keys(updateData).length === 0) {
      return failedResult(
        fieldError('lifecycleStage', 'No valid stage information provided'),
        'No stage fields to update'
      );
    }

    // Update organization
    const { error: updateError } = await updateById(
      supabase,
      TABLES.ORGANIZATIONS,
      orgId,
      updateData
    );

    if (updateError) {
      return failedResult(updateError, 'Failed to update organization');
    }

    // Track the update for undo
    changes.push(trackUpdate(
      TABLES.ORGANIZATIONS,
      orgId,
      {
        org_lifecycle_stage: (currentOrg as any).org_lifecycle_stage,
        trial_status: (currentOrg as any).trial_status,
      },
      updateData
    ));

    // Determine sentiment for timeline event
    const newStage = updateData.org_lifecycle_stage;
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (newStage === 'customer') {
      sentiment = 'positive';
    } else if (newStage === 'lost' || newStage === 'trial_expired') {
      sentiment = 'negative';
    }

    // Create timeline event
    const previousStage = (currentOrg as any).org_lifecycle_stage;
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'org_stage_changed',
      eventCategory: 'milestones',
      title: `Stage updated to ${newStage || trialStatus}`,
      description: summaryParts.join(', '),
      loggedBy: userId,
      sentiment,
      severity: 'medium',
      metadata: {
        previous_stage: previousStage,
        new_stage: newStage,
        trial_status: updateData.trial_status,
      },
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `UPDATE_STAGE: ${newStage || trialStatus}`,
      changes,
    });

    return {
      success: true,
      data: {
        orgId,
        previousStage,
        newStage: newStage || previousStage,
      },
      changes,
      summary: `Updated stage: ${summaryParts.join(', ')}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

/**
 * Maps parsed command fields to updateStage input
 */
export function mapToUpdateStageInput(
  fields: Record<string, any>,
  orgId: string
): UpdateStageInput {
  return {
    orgId,
    lifecycleStage: fields.lifecycle_stage || fields.stage || undefined,
    trialStatus: fields.trial_status || undefined,
  };
}

export default updateStage;
