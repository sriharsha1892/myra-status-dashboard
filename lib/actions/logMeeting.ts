/**
 * Log Meeting Action
 * Logs a meeting with notes and summary to the meeting_notes table
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type DatabaseChange,
  TABLES,
  insertOne,
  validationError,
  failedResult,
  createTimelineEvent,
  storeUndoInfo,
  trackInsert,
} from './_shared';

// ============ MEETING TYPES ============

/**
 * Valid meeting types
 */
export const MEETING_TYPES = [
  'demo',
  'follow_up_call',
  'check_in',
  'technical_review',
  'executive_briefing',
  'other',
] as const;

export type MeetingType = typeof MEETING_TYPES[number];

// ============ OUTPUT TYPE ============

export interface LogMeetingOutput {
  meetingId: string;
  meetingType: string;
  orgId: string;
}

// ============ INPUT SCHEMA ============

/**
 * Input schema for logMeeting action
 */
export const logMeetingSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Meeting type */
  meetingType: z.enum(MEETING_TYPES).default('other'),

  /** Duration in minutes */
  durationMinutes: z.number().min(1).max(480).optional(),

  /** Meeting summary/notes */
  meetingSummary: z.string().max(5000).optional(),

  /** Meeting attendees */
  attendees: z.array(z.string()).optional(),

  /** Meeting date (ISO string) */
  meetingDate: z.string().optional(),
});

export type LogMeetingInput = z.infer<typeof logMeetingSchema>;

// ============ ACTION IMPLEMENTATION ============

export const logMeeting: Action<LogMeetingInput, LogMeetingOutput> = {
  name: 'LOG_MEETING',
  description: 'Log a meeting with notes and summary',
  schema: logMeetingSchema,

  async execute(input, context): Promise<ActionResult<LogMeetingOutput>> {
    const { supabase, userId: loggedBy, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = logMeetingSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, meetingType, durationMinutes, meetingSummary, attendees, meetingDate } = validation.data;

    // Prepare meeting data
    const meetingData: Record<string, any> = {
      org_id: orgId,
      meeting_type: meetingType,
      meeting_date: meetingDate || new Date().toISOString(),
      duration_minutes: durationMinutes || null,
      meeting_summary: meetingSummary || null,
      attendees: attendees || [],
      conducted_by: loggedBy,
      created_at: new Date().toISOString(),
    };

    // Insert meeting note
    const { data: meeting, error: meetingError } = await insertOne(
      supabase,
      TABLES.MEETING_NOTES,
      meetingData
    );

    if (meetingError || !meeting) {
      return failedResult(
        meetingError || { code: 'DATABASE_ERROR', message: 'Failed to log meeting' },
        'Failed to log meeting'
      );
    }

    const meetingId = (meeting as any).meeting_id;

    // Track the insert for undo
    changes.push(trackInsert(TABLES.MEETING_NOTES, meetingId, meetingData));

    // Create timeline event
    const summaryPreview = meetingSummary
      ? (meetingSummary.length > 100 ? meetingSummary.substring(0, 97) + '...' : meetingSummary)
      : meetingType.replace(/_/g, ' ');
    const durationText = durationMinutes ? ` (${durationMinutes}min)` : '';

    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'meeting_held',
      eventCategory: 'engagement',
      title: `${meetingType.replace(/_/g, ' ')} meeting${durationText}`,
      description: summaryPreview,
      sentiment: 'positive',
      severity: 'low',
      metadata: { meetingId, meetingType, durationMinutes },
      loggedBy,
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId: loggedBy,
      commandText: `LOG_MEETING: ${meetingType}${durationText}`,
      changes,
    });

    // Create summary
    const typeLabel = meetingType.replace(/_/g, ' ');
    const summary = orgName
      ? `${typeLabel} meeting logged for ${orgName}${durationText}`
      : `${typeLabel} meeting logged${durationText}`;

    return {
      success: true,
      data: {
        meetingId,
        meetingType,
        orgId,
      },
      changes,
      summary,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

/**
 * Maps parsed command fields to logMeeting input
 */
export function mapToLogMeetingInput(
  fields: Record<string, any>,
  orgId: string
): LogMeetingInput {
  return {
    orgId,
    meetingType: fields.meeting_type || 'other',
    durationMinutes: fields.meeting_duration || fields.duration_minutes || undefined,
    meetingSummary: fields.meeting_summary || fields.details || undefined,
    attendees: fields.meeting_attendees || fields.attendees || undefined,
    meetingDate: fields.date || fields.meeting_date || undefined,
  };
}

export default logMeeting;
