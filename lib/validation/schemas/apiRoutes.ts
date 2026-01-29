/**
 * API Routes Validation Schemas
 *
 * Zod schemas for API route request bodies.
 * Ensures all API inputs are validated before database operations.
 */

import { z } from 'zod';
import { nonEmptyString, optionalNonEmptyString, uuidSchema, optionalUuidSchema } from './common';

// ============================================================================
// Learning Management
// ============================================================================

export const LEARNING_CATEGORIES = [
  'feature_request',
  'bug_report',
  'ux_feedback',
  'documentation',
  'performance',
  'integration',
  'other',
] as const;

export const IMPACT_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export const createLearningSchema = z.object({
  title: nonEmptyString('Title'),
  description: z.string().optional(),
  category: z.enum(LEARNING_CATEGORIES, {
    message: 'Invalid category',
  }),
  impact: z.enum(IMPACT_LEVELS, {
    message: 'Invalid impact level',
  }).optional(),
  source_org_id: optionalUuidSchema,
  reported_count: z.number().int().nonnegative().default(1),
  implemented: z.boolean().default(false),
});

export type CreateLearning = z.infer<typeof createLearningSchema>;

// ============================================================================
// Timeline Events
// ============================================================================

export const TIMELINE_EVENT_TYPES = [
  'meeting',
  'call',
  'email',
  'demo',
  'milestone',
  'note',
  'status_change',
  'other',
] as const;

export const createTimelineEventSchema = z.object({
  org_id: uuidSchema,
  user_id: optionalUuidSchema,
  event_type: z.enum(TIMELINE_EVENT_TYPES, {
    message: 'Invalid event type',
  }),
  title: nonEmptyString('Title'),
  description: z.string().optional(),
  event_date: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateTimelineEvent = z.infer<typeof createTimelineEventSchema>;

// ============================================================================
// Activity Notes
// ============================================================================

export const ACTIVITY_NOTE_CATEGORIES = [
  'general',
  'meeting',
  'call',
  'email',
  'demo',
  'support',
  'feedback',
  'other',
] as const;

export const createActivityNoteSchema = z.object({
  org_id: uuidSchema,
  user_id: optionalUuidSchema,
  category: z.enum(ACTIVITY_NOTE_CATEGORIES, {
    message: 'Invalid category',
  }).default('general'),
  title: nonEmptyString('Title'),
  content: z.string().optional(),
  is_pinned: z.boolean().default(false),
});

export type CreateActivityNote = z.infer<typeof createActivityNoteSchema>;

// ============================================================================
// Alerts
// ============================================================================

export const ALERT_TYPES = [
  'info',
  'warning',
  'error',
  'success',
  'trial_expiring',
  'low_activity',
  'high_usage',
] as const;

export const ALERT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export const createAlertSchema = z.object({
  org_id: optionalUuidSchema,
  user_id: optionalUuidSchema,
  alert_type: z.enum(ALERT_TYPES, {
    message: 'Invalid alert type',
  }),
  title: nonEmptyString('Title'),
  message: z.string().optional(),
  priority: z.enum(ALERT_PRIORITIES, {
    message: 'Invalid priority',
  }).default('medium'),
  is_read: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAlert = z.infer<typeof createAlertSchema>;

// ============================================================================
// Unified Notes
// ============================================================================

export const createUnifiedNoteSchema = z.object({
  org_id: uuidSchema,
  user_id: optionalUuidSchema,
  note_type: z.string().min(1, 'Note type is required'),
  title: z.string().optional(),
  content: nonEmptyString('Content'),
  is_pinned: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateUnifiedNote = z.infer<typeof createUnifiedNoteSchema>;

// ============================================================================
// Custom Fields
// ============================================================================

export const CUSTOM_FIELD_TYPES = [
  'text',
  'number',
  'date',
  'boolean',
  'select',
  'multiselect',
  'url',
  'email',
] as const;

export const createCustomFieldDefinitionSchema = z.object({
  name: nonEmptyString('Field name'),
  field_type: z.enum(CUSTOM_FIELD_TYPES, {
    message: 'Invalid field type',
  }),
  entity_type: z.enum(['organization', 'user', 'deal'], {
    message: 'Invalid entity type',
  }),
  options: z.array(z.string()).optional(),
  is_required: z.boolean().default(false),
  default_value: z.unknown().optional(),
  description: z.string().optional(),
});

export type CreateCustomFieldDefinition = z.infer<typeof createCustomFieldDefinitionSchema>;

export const updateCustomFieldValueSchema = z.object({
  field_id: uuidSchema,
  entity_id: uuidSchema,
  value: z.unknown(),
});

export type UpdateCustomFieldValue = z.infer<typeof updateCustomFieldValueSchema>;

// ============================================================================
// Automation Rules
// ============================================================================

export const AUTOMATION_TRIGGERS = [
  'trial_expiring',
  'low_activity',
  'high_usage',
  'status_change',
  'manual',
] as const;

export const AUTOMATION_ACTIONS = [
  'send_email',
  'create_task',
  'update_status',
  'assign_user',
  'webhook',
] as const;

export const createAutomationRuleSchema = z.object({
  name: nonEmptyString('Rule name'),
  trigger: z.enum(AUTOMATION_TRIGGERS, {
    message: 'Invalid trigger',
  }),
  action: z.enum(AUTOMATION_ACTIONS, {
    message: 'Invalid action',
  }),
  conditions: z.record(z.unknown()).optional(),
  action_config: z.record(z.unknown()).optional(),
  is_active: z.boolean().default(true),
});

export type CreateAutomationRule = z.infer<typeof createAutomationRuleSchema>;

// ============================================================================
// Import Request
// ============================================================================

export const IMPORT_ENTITY_TYPES = [
  'organization',
  'status_update',
  'activity',
  'myra_usage',
  'prospect',
] as const;

export const importRequestSchema = z.object({
  action: z.enum([
    'prepare',
    'validate',
    'import',
    'retry',
    'delete',
    'update_row',
    'delete_rows',
    'assign_org',
    'ai_parse',
    'detect_columns',
  ]),
  batchId: optionalUuidSchema,
  entityType: z.enum(IMPORT_ENTITY_TYPES).optional(),
  name: z.string().optional(),
  data: z.string().optional(),
  columnMapping: z.record(z.string()).optional(),
  stagingId: optionalUuidSchema,
  stagingIds: z.array(uuidSchema).optional(),
  updates: z.record(z.unknown()).optional(),
  orgId: optionalUuidSchema,
  orgName: z.string().optional(),
});

export type ImportRequest = z.infer<typeof importRequestSchema>;

// ============================================================================
// Roadmap Query Params
// ============================================================================

export const roadmapQuerySchema = z.object({
  org_id: optionalUuidSchema,
  category: z.string().optional(),
  status: z.string().optional(),
  phase: z.string().optional(),
  master_only: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export type RoadmapQuery = z.infer<typeof roadmapQuerySchema>;

// ============================================================================
// Helper: Safe Parse with Error Response
// ============================================================================

export function validateRequest<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.errors[0];
    return {
      success: false,
      error: firstError?.message || 'Validation failed',
    };
  }
  return { success: true, data: result.data };
}
