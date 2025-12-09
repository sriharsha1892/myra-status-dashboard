/**
 * Update Stakeholder Action
 * Updates trial user's influence/role in the deal
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type UpdateStakeholderOutput,
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

// ============ INFLUENCE TYPES ============

export const INFLUENCE_TYPES = [
  'champion',        // Internal advocate pushing for your solution
  'blocker',         // Actively resistant or blocking the deal
  'decision_maker',  // Has final authority on purchasing
  'evaluator',       // Evaluating the solution technically
  'influencer',      // Has influence but not final say
  'unknown',         // Not yet determined
] as const;

export type InfluenceType = typeof INFLUENCE_TYPES[number];

/**
 * Display labels for influence types
 */
export const INFLUENCE_LABELS: Record<InfluenceType, string> = {
  champion: 'Champion',
  blocker: 'Blocker',
  decision_maker: 'Decision Maker',
  evaluator: 'Evaluator',
  influencer: 'Influencer',
  unknown: 'Unknown',
};

// ============ INPUT SCHEMA ============

export const updateStakeholderSchema = z.object({
  /** User ID to update (required) */
  userId: z.string().min(1, 'User is required'),

  /** Organization ID (for context) */
  orgId: z.string().optional(),

  /** New influence level */
  influence: z.enum(INFLUENCE_TYPES),

  /** Signal/reason for this classification */
  influenceSignal: z.string().max(500).optional(),
});

export type UpdateStakeholderInput = z.infer<typeof updateStakeholderSchema>;

// ============ ACTION IMPLEMENTATION ============

export const updateStakeholder: Action<UpdateStakeholderInput, UpdateStakeholderOutput> = {
  name: 'UPDATE_STAKEHOLDER',
  description: 'Update stakeholder influence classification',
  schema: updateStakeholderSchema,

  async execute(input, context): Promise<ActionResult<UpdateStakeholderOutput>> {
    const { supabase, userId: updatedBy } = context;
    const changes: DatabaseChange[] = [];
    const summaryParts: string[] = [];

    // Validate input
    const validation = updateStakeholderSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { userId, orgId, influence, influenceSignal } = validation.data;

    // Fetch current user data
    const { data: user, error: userError } = await fetchById(supabase, TABLES.USERS, userId);
    if (userError || !user) {
      return failedResult(notFoundError('User', userId), 'User not found');
    }

    const previousInfluence = (user as any).influence;
    const userName = (user as any).name || (user as any).email || 'User';

    // Update user's influence
    const updateData: Record<string, any> = {
      influence,
      influence_updated_at: new Date().toISOString(),
    };

    if (influenceSignal) {
      updateData.influence_signal = influenceSignal;
    }

    const { error: updateError } = await updateById(supabase, TABLES.USERS, userId, updateData);

    if (updateError) {
      // Column might not exist yet (migration pending)
      return failedResult(
        { code: 'DATABASE_ERROR', message: 'Influence column not available. Please apply migration.', technical: updateError.message },
        'Database error'
      );
    }

    changes.push(trackUpdate(
      TABLES.USERS,
      userId,
      { influence: previousInfluence, influence_signal: (user as any).influence_signal },
      updateData
    ));

    const influenceLabel = INFLUENCE_LABELS[influence];
    summaryParts.push(`Marked ${userName} as ${influenceLabel}`);

    // Create timeline event if we have org context
    const resolvedOrgId = orgId || (user as any).org_id;
    if (resolvedOrgId) {
      const timelineResult = await createTimelineEvent(supabase, {
        orgId: resolvedOrgId,
        userId,
        eventType: 'stakeholder_updated',
        eventCategory: 'engagement',
        title: `Stakeholder role updated: ${userName}`,
        description: previousInfluence
          ? `Changed from ${INFLUENCE_LABELS[previousInfluence as InfluenceType] || previousInfluence} to ${influenceLabel}${influenceSignal ? `. Signal: ${influenceSignal}` : ''}`
          : `Identified as ${influenceLabel}${influenceSignal ? `. Signal: ${influenceSignal}` : ''}`,
        eventTimestamp: new Date().toISOString(),
        loggedBy: updatedBy,
        sentiment: influence === 'champion' ? 'positive' : influence === 'blocker' ? 'negative' : 'neutral',
        severity: influence === 'blocker' ? 'high' : influence === 'champion' || influence === 'decision_maker' ? 'medium' : 'low',
      });

      if (timelineResult.change) {
        changes.push(timelineResult.change);
        summaryParts.push('Created timeline event');
      }
    }

    // Store undo info
    const undoResult = await storeUndoInfo({
      supabase,
      userId: updatedBy,
      commandText: `UPDATE_STAKEHOLDER: ${userName} → ${influenceLabel}`,
      changes,
    });

    return {
      success: true,
      data: {
        userId,
        influence,
        previousInfluence,
      },
      changes,
      summary: summaryParts.join(', ') || `Updated ${userName} to ${influenceLabel}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToUpdateStakeholderInput(
  fields: Record<string, any>,
  userId: string,
  orgId?: string
): UpdateStakeholderInput {
  return {
    userId,
    orgId,
    influence: fields.influence || fields.role || 'unknown',
    influenceSignal: fields.influence_signal || fields.signal || fields.reason || undefined,
  };
}

export default updateStakeholder;
