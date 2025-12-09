/**
 * Log Competitor Action
 * Records competitive mentions in deals
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type LogCompetitorOutput,
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

// ============ POSITION TYPES ============

export const POSITION_TYPES = [
  'advantage',  // We have clear advantage over competitor
  'neutral',    // Evenly matched or unknown
  'concern',    // Competitor has advantage in this area
] as const;

export type PositionType = typeof POSITION_TYPES[number];

export const POSITION_LABELS: Record<PositionType, string> = {
  advantage: 'Our Advantage',
  neutral: 'Neutral',
  concern: 'Concern',
};

// ============ COMMON COMPETITORS ============

/**
 * Common competitor names for auto-detection
 * These can be extended based on the industry
 */
export const COMMON_COMPETITORS = [
  // Add industry-specific competitors here
];

// ============ INPUT SCHEMA ============

export const logCompetitorSchema = z.object({
  /** Organization ID where competitor was mentioned */
  orgId: z.string().min(1, 'Organization is required'),

  /** Competitor name */
  competitorName: z.string().min(1, 'Competitor name is required').max(200),

  /** Context of comparison (pricing, features, support, etc.) */
  comparisonContext: z.string().max(500).optional(),

  /** Our position relative to competitor */
  position: z.enum(POSITION_TYPES).optional(),

  /** Source activity ID if from parsed command */
  sourceActivityId: z.string().optional(),
});

export type LogCompetitorInput = z.infer<typeof logCompetitorSchema>;

// ============ ACTION IMPLEMENTATION ============

export const logCompetitor: Action<LogCompetitorInput, LogCompetitorOutput> = {
  name: 'LOG_COMPETITOR',
  description: 'Log a competitive mention',
  schema: logCompetitorSchema,

  async execute(input, context): Promise<ActionResult<LogCompetitorOutput>> {
    const { supabase, userId: mentionedBy } = context;
    const changes: DatabaseChange[] = [];
    const summaryParts: string[] = [];

    // Validate input
    const validation = logCompetitorSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, competitorName, comparisonContext, position, sourceActivityId } = validation.data;

    // Verify organization exists
    const { data: org, error: orgError } = await fetchById(supabase, TABLES.ORGANIZATIONS, orgId);
    if (orgError || !org) {
      return failedResult(notFoundError('Organization', orgId), 'Organization not found');
    }

    const orgName = (org as any).org_name || 'Organization';

    // Normalize competitor name (capitalize first letter of each word)
    const normalizedCompetitor = competitorName
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // Create competitive mention record
    const mentionData = {
      org_id: orgId,
      competitor_name: normalizedCompetitor,
      comparison_context: comparisonContext || null,
      our_position: position || null,
      mentioned_at: new Date().toISOString(),
      source_activity_id: sourceActivityId || null,
      mentioned_by: mentionedBy,
    };

    const { data: mention, error: insertError } = await insertOne(
      supabase,
      'competitive_mentions' as any,
      mentionData
    );

    if (insertError) {
      // Table might not exist yet (migration pending)
      return failedResult(
        { code: 'DATABASE_ERROR', message: 'Competitive mentions table not available. Please apply migration.', technical: insertError.message },
        'Database error'
      );
    }

    const mentionId = (mention as any).id;
    changes.push(trackInsert('competitive_mentions', mentionId, mentionData));

    const positionLabel = position ? POSITION_LABELS[position] : '';
    summaryParts.push(`Logged ${normalizedCompetitor} mention${positionLabel ? ` (${positionLabel})` : ''}`);

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'competitor_mentioned',
      eventCategory: 'engagement',
      title: `Competitor mentioned: ${normalizedCompetitor}`,
      description: comparisonContext
        ? `Context: ${comparisonContext}${position ? `. Position: ${positionLabel}` : ''}`
        : position ? `Position: ${positionLabel}` : `${normalizedCompetitor} was mentioned in conversation`,
      eventTimestamp: new Date().toISOString(),
      loggedBy: mentionedBy,
      sentiment: position === 'advantage' ? 'positive' : position === 'concern' ? 'negative' : 'neutral',
      severity: position === 'concern' ? 'medium' : 'low',
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
      summaryParts.push('Created timeline event');
    }

    // Store undo info
    const undoResult = await storeUndoInfo({
      supabase,
      userId: mentionedBy,
      commandText: `LOG_COMPETITOR: ${normalizedCompetitor} at ${orgName}`,
      changes,
    });

    return {
      success: true,
      data: {
        mentionId,
        competitorName: normalizedCompetitor,
        position,
      },
      changes,
      summary: summaryParts.join(', ') || `Logged ${normalizedCompetitor} mention`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToLogCompetitorInput(
  fields: Record<string, any>,
  orgId: string
): LogCompetitorInput {
  return {
    orgId,
    competitorName: fields.competitor_name || fields.competitor || fields.name || '',
    comparisonContext: fields.comparison_context || fields.context || fields.area || undefined,
    position: fields.position || fields.our_position || undefined,
    sourceActivityId: fields.source_activity_id || undefined,
  };
}

export default logCompetitor;
