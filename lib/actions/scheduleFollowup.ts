/**
 * Schedule Follow-up Action
 * Creates follow-up reminders with natural language date parsing
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type ScheduleFollowupOutput,
  type DatabaseChange,
  TABLES,
  fetchById,
  insertOne,
  validationError,
  failedResult,
  notFoundError,
  createTimelineEvent,
  storeUndoInfo,
  trackInsert,
} from './_shared';
import { parseNaturalDate } from '@/lib/utils/dateTime';

// ============ FOLLOW-UP TYPES ============

export const FOLLOWUP_TYPES = [
  'call',
  'email',
  'meeting',
  'proposal',
  'demo',
  'general',
] as const;

export type FollowupType = typeof FOLLOWUP_TYPES[number];

// ============ INPUT SCHEMA ============

export const scheduleFollowupSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** User ID (optional - for user-specific follow-up) */
  userId: z.string().optional(),

  /** Follow-up title/task */
  title: z.string().min(1, 'Title is required').max(500),

  /** Additional description */
  description: z.string().max(2000).optional(),

  /** Type of follow-up */
  followupType: z.enum(FOLLOWUP_TYPES).default('general'),

  /** Due date - accepts natural language like "tomorrow", "next Tuesday" */
  dueDate: z.string().min(1, 'Due date is required'),

  /** Optional time */
  dueTime: z.string().optional(),

  /** Source command that created this */
  sourceCommand: z.string().optional(),
});

export type ScheduleFollowupInput = z.infer<typeof scheduleFollowupSchema>;

// ============ ACTION IMPLEMENTATION ============

export const scheduleFollowup: Action<ScheduleFollowupInput, ScheduleFollowupOutput> = {
  name: 'SCHEDULE_FOLLOWUP',
  description: 'Schedule a follow-up reminder',
  schema: scheduleFollowupSchema,

  async execute(input, context): Promise<ActionResult<ScheduleFollowupOutput>> {
    const { supabase, userId: createdBy } = context;
    const changes: DatabaseChange[] = [];
    const summaryParts: string[] = [];

    // Validate input
    const validation = scheduleFollowupSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, userId, title, description, followupType, dueDate, dueTime, sourceCommand } = validation.data;

    // Verify organization exists
    const { data: org, error: orgError } = await fetchById(supabase, TABLES.ORGANIZATIONS, orgId);
    if (orgError || !org) {
      return failedResult(notFoundError('Organization', orgId), 'Organization not found');
    }

    // Parse natural language date
    const parsedDate = parseNaturalDate(dueDate);
    if (!parsedDate) {
      return failedResult(
        { code: 'VALIDATION_ERROR', message: `Could not parse date: "${dueDate}"`, field: 'dueDate' },
        'Invalid date format'
      );
    }

    // Format date for database (YYYY-MM-DD)
    const dueDateFormatted = parsedDate.date.toISOString().split('T')[0];

    // Create follow-up record
    const followupData = {
      org_id: orgId,
      user_id: userId || null,
      created_by: createdBy,
      title,
      description: description || null,
      follow_up_type: followupType,
      due_date: dueDateFormatted,
      due_time: dueTime || null,
      status: 'pending',
      source_command: sourceCommand || null,
    };

    const { data: followup, error: insertError } = await insertOne(
      supabase,
      'follow_ups' as any,
      followupData
    );

    if (insertError) {
      // Table might not exist yet (migration pending)
      return failedResult(
        { code: 'DATABASE_ERROR', message: 'Follow-up table not available. Please apply migration.', technical: insertError.message },
        'Database error'
      );
    }

    const followupId = (followup as any).id;
    changes.push(trackInsert('follow_ups', followupId, followupData));
    summaryParts.push(`Scheduled follow-up for ${dueDateFormatted}`);

    // Create timeline event
    const orgName = (org as any).org_name || 'Organization';
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      userId,
      eventType: 'follow_up_scheduled',
      eventCategory: 'engagement',
      title: `Follow-up scheduled: ${title}`,
      description: `${followupType} follow-up scheduled for ${dueDateFormatted}${description ? `: ${description}` : ''}`,
      eventTimestamp: new Date().toISOString(),
      loggedBy: createdBy,
      sentiment: 'neutral',
      severity: 'low',
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
      summaryParts.push('Created timeline event');
    }

    // Store undo info
    const undoResult = await storeUndoInfo({
      supabase,
      userId: createdBy,
      commandText: `SCHEDULE_FOLLOWUP: ${title}`,
      changes,
    });

    return {
      success: true,
      data: {
        followupId,
        dueDate: dueDateFormatted,
        title,
        followupType,
      },
      changes,
      summary: summaryParts.join(', ') || `Follow-up "${title}" scheduled for ${dueDateFormatted}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToScheduleFollowupInput(
  fields: Record<string, any>,
  orgId: string,
  userId?: string
): ScheduleFollowupInput {
  return {
    orgId,
    userId: userId || fields.user_id || undefined,
    title: fields.title || fields.task || 'Follow-up',
    description: fields.description || fields.details || undefined,
    followupType: fields.followup_type || fields.type || 'general',
    dueDate: fields.due_date || fields.date || fields.when || 'tomorrow',
    dueTime: fields.due_time || fields.time || undefined,
    sourceCommand: fields.source_command || undefined,
  };
}

export default scheduleFollowup;
