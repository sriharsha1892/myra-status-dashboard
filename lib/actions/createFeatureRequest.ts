/**
 * Create Feature Request Action
 * Creates a feature request for an organization
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type CreateFeatureRequestOutput,
  type DatabaseChange,
  TABLES,
  insertOne,
  validationError,
  failedResult,
  createTimelineEvent,
  featureRequestCreatedEvent,
  storeUndoInfo,
  trackInsert,
} from './_shared';

// ============ FEATURE REQUEST CONSTANTS ============

export const FEATURE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const FEATURE_STATUSES = ['submitted', 'under_review', 'planned', 'in_progress', 'completed', 'rejected'] as const;

export type FeaturePriority = typeof FEATURE_PRIORITIES[number];
export type FeatureStatus = typeof FEATURE_STATUSES[number];

// ============ INPUT SCHEMA ============

export const createFeatureRequestSchema = z.object({
  /** Organization ID (required) */
  orgId: z.string().min(1, 'Organization is required'),

  /** Feature title (required) */
  title: z.string().min(1, 'Feature title is required').max(500),

  /** Feature description */
  description: z.string().max(10000).optional(),

  /** Use case for the feature */
  useCase: z.string().max(5000).optional(),

  /** Priority level */
  priority: z.string().default('medium'),
});

export type CreateFeatureRequestInput = z.infer<typeof createFeatureRequestSchema>;

// ============ ACTION IMPLEMENTATION ============

export const createFeatureRequest: Action<CreateFeatureRequestInput, CreateFeatureRequestOutput> = {
  name: 'CREATE_FEATURE_REQUEST',
  description: 'Create a feature request',
  schema: createFeatureRequestSchema,

  async execute(input, context): Promise<ActionResult<CreateFeatureRequestOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    const validation = createFeatureRequestSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { orgId, title, description, useCase, priority } = validation.data;

    const featureData: Record<string, any> = {
      org_id: orgId,
      title,
      description: description || '',
      use_case: useCase || '',
      priority,
      status: 'submitted',
      submitted_by: userId,
      created_at: new Date().toISOString(),
    };

    const { data: feature, error } = await insertOne(supabase, TABLES.FEATURE_REQUESTS, featureData);

    if (error || !feature) {
      return failedResult(error || { code: 'DATABASE_ERROR', message: 'Failed to create feature request' }, 'Failed to create feature request');
    }

    const featureRequestId = (feature as any).id;
    changes.push(trackInsert(TABLES.FEATURE_REQUESTS, featureRequestId, featureData));

    // Create timeline event
    const timelineResult = await createTimelineEvent(
      supabase,
      featureRequestCreatedEvent(orgId, title, userId)
    );
    if (timelineResult.change) changes.push(timelineResult.change);

    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `CREATE_FEATURE_REQUEST: ${title}`,
      changes,
    });

    return {
      success: true,
      data: { featureRequestId, title },
      changes,
      summary: `Created feature request: "${title}"`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

export function mapToCreateFeatureRequestInput(fields: Record<string, any>, orgId: string): CreateFeatureRequestInput {
  return {
    orgId,
    title: fields.feature_title || '',
    description: fields.feature_description || undefined,
    useCase: fields.feature_use_case || undefined,
    priority: fields.feature_priority || 'medium',
  };
}

export default createFeatureRequest;
