/**
 * Track Feature Interest Action
 * Records feature interests expressed by organizations
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type TrackFeatureInterestOutput,
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

// ============ PRIORITY TYPES ============

export const FEATURE_INTEREST_PRIORITIES = [
  'low',       // Nice to have
  'medium',    // Would be helpful
  'high',      // Important for decision
  'critical',  // Deal-breaker without this
] as const;

export type FeatureInterestPriority = typeof FEATURE_INTEREST_PRIORITIES[number];

export const PRIORITY_LABELS: Record<FeatureInterestPriority, string> = {
  low: 'Nice to Have',
  medium: 'Would be Helpful',
  high: 'Important',
  critical: 'Critical',
};

// ============ INPUT SCHEMA ============

export const trackFeatureInterestSchema = z.object({
  /** Organization ID expressing interest */
  orgId: z.string().min(1, 'Organization is required'),

  /** Feature name/description */
  featureName: z.string().min(1, 'Feature name is required').max(300),

  /** Context of the request (asked about, needs, requires, etc.) */
  context: z.string().max(1000).optional(),

  /** Priority level */
  priority: z.enum(FEATURE_INTEREST_PRIORITIES).default('medium'),

  /** Link to existing feature request if any */
  featureRequestId: z.string().optional(),

  /** Source command that created this */
  sourceCommand: z.string().optional(),
});

export type TrackFeatureInterestInput = z.infer<typeof trackFeatureInterestSchema>;

// ============ ACTION IMPLEMENTATION ============

export const trackFeatureInterest: Action<TrackFeatureInterestInput, TrackFeatureInterestOutput> = {
  name: 'TRACK_FEATURE_INTEREST',
  description: 'Track feature interest from an organization',
  schema: trackFeatureInterestSchema,

  async execute(input, context): Promise<ActionResult<TrackFeatureInterestOutput>> {
    const { supabase, userId: mentionedBy } = context;
    const changes: DatabaseChange[] = [];
    const summaryParts: string[] = [];

    // Validate input
    const validation = trackFeatureInterestSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, featureName, context: featureContext, priority, featureRequestId, sourceCommand } = validation.data;

    // Verify organization exists
    const { data: org, error: orgError } = await fetchById(supabase, TABLES.ORGANIZATIONS, orgId);
    if (orgError || !org) {
      return failedResult(notFoundError('Organization', orgId), 'Organization not found');
    }

    const orgName = (org as any).org_name || 'Organization';

    // Try to find matching feature request if not provided
    let resolvedFeatureRequestId = featureRequestId;
    if (!resolvedFeatureRequestId) {
      // Search for existing feature request with similar name
      const { data: existingRequests } = await supabase
        .from('feature_requests')
        .select('request_id, title')
        .ilike('title', `%${featureName}%`)
        .limit(1);

      if (existingRequests && existingRequests.length > 0) {
        resolvedFeatureRequestId = existingRequests[0].request_id;
      }
    }

    // Create feature interest record
    const interestData = {
      org_id: orgId,
      feature_name: featureName,
      context: featureContext || null,
      priority,
      feature_request_id: resolvedFeatureRequestId || null,
      mentioned_at: new Date().toISOString(),
      mentioned_by: mentionedBy,
      source_command: sourceCommand || null,
    };

    const { data: interest, error: insertError } = await insertOne(
      supabase,
      'feature_interests' as any,
      interestData
    );

    if (insertError) {
      // Table might not exist yet (migration pending)
      return failedResult(
        { code: 'DATABASE_ERROR', message: 'Feature interests table not available. Please apply migration.', technical: insertError.message },
        'Database error'
      );
    }

    const interestId = (interest as any).id;
    changes.push(trackInsert('feature_interests', interestId, interestData));

    const priorityLabel = PRIORITY_LABELS[priority];
    summaryParts.push(`Tracked interest in "${featureName}" (${priorityLabel})`);

    // Create timeline event
    const timelineResult = await createTimelineEvent(supabase, {
      orgId,
      eventType: 'feature_interest_logged',
      eventCategory: 'feedback',
      title: `Feature interest: ${featureName}`,
      description: featureContext
        ? `${featureContext}. Priority: ${priorityLabel}`
        : `Interest in ${featureName}. Priority: ${priorityLabel}`,
      eventTimestamp: new Date().toISOString(),
      loggedBy: mentionedBy,
      sentiment: priority === 'critical' ? 'negative' : 'neutral',
      severity: priority === 'critical' ? 'high' : priority === 'high' ? 'medium' : 'low',
    });

    if (timelineResult.change) {
      changes.push(timelineResult.change);
      summaryParts.push('Created timeline event');
    }

    // Store undo info
    const undoResult = await storeUndoInfo({
      supabase,
      userId: mentionedBy,
      commandText: `TRACK_FEATURE_INTEREST: ${featureName} for ${orgName}`,
      changes,
    });

    return {
      success: true,
      data: {
        interestId,
        featureName,
        priority,
      },
      changes,
      summary: summaryParts.join(', ') || `Tracked "${featureName}" interest`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

// ============ INPUT MAPPER ============

export function mapToTrackFeatureInterestInput(
  fields: Record<string, any>,
  orgId: string
): TrackFeatureInterestInput {
  return {
    orgId,
    featureName: fields.feature_name || fields.feature || fields.name || '',
    context: fields.context || fields.details || undefined,
    priority: fields.priority || 'medium',
    featureRequestId: fields.feature_request_id || undefined,
    sourceCommand: fields.source_command || undefined,
  };
}

export default trackFeatureInterest;
