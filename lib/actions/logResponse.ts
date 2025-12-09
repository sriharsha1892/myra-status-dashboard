/**
 * Log Response Action
 * Logs a prospect's response to outreach
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type LogResponseOutput,
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

// ============ CONSTANTS ============

export const RESPONSE_STATUSES = [
  'no_response',
  'positive',
  'negative',
  'neutral',
  'pending',
] as const;

export type ResponseStatus = typeof RESPONSE_STATUSES[number];

// ============ INPUT SCHEMA ============

export const logResponseSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Prospect ID (optional - if specific contact) */
  prospectId: z.string().optional(),

  /** Response status */
  responseStatus: z.enum(RESPONSE_STATUSES),

  /** Notes about the response */
  notes: z.string().optional(),

  /** Response date */
  responseDate: z.string().optional(),
});

export type LogResponseInput = z.infer<typeof logResponseSchema>;

// ============ ID GENERATION ============

function generateActivityId(): string {
  return `activity_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============ ACTION IMPLEMENTATION ============

export const logResponse: Action<LogResponseInput, LogResponseOutput> = {
  name: 'LOG_RESPONSE',
  description: 'Log a prospect response to outreach',
  schema: logResponseSchema,

  async execute(input, context): Promise<ActionResult<LogResponseOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = logResponseSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, prospectId, responseStatus, notes, responseDate } = validation.data;

    // Generate activity ID
    const activityId = generateActivityId();

    // Prepare activity data
    const activityData: Record<string, any> = {
      id: activityId,
      org_id: orgId,
      activity_type: 'email_received',
      direction: 'inbound',
      response_status: responseStatus,
      logged_by: userId,
      activity_date: responseDate || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // Add optional fields
    if (prospectId) activityData.prospect_id = prospectId;
    if (notes) activityData.content = notes;

    // Try to insert into prospect_activities table
    const { error: activityError } = await insertOne(supabase, 'prospect_activities', activityData);

    // Determine sentiment based on response
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (responseStatus === 'positive') sentiment = 'positive';
    else if (responseStatus === 'negative') sentiment = 'negative';

    if (activityError && activityError.message?.includes('does not exist')) {
      // Fall back to timeline event if table doesn't exist
      const timelineResult = await createTimelineEvent(supabase, {
        orgId,
        eventType: 'response_logged',
        eventCategory: 'engagement',
        title: `Response: ${responseStatus}`,
        description: notes || `Prospect responded: ${responseStatus}`,
        loggedBy: userId,
        sentiment,
        severity: responseStatus === 'positive' ? 'medium' : 'low',
        metadata: {
          response_status: responseStatus,
        },
      });

      if (timelineResult.error) {
        return failedResult(timelineResult.error, 'Failed to log response');
      }

      if (timelineResult.change) {
        changes.push(timelineResult.change);
      }
    } else if (activityError) {
      return failedResult(activityError, 'Failed to log response');
    } else {
      // Track the insert for undo
      changes.push(trackInsert('prospect_activities', activityId, activityData));

      // Create timeline event
      const timelineResult = await createTimelineEvent(supabase, {
        orgId,
        eventType: 'response_logged',
        eventCategory: 'engagement',
        title: `Response: ${responseStatus}`,
        description: notes || `Prospect responded: ${responseStatus}`,
        loggedBy: userId,
        sentiment,
        severity: responseStatus === 'positive' ? 'medium' : 'low',
        metadata: {
          activity_id: activityId,
          response_status: responseStatus,
        },
      });

      if (timelineResult.change) {
        changes.push(timelineResult.change);
      }
    }

    // If positive response, update prospect stage to 'responded'
    if (responseStatus === 'positive') {
      const { data: currentOrg } = await fetchById(supabase, TABLES.ORGANIZATIONS, orgId);
      if (currentOrg && (currentOrg as any).prospect_stage === 'contacted') {
        const updateData = { prospect_stage: 'responded' };
        const { error: updateError } = await updateById(
          supabase,
          TABLES.ORGANIZATIONS,
          orgId,
          updateData
        );

        if (!updateError) {
          changes.push(
            trackUpdate(TABLES.ORGANIZATIONS, orgId, { prospect_stage: 'contacted' }, updateData)
          );
        }
      }
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `LOG_RESPONSE: ${responseStatus}`,
      changes,
    });

    return {
      success: true,
      data: {
        activityId,
        responseStatus,
        orgId,
      },
      changes,
      summary: `Logged ${responseStatus} response${orgName ? ` from ${orgName}` : ''}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToLogResponseInput(
  fields: Record<string, any>,
  orgId: string
): LogResponseInput {
  return {
    orgId,
    prospectId: fields.prospect_id || undefined,
    responseStatus: fields.response_status || 'neutral',
    notes: fields.notes || fields.details || undefined,
    responseDate: fields.date || undefined,
  };
}

export default logResponse;
