/**
 * Log Activity Action
 * Logs user activity and creates timeline events
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type LogActivityOutput,
  type DatabaseChange,
  TABLES,
  fetchById,
  updateById,
  validationError,
  failedResult,
  createTimelineEvent,
  activityLoggedEvent,
  storeUndoInfo,
  trackUpdate,
  parseRelativeDate,
} from './_shared';

// ============ ACTIVITY TYPES ============

/**
 * Supported activity types
 */
export const ACTIVITY_TYPES = [
  'query',
  'login',
  'demo',
  'call',
  'email',
  'meeting',
  'feature_usage',
  'feedback',
  'support_request',
  'check_in',
  'follow_up',
  'training',
  'onboarding',
  'presentation',
  'poc',
  'negotiation',
] as const;

export type ActivityType = typeof ACTIVITY_TYPES[number];

/**
 * Map activity type to timeline event type
 */
function mapActivityToEventType(activityType?: string): string {
  const mapping: Record<string, string> = {
    query: 'query_executed',
    login: 'user_logged_in',
    demo: 'demo_conducted',
    call: 'call_completed',
    email: 'email_sent',
    meeting: 'meeting_held',
    feature_usage: 'feature_tested',
    feedback: 'feedback_received',
    support_request: 'support_ticket_created',
    check_in: 'check_in_completed',
    follow_up: 'follow_up_completed',
    training: 'training_conducted',
    onboarding: 'onboarding_session',
    presentation: 'presentation_given',
    poc: 'poc_activity',
    negotiation: 'negotiation_held',
  };
  return mapping[activityType || ''] || 'activity_logged';
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============ INPUT SCHEMA ============

/**
 * Input schema for logActivity action
 */
export const logActivitySchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** User ID (optional - for user-specific activity) */
  userId: z.string().optional(),

  /** Type of activity */
  activityType: z.string().optional(),

  /** Activity date (relative or ISO date) */
  date: z.string().optional(),

  /** Activity details/description */
  details: z.string().max(5000).optional(),

  /** Note text (alternative to details) */
  noteText: z.string().max(5000).optional(),
});

export type LogActivityInput = z.infer<typeof logActivitySchema>;

// ============ ACTION IMPLEMENTATION ============

export const logActivity: Action<LogActivityInput, LogActivityOutput> = {
  name: 'LOG_ACTIVITY',
  description: 'Log user activity and create timeline event',
  schema: logActivitySchema,

  async execute(input, context): Promise<ActionResult<LogActivityOutput>> {
    const { supabase, userId: loggedBy } = context;
    const changes: DatabaseChange[] = [];
    const summaryParts: string[] = [];

    // Validate input with Zod
    const validation = logActivitySchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, userId, activityType, date, details, noteText } = validation.data;

    // Parse activity date
    const activityDate = (date ? parseRelativeDate(date) : null) || new Date().toISOString();

    // 1. Update user's last activity if we have a user
    if (userId) {
      // Get current values for undo
      const { data: currentUser } = await fetchById(supabase, TABLES.USERS, userId);

      if (currentUser) {
        const updateData: Record<string, any> = {
          last_login_date: activityDate,
          last_login_at: activityDate,
        };

        // Increment query count if activity is query
        if (activityType === 'query') {
          updateData.queries_executed = ((currentUser as any).queries_executed || 0) + 1;
        }

        const { error: userError } = await updateById(supabase, TABLES.USERS, userId, updateData);

        if (!userError) {
          changes.push(trackUpdate(
            TABLES.USERS,
            userId,
            {
              last_login_date: (currentUser as any).last_login_date,
              last_login_at: (currentUser as any).last_login_at,
              queries_executed: (currentUser as any).queries_executed,
            },
            updateData
          ));
          summaryParts.push('Updated user activity');
        }
      }
    }

    // 2. Create timeline event
    const eventType = mapActivityToEventType(activityType);
    const title = activityType ? `${capitalize(activityType)} activity` : 'Activity logged';
    const description = details || noteText || `${activityType || 'Activity'} recorded`;

    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      userId,
      eventType,
      eventCategory: 'engagement',
      title,
      description,
      eventTimestamp: activityDate,
      loggedBy,
      sentiment: 'neutral',
      severity: 'low',
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
      summaryParts.push('Created timeline event');
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId: loggedBy,
      commandText: `LOG_ACTIVITY: ${activityType || 'activity'}`,
      changes,
    });

    const eventId = timelineResult.data?.eventId || '';

    return {
      success: true,
      data: {
        eventId,
        activityType: activityType || 'activity',
      },
      changes,
      summary: summaryParts.join(', ') || 'Activity logged',
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

/**
 * Maps parsed command fields to logActivity input
 */
export function mapToLogActivityInput(
  fields: Record<string, any>,
  orgId: string,
  userId?: string
): LogActivityInput {
  return {
    orgId,
    userId: userId || fields.user_id || undefined,
    activityType: fields.activity_type || undefined,
    date: fields.date || undefined,
    details: fields.details || undefined,
    noteText: fields.note_text || undefined,
  };
}

export default logActivity;
