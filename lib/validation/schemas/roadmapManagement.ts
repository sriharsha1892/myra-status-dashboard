import { z } from 'zod';
import { nonEmptyString } from './common';

/**
 * Roadmap Management Validation Schemas
 *
 * Contains Zod schemas for validating roadmap-related operations:
 * - Creating roadmap items
 * - Updating roadmap status
 */

// ============================================================================
// Constants
// ============================================================================

export const ROADMAP_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
export const ROADMAP_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const ROADMAP_ITEM_TYPES = ['task', 'macro-goal'] as const;

// ============================================================================
// Type Exports
// ============================================================================

export type RoadmapStatus = typeof ROADMAP_STATUSES[number];
export type RoadmapPriority = typeof ROADMAP_PRIORITIES[number];
export type RoadmapItemType = typeof ROADMAP_ITEM_TYPES[number];

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for creating a new roadmap item
 * Used by: AddRoadmapItemModal (unified modal for both org-specific and master items)
 */
export const createRoadmapItemSchema = z.object({
  title: nonEmptyString('Title is required'),
  description: z.string().optional(),
  status: z.enum(ROADMAP_STATUSES, {
    errorMap: () => ({ message: 'Please select a valid status' }),
  }),
  priority: z.enum(ROADMAP_PRIORITIES, {
    errorMap: () => ({ message: 'Please select a valid priority' }),
  }),
  target_date: z.string().optional(),
  estimated_completion_date: z.string().optional(),
  created_by: z.string().optional(),
  // Fields for master roadmap items
  strategic_categories: z.array(z.string()).default([]),
  item_type: z.enum(ROADMAP_ITEM_TYPES).default('task'),
  parent_item_id: z.string().nullable().optional(),
});

export type CreateRoadmapItemInput = z.infer<typeof createRoadmapItemSchema>;
