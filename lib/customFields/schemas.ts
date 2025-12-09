/**
 * Custom Fields Validation Schemas
 * Zod schemas for validating custom field definitions and values
 */

import { z } from 'zod';

// ============================================
// Constants
// ============================================

export const ENTITY_TYPES = [
  'trial_organizations',
  'trial_users',
  'tickets',
  'trial_timeline_events',
  'user_activity_log',
] as const;

export const FIELD_TYPES = [
  'text',
  'number',
  'boolean',
  'date',
  'enum',
  'multi_select',
  'url',
  'email',
] as const;

// ============================================
// Field Configuration Schemas
// ============================================

export const enumOptionSchema = z.object({
  value: z.string().min(1, { message: 'Option value is required' }),
  label: z.string().min(1, { message: 'Option label is required' }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Invalid hex color' }).optional(),
});

export const textFieldConfigSchema = z.object({
  maxLength: z.number().int().positive().optional(),
  placeholder: z.string().max(200).optional(),
  multiline: z.boolean().optional(),
});

export const numberFieldConfigSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  unit: z.string().max(20).optional(),
  placeholder: z.string().max(100).optional(),
});

export const dateFieldConfigSchema = z.object({
  includeTime: z.boolean().optional(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
});

export const enumFieldConfigSchema = z.object({
  options: z.array(enumOptionSchema).min(1, { message: 'At least one option is required' }),
});

export const multiSelectFieldConfigSchema = z.object({
  options: z.array(enumOptionSchema).min(1, { message: 'At least one option is required' }),
  maxSelections: z.number().int().positive().optional(),
});

export const urlFieldConfigSchema = z.object({
  placeholder: z.string().max(200).optional(),
});

export const emailFieldConfigSchema = z.object({
  placeholder: z.string().max(200).optional(),
});

// Union of all config schemas
export const fieldConfigSchema = z.union([
  textFieldConfigSchema,
  numberFieldConfigSchema,
  dateFieldConfigSchema,
  enumFieldConfigSchema,
  multiSelectFieldConfigSchema,
  urlFieldConfigSchema,
  emailFieldConfigSchema,
  z.object({}), // Allow empty config
]);

// ============================================
// Field Definition Schemas
// ============================================

export const createCustomFieldDefinitionSchema = z.object({
  field_key: z
    .string()
    .min(1, { message: 'Field key is required' })
    .max(50, { message: 'Field key must be less than 50 characters' })
    .regex(/^[a-z][a-z0-9_]*$/, {
      message: 'Field key must be snake_case (lowercase letters, numbers, underscores, starting with a letter)',
    }),
  field_label: z
    .string()
    .min(1, { message: 'Field label is required' })
    .max(100, { message: 'Field label must be less than 100 characters' }),
  description: z
    .string()
    .max(500, { message: 'Description must be less than 500 characters' })
    .optional(),
  entity_type: z.enum(ENTITY_TYPES, { message: 'Invalid entity type' }),
  field_type: z.enum(FIELD_TYPES, { message: 'Invalid field type' }),
  field_config: fieldConfigSchema.optional().default({}),
  is_required: z.boolean().optional().default(false),
  default_value: z.any().optional(),
  validation_regex: z.string().max(500).optional(),
  validation_message: z.string().max(200).optional(),
  display_order: z.number().int().min(0).optional().default(0),
  is_visible: z.boolean().optional().default(true),
  show_in_list: z.boolean().optional().default(false),
  show_in_detail: z.boolean().optional().default(true),
  is_filterable: z.boolean().optional().default(true),
  is_sortable: z.boolean().optional().default(true),
  is_searchable: z.boolean().optional().default(false),
  import_column_name: z.string().max(100).optional(),
  export_column_name: z.string().max(100).optional(),
});

export const updateCustomFieldDefinitionSchema = z.object({
  field_label: z
    .string()
    .min(1, { message: 'Field label is required' })
    .max(100, { message: 'Field label must be less than 100 characters' })
    .optional(),
  description: z
    .string()
    .max(500, { message: 'Description must be less than 500 characters' })
    .optional(),
  field_config: fieldConfigSchema.optional(),
  is_required: z.boolean().optional(),
  default_value: z.any().optional(),
  validation_regex: z.string().max(500).optional(),
  validation_message: z.string().max(200).optional(),
  display_order: z.number().int().min(0).optional(),
  is_visible: z.boolean().optional(),
  show_in_list: z.boolean().optional(),
  show_in_detail: z.boolean().optional(),
  is_filterable: z.boolean().optional(),
  is_sortable: z.boolean().optional(),
  is_searchable: z.boolean().optional(),
  import_column_name: z.string().max(100).optional(),
  export_column_name: z.string().max(100).optional(),
});

// ============================================
// Custom Field Value Schemas
// ============================================

export const customFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.date(),
  z.array(z.string()),
  z.null(),
]);

export const customFieldValuesSchema = z.record(z.string(), customFieldValueSchema);

// ============================================
// Filter Schemas
// ============================================

export const filterOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'in',
  'not_in',
  'is_null',
  'not_null',
]);

export const customFieldFilterSchema = z.object({
  field_key: z.string().min(1),
  operator: filterOperatorSchema,
  value: z.union([customFieldValueSchema, z.array(customFieldValueSchema)]),
});

// ============================================
// Export Types
// ============================================

export type CreateCustomFieldDefinitionInput = z.infer<typeof createCustomFieldDefinitionSchema>;
export type UpdateCustomFieldDefinitionInput = z.infer<typeof updateCustomFieldDefinitionSchema>;
export type CustomFieldValueInput = z.infer<typeof customFieldValueSchema>;
export type CustomFieldValuesInput = z.infer<typeof customFieldValuesSchema>;
export type CustomFieldFilterInput = z.infer<typeof customFieldFilterSchema>;
