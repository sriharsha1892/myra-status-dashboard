/**
 * Log Outreach Action
 * Logs an outreach activity (email, call, LinkedIn, etc.) for a prospect
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type LogOutreachOutput,
  type DatabaseChange,
  TABLES,
  insertOne,
  validationError,
  failedResult,
  fieldError,
  createTimelineEvent,
  storeUndoInfo,
  trackInsert,
} from './_shared';

// ============ CONSTANTS ============

export const OUTREACH_TYPES = [
  'email_sent',
  'email_received',
  'call',
  'linkedin',
  'meeting',
  'note',
  'screening',
  'demo',
] as const;

export type OutreachType = typeof OUTREACH_TYPES[number];

export const OUTREACH_DIRECTIONS = ['outbound', 'inbound'] as const;
export type OutreachDirection = typeof OUTREACH_DIRECTIONS[number];

// ============ INPUT SCHEMA ============

export const logOutreachSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Prospect ID (optional - if specific contact) */
  prospectId: z.string().optional(),

  /** Type of outreach */
  outreachType: z.enum(OUTREACH_TYPES),

  /** Direction (inbound or outbound) */
  direction: z.enum(OUTREACH_DIRECTIONS).optional().default('outbound'),

  /** Subject line (for emails) */
  subject: z.string().optional(),

  /** Content/notes about the outreach */
  content: z.string().optional(),

  /** Activity date */
  activityDate: z.string().optional(),
});

export type LogOutreachInput = z.infer<typeof logOutreachSchema>;

// ============ ID GENERATION ============

function generateActivityId(): string {
  return `activity_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============ ACTION IMPLEMENTATION ============

export const logOutreach: Action<LogOutreachInput, LogOutreachOutput> = {
  name: 'LOG_OUTREACH',
  description: 'Log an outreach activity for a prospect',
  schema: logOutreachSchema,

  async execute(input, context): Promise<ActionResult<LogOutreachOutput>> {
    const { supabase, userId, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = logOutreachSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, prospectId, outreachType, direction, subject, content, activityDate } =
      validation.data;

    // Generate activity ID
    const activityId = generateActivityId();

    // Prepare activity data
    const activityData: Record<string, any> = {
      id: activityId,
      org_id: orgId,
      activity_type: outreachType,
      direction: direction || 'outbound',
      logged_by: userId,
      activity_date: activityDate || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // Add optional fields
    if (prospectId) activityData.prospect_id = prospectId;
    if (subject) activityData.subject = subject;
    if (content) activityData.content = content;

    // Try to insert into prospect_activities table
    const { error: activityError } = await insertOne(supabase, 'prospect_activities', activityData);

    if (activityError) {
      // If table doesn't exist, fall back to timeline_events
      if (activityError.message?.includes('does not exist')) {
        // Create as timeline event instead
        const timelineResult = await createTimelineEvent(supabase, {
          orgId,
          eventType: 'outreach_logged',
          eventCategory: 'engagement',
          title: `Outreach: ${outreachType}`,
          description: content || subject || `${direction} ${outreachType}`,
          loggedBy: userId,
          sentiment: 'neutral',
          severity: 'low',
          metadata: {
            outreach_type: outreachType,
            direction,
            subject,
          },
        });

        if (timelineResult.error) {
          return failedResult(timelineResult.error, 'Failed to log outreach');
        }

        if (timelineResult.change) {
          changes.push(timelineResult.change);
        }

        // Store undo information
        const undoResult = await storeUndoInfo({
          supabase,
          userId,
          commandText: `LOG_OUTREACH: ${outreachType}`,
          changes,
        });

        return {
          success: true,
          data: {
            activityId: timelineResult.data?.eventId || activityId,
            outreachType,
            orgId,
          },
          changes,
          summary: `Logged ${outreachType}${orgName ? ` for ${orgName}` : ''}`,
          undoId: undoResult.undoId || undefined,
          undoExpiresAt: undoResult.expiresAt || undefined,
        };
      }
      return failedResult(activityError, 'Failed to log outreach');
    }

    // Track the insert for undo
    changes.push(trackInsert('prospect_activities', activityId, activityData));

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'outreach_logged',
      eventCategory: 'engagement',
      title: `Outreach: ${outreachType}`,
      description: content || subject || `${direction} ${outreachType}`,
      loggedBy: userId,
      sentiment: 'neutral',
      severity: 'low',
      metadata: {
        activity_id: activityId,
        outreach_type: outreachType,
        direction,
      },
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `LOG_OUTREACH: ${outreachType}`,
      changes,
    });

    return {
      success: true,
      data: {
        activityId,
        outreachType,
        orgId,
      },
      changes,
      summary: `Logged ${outreachType}${orgName ? ` for ${orgName}` : ''}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToLogOutreachInput(
  fields: Record<string, any>,
  orgId: string
): LogOutreachInput {
  return {
    orgId,
    prospectId: fields.prospect_id || undefined,
    outreachType: fields.outreach_type || 'email_sent',
    direction: fields.outreach_direction || 'outbound',
    subject: fields.outreach_subject || undefined,
    content: fields.outreach_content || fields.details || undefined,
    activityDate: fields.date || undefined,
  };
}

export default logOutreach;
