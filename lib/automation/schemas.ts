/**
 * Automation System Zod Schemas
 * Validation for automation rules and actions
 */

import { z } from 'zod';

// ============================================
// Entity Types
// ============================================

export const automationEntityTypeSchema = z.enum([
  'trial_organizations',
  'trial_users',
  'tickets',
]);

export const AUTOMATION_ENTITY_TYPES = automationEntityTypeSchema.options;

// ============================================
// Trigger Types
// ============================================

export const triggerTypeSchema = z.enum(['event', 'schedule']);

export const triggerEventSchema = z.enum([
  'created',
  'updated',
  'deleted',
  'field_changed',
  'status_changed',
  'trial_expired',
  'trial_expiring_soon',
  'ticket_created',
  'ticket_assigned',
  'ticket_resolved',
]);

// ============================================
// Conditions
// ============================================

export const conditionLogicSchema = z.enum(['AND', 'OR']);

export const textOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
]);

export const numberOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'greater_than',
  'greater_than_or_equals',
  'less_than',
  'less_than_or_equals',
  'between',
]);

export const dateOperatorSchema = z.enum([
  'equals',
  'before',
  'after',
  'between',
  'in_last_n_days',
  'in_next_n_days',
  'is_today',
  'is_empty',
  'is_not_empty',
]);

export const enumOperatorSchema = z.enum(['equals', 'not_equals', 'in', 'not_in']);

export const booleanOperatorSchema = z.enum(['equals']);

export const textConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  fieldType: z.literal('text'),
  operator: textOperatorSchema,
  value: z.string().optional(),
});

export const numberConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  fieldType: z.literal('number'),
  operator: numberOperatorSchema,
  value: z.union([z.number(), z.tuple([z.number(), z.number()])]).optional(),
});

export const dateConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  fieldType: z.literal('date'),
  operator: dateOperatorSchema,
  value: z.union([z.string(), z.number(), z.tuple([z.string(), z.string()])]).optional(),
});

export const enumConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  fieldType: z.literal('enum'),
  operator: enumOperatorSchema,
  value: z.union([z.string(), z.array(z.string())]).optional(),
});

export const booleanConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  fieldType: z.literal('boolean'),
  operator: booleanOperatorSchema,
  value: z.boolean().optional(),
});

export const conditionSchema = z.discriminatedUnion('fieldType', [
  textConditionSchema,
  numberConditionSchema,
  dateConditionSchema,
  enumConditionSchema,
  booleanConditionSchema,
]);

export const conditionGroupSchema = z.object({
  logic: conditionLogicSchema,
  conditions: z.array(conditionSchema),
});

// ============================================
// Actions
// ============================================

export const actionTypeSchema = z.enum([
  'send_notification',
  'send_email',
  'send_teams_message',
  'update_field',
  'create_ticket',
  'add_timeline_event',
  'assign_user',
]);

export const notificationChannelSchema = z.enum(['in_app', 'email', 'teams']);

export const recipientTypeSchema = z.enum([
  'owner',
  'assignee',
  'account_manager',
  'specific_users',
  'admins',
  'all_team',
]);

export const sendNotificationConfigSchema = z.object({
  channel: notificationChannelSchema,
  recipients: recipientTypeSchema,
  specific_user_ids: z.array(z.string()).optional(),
  message_template: z.string().min(1, { message: 'Message template is required' }),
  subject: z.string().optional(),
});

export const sendEmailConfigSchema = z.object({
  recipients: recipientTypeSchema,
  specific_emails: z.array(z.string().email()).optional(),
  subject_template: z.string().min(1, { message: 'Subject is required' }),
  body_template: z.string().min(1, { message: 'Body is required' }),
});

export const sendTeamsMessageConfigSchema = z.object({
  webhook_url: z.string().url({ message: 'Valid webhook URL is required' }),
  message_template: z.string().min(1, { message: 'Message template is required' }),
  include_link: z.boolean().optional(),
});

export const updateFieldConfigSchema = z.object({
  field: z.string().min(1, { message: 'Field is required' }),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

export const createTicketConfigSchema = z.object({
  title_template: z.string().min(1, { message: 'Title is required' }),
  description_template: z.string().min(1, { message: 'Description is required' }),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assign_to: z.enum(['owner', 'account_manager', 'specific_user', 'round_robin']),
  specific_user_id: z.string().optional(),
  category: z.string().optional(),
});

export const addTimelineEventConfigSchema = z.object({
  event_type: z.string().min(1, { message: 'Event type is required' }),
  description_template: z.string().min(1, { message: 'Description is required' }),
});

export const assignUserConfigSchema = z.object({
  strategy: z.enum(['specific_user', 'round_robin', 'least_busy']),
  user_id: z.string().optional(),
});

// Action with discriminated union
export const automationActionSchema = z.object({
  id: z.string(),
  type: actionTypeSchema,
  config: z.union([
    sendNotificationConfigSchema,
    sendEmailConfigSchema,
    sendTeamsMessageConfigSchema,
    updateFieldConfigSchema,
    createTicketConfigSchema,
    addTimelineEventConfigSchema,
    assignUserConfigSchema,
  ]),
});

// ============================================
// Rule Schemas
// ============================================

export const createAutomationRuleSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(200),
  description: z.string().max(1000).optional(),
  entity_type: automationEntityTypeSchema,
  is_active: z.boolean().optional().default(true),
  trigger_type: triggerTypeSchema,
  trigger_event: triggerEventSchema.optional(),
  schedule_cron: z.string().optional(),
  conditions: conditionGroupSchema,
  actions: z.array(automationActionSchema).min(1, { message: 'At least one action is required' }),
  max_executions_per_entity: z.number().positive().optional(),
  cooldown_minutes: z.number().min(0).optional().default(60),
}).refine(
  (data) => {
    // If trigger_type is 'event', trigger_event is required
    if (data.trigger_type === 'event' && !data.trigger_event) {
      return false;
    }
    return true;
  },
  { message: 'Trigger event is required for event-based triggers', path: ['trigger_event'] }
).refine(
  (data) => {
    // If trigger_type is 'schedule', schedule_cron is required
    if (data.trigger_type === 'schedule' && !data.schedule_cron) {
      return false;
    }
    return true;
  },
  { message: 'Schedule cron is required for scheduled triggers', path: ['schedule_cron'] }
);

export const updateAutomationRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  is_active: z.boolean().optional(),
  trigger_type: triggerTypeSchema.optional(),
  trigger_event: triggerEventSchema.optional().nullable(),
  schedule_cron: z.string().optional().nullable(),
  conditions: conditionGroupSchema.optional(),
  actions: z.array(automationActionSchema).optional(),
  max_executions_per_entity: z.number().positive().optional().nullable(),
  cooldown_minutes: z.number().min(0).optional(),
});

// ============================================
// Type exports
// ============================================

export type CreateAutomationRuleInput = z.infer<typeof createAutomationRuleSchema>;
export type UpdateAutomationRuleInput = z.infer<typeof updateAutomationRuleSchema>;
export type ConditionGroupInput = z.infer<typeof conditionGroupSchema>;
export type ConditionInput = z.infer<typeof conditionSchema>;
export type AutomationActionInput = z.infer<typeof automationActionSchema>;
