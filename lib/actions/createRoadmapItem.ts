/**
 * Create Roadmap Item Action
 * Creates a roadmap item (org-specific or master)
 */

import { z } from 'zod';
import {
  type Action,
  type ActionResult,
  type ActionContext,
  type CreateRoadmapItemOutput,
  type DatabaseChange,
  TABLES,
  insertOne,
  validationError,
  failedResult,
  storeUndoInfo,
  trackInsert,
  parseRelativeDate,
} from './_shared';

// ============ ROADMAP CONSTANTS ============

export const ROADMAP_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
export const ROADMAP_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export type RoadmapStatus = typeof ROADMAP_STATUSES[number];
export type RoadmapPriority = typeof ROADMAP_PRIORITIES[number];

// ============ INPUT SCHEMA ============

export const createRoadmapItemSchema = z.object({
  /** Roadmap item title (required) */
  title: z.string().min(1, 'Roadmap title is required').max(500),

  /** Description */
  description: z.string().max(10000).optional(),

  /** Status */
  status: z.string().default('planned'),

  /** Priority */
  priority: z.string().default('medium'),

  /** Target date (relative or ISO) */
  targetDate: z.string().optional(),

  /** Organization ID (optional - if not provided, creates master roadmap item) */
  orgId: z.string().optional(),
});

export type CreateRoadmapItemInput = z.infer<typeof createRoadmapItemSchema>;

// ============ ACTION IMPLEMENTATION ============

export const createRoadmapItem: Action<CreateRoadmapItemInput, CreateRoadmapItemOutput> = {
  name: 'CREATE_ROADMAP_ITEM',
  description: 'Create a roadmap item',
  schema: createRoadmapItemSchema,

  async execute(input, context): Promise<ActionResult<CreateRoadmapItemOutput>> {
    const { supabase, userId } = context;
    const changes: DatabaseChange[] = [];

    const validation = createRoadmapItemSchema.safeParse(input);
    if (!validation.success) {
      return failedResult(validationError(validation.error), 'Invalid input');
    }

    const { title, description, status, priority, targetDate, orgId } = validation.data;

    const roadmapData: Record<string, any> = {
      title,
      description: description || '',
      status,
      priority,
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    // If org_id provided, it's org-specific, otherwise master roadmap
    if (orgId || context.orgId) {
      roadmapData.org_id = orgId || context.orgId;
    }

    if (targetDate) {
      roadmapData.target_date = parseRelativeDate(targetDate);
    }

    const { data: item, error } = await insertOne(supabase, TABLES.PRODUCT_ROADMAP, roadmapData);

    if (error || !item) {
      return failedResult(error || { code: 'DATABASE_ERROR', message: 'Failed to create roadmap item' }, 'Failed to create roadmap item');
    }

    const roadmapItemId = (item as any).id;
    changes.push(trackInsert(TABLES.PRODUCT_ROADMAP, roadmapItemId, roadmapData));

    const undoResult = await storeUndoInfo({
      supabase,
      userId,
      commandText: `CREATE_ROADMAP_ITEM: ${title}`,
      changes,
    });

    const isMaster = !roadmapData.org_id;

    return {
      success: true,
      data: { roadmapItemId, title },
      changes,
      summary: `Created roadmap item: "${title}"${isMaster ? ' (master roadmap)' : ''}`,
      undoId: undoResult.undoId || undefined,
      undoExpiresAt: undoResult.expiresAt || undefined,
    };
  },
};

export function mapToCreateRoadmapItemInput(fields: Record<string, any>, orgId?: string): CreateRoadmapItemInput {
  return {
    title: fields.roadmap_title || '',
    description: fields.roadmap_description || undefined,
    status: fields.roadmap_status || 'planned',
    priority: fields.roadmap_priority || 'medium',
    targetDate: fields.target_date || undefined,
    orgId: orgId || undefined,
  };
}

export default createRoadmapItem;
