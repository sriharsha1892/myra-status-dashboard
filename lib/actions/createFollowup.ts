/**
 * Create Follow-up Action
 * Creates a follow-up task/reminder in the follow_ups table
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
  parseRelativeDate,
} from './_shared';

// ============ PRIORITY TYPES ============

/**
 * Valid follow-up priorities
 */
export const FOLLOWUP_PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent',
] as const;

export type FollowupPriority = typeof FOLLOWUP_PRIORITIES[number];

// ============ OUTPUT TYPE ============

export interface CreateFollowupOutput {
  followupId: string;
  title: string;
  dueDate: string | null;
  priority: string;
  orgId: string;
}

// ============ INPUT SCHEMA ============

/**
 * Input schema for createFollowup action
 */
export const createFollowupSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Follow-up title/description (required) */
  title: z.string().min(1, 'Follow-up title is required').max(500),

  /** Due date (ISO string or relative) */
  dueDate: z.string().optional(),

  /** Priority level */
  priority: z.enum(FOLLOWUP_PRIORITIES).default('medium'),
});

export type CreateFollowupInput = z.infer<typeof createFollowupSchema>;

// ============ ACTION IMPLEMENTATION ============

export const createFollowup: Action<CreateFollowupInput, CreateFollowupOutput> = {
  name: 'CREATE_FOLLOWUP',
  description: 'Create a follow-up task/reminder',
  schema: createFollowupSchema,

  async execute(input, context): Promise<ActionResult<CreateFollowupOutput>> {
    const { supabase, userId: loggedBy, orgName } = context;
    const changes: DatabaseChange[] = [];

    // Validate input with Zod
    const validation = createFollowupSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, title, dueDate, priority } = validation.data;

    // Parse relative date if provided
    const parsedDueDate = dueDate ? parseRelativeDate(dueDate) : null;

    // Prepare follow-up data
    const followupData: Record<string, any> = {
      org_id: orgId,
      followup_type: 'task', // Use 'task' type for command-created follow-ups
      title: title,
      due_date: parsedDueDate || null,
      priority: priority,
      status: 'pending',
      created_by: loggedBy,
      created_at: new Date().toISOString(),
    };

    // Insert follow-up
    const { data: followup, error: followupError } = await insertOne(
      supabase,
      TABLES.FOLLOWUPS,
      followupData
    );

    if (followupError || !followup) {
      return failedResult(
        followupError || { code: 'DATABASE_ERROR', message: 'Failed to create follow-up' },
        'Failed to create follow-up'
      );
    }

    const followupId = (followup as any).followup_id;

    // Track the insert for undo
    changes.push(trackInsert(TABLES.FOLLOWUPS, followupId, followupData));

    // Create timeline event
    const dueDateText = parsedDueDate
      ? ` (due ${new Date(parsedDueDate).toLocaleDateString()})`
      : '';

    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'other',
      eventCategory: 'activity',
      title: `Follow-up created: ${title}${dueDateText}`,
      description: `Priority: ${priority}`,
      sentiment: 'neutral',
      severity: priority === 'urgent' ? 'high' : priority === 'high' ? 'medium' : 'low',
      metadata: { followupId, priority, dueDate: parsedDueDate },
      loggedBy,
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
    }

    // Store undo information
    const undoResult = await storeUndoInfo({
      supabase,
      userId: loggedBy,
      commandText: `CREATE_FOLLOWUP: ${title.substring(0, 50)}`,
      changes,
    });

    // Create summary
    const priorityText = priority !== 'medium' ? ` [${priority}]` : '';
    const summary = orgName
      ? `Follow-up created for ${orgName}: "${title}"${priorityText}${dueDateText}`
      : `Follow-up created: "${title}"${priorityText}${dueDateText}`;

    return {
      success: true,
      data: {
        followupId,
        title,
        dueDate: parsedDueDate,
        priority,
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
 * Maps parsed command fields to createFollowup input
 */
export function mapToCreateFollowupInput(
  fields: Record<string, any>,
  orgId: string
): CreateFollowupInput {
  return {
    orgId,
    title: fields.followup_title || fields.title || fields.details || 'Follow-up task',
    dueDate: fields.followup_due_date || fields.due_date || fields.date || undefined,
    priority: fields.followup_priority || fields.priority || 'medium',
  };
}

export default createFollowup;
