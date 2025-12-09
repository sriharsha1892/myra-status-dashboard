/**
 * Log Screening Action
 * Logs a screening/qualification check for a prospect
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type LogScreeningOutput,
  type DatabaseChange,
  TABLES,
  insertOne,
  updateById,
  fetchById,
  validationError,
  failedResult,
  createTimelineEvent,
  storeUndoInfo,
  trackInsert,
  trackUpdate,
} from './_shared';

// ============ INPUT SCHEMA ============

export const logScreeningSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** ICP fit score (0-100) */
  icpFitScore: z.number().int().min(0).max(100).optional(),

  /** Notes about the screening */
  notes: z.string().optional(),

  /** Screening date */
  screeningDate: z.string().optional(),
});

export type LogScreeningInput = z.infer<typeof logScreeningSchema>;

// ============ ID GENERATION ============

function generateActivityId(): string {
  return `activity_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============ ACTION IMPLEMENTATION ============

export const logScreening: Action<LogScreeningInput, LogScreeningOutput> = {
  name: 'LOG_SCREENING',
  description: 'Log a screening/qualification check for a prospect',
  schema: logScreeningSchema,

  async execute(input, context): Promise<ActionResult<LogScreeningOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = logScreeningSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, icpFitScore, notes, screeningDate } = validation.data;

    // Generate activity ID
    const activityId = generateActivityId();

    // Prepare activity data
    const activityData: Record<string, any> = {
      id: activityId,
      org_id: orgId,
      activity_type: 'screening',
      direction: 'outbound',
      logged_by: userId,
      activity_date: screeningDate || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (notes) activityData.content = notes;

    // Try to insert into prospect_activities table
    const { error: activityError } = await insertOne(supabase, 'prospect_activities', activityData);

    // Determine sentiment based on ICP score
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (icpFitScore !== undefined) {
      if (icpFitScore >= 70) sentiment = 'positive';
      else if (icpFitScore < 40) sentiment = 'negative';
    }

    const summaryParts: string[] = ['Screening completed'];
    if (icpFitScore !== undefined) {
      summaryParts.push(`ICP score: ${icpFitScore}`);
    }

    if (activityError && activityError.message?.includes('does not exist')) {
      // Fall back to timeline event if table doesn't exist
      const timelineResult = await createTimelineEvent(supabase, {
        orgId,
        eventType: 'screening_logged',
        eventCategory: 'engagement',
        title: `Screening: ${icpFitScore !== undefined ? `ICP ${icpFitScore}` : 'completed'}`,
        description: notes || summaryParts.join(', '),
        loggedBy: userId,
        sentiment,
        severity: 'medium',
        metadata: {
          icp_fit_score: icpFitScore,
        },
      });

      if (timelineResult.error) {
        return failedResult(timelineResult.error, 'Failed to log screening');
      }

      if (timelineResult.change) {
        changes.push(timelineResult.change);
      }
    } else if (activityError) {
      return failedResult(activityError, 'Failed to log screening');
    } else {
      // Track the insert for undo
      changes.push(trackInsert('prospect_activities', activityId, activityData));

      // Create timeline event
      const timelineResult = await createTimelineEvent(supabase, {
        orgId,
        eventType: 'screening_logged',
        eventCategory: 'engagement',
        title: `Screening: ${icpFitScore !== undefined ? `ICP ${icpFitScore}` : 'completed'}`,
        description: notes || summaryParts.join(', '),
        loggedBy: userId,
        sentiment,
        severity: 'medium',
        metadata: {
          activity_id: activityId,
          icp_fit_score: icpFitScore,
        },
      });

      if (timelineResult.change) {
        changes.push(timelineResult.change);
      }
    }

    // Update org with ICP score and move to screening stage
    const { data: currentOrg } = await fetchById(supabase, TABLES.ORGANIZATIONS, orgId);
    const updateData: Record<string, any> = {};
    const previousValues: Record<string, any> = {};

    if (icpFitScore !== undefined) {
      updateData.icp_fit_score = icpFitScore;
      previousValues.icp_fit_score = (currentOrg as any)?.icp_fit_score;
    }

    // Move to screening stage if currently in earlier stage
    const currentStage = (currentOrg as any)?.prospect_stage;
    if (currentStage && ['cold_lead', 'contacted', 'responded'].includes(currentStage)) {
      updateData.prospect_stage = 'screening';
      previousValues.prospect_stage = currentStage;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await updateById(
        supabase,
        TABLES.ORGANIZATIONS,
        orgId,
        updateData
      );

      if (!updateError) {
        changes.push(trackUpdate(TABLES.ORGANIZATIONS, orgId, previousValues, updateData));
      }
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `LOG_SCREENING: ICP ${icpFitScore}`,
      changes,
    });

    return {
      success: true,
      data: {
        activityId,
        icpFitScore,
        orgId,
      },
      changes,
      summary: `${summaryParts.join(', ')}${orgName ? ` for ${orgName}` : ''}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToLogScreeningInput(
  fields: Record<string, any>,
  orgId: string
): LogScreeningInput {
  return {
    orgId,
    icpFitScore: fields.icp_fit_score ? Number(fields.icp_fit_score) : undefined,
    notes: fields.notes || fields.details || undefined,
    screeningDate: fields.date || undefined,
  };
}

export default logScreening;
