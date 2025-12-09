/**
 * Custom Fields Service
 * CRUD operations for custom field definitions and values
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  CustomFieldDefinition,
  CreateCustomFieldDefinition,
  UpdateCustomFieldDefinition,
  CustomFieldValues,
  EntityType,
  FieldValidationResult,
  FieldValidationError,
  CustomFieldFilter,
} from './types';
import {
  createCustomFieldDefinitionSchema,
  updateCustomFieldDefinitionSchema,
} from './schemas';

// ============================================
// Constants
// ============================================

const TABLE_NAME = 'custom_field_definitions';

const ENTITY_TABLE_MAP: Record<EntityType, string> = {
  trial_organizations: 'trial_organizations',
  trial_users: 'trial_users',
  tickets: 'tickets',
  trial_timeline_events: 'trial_timeline_events',
  user_activity_log: 'user_activity_log',
};

const ENTITY_ID_COLUMN_MAP: Record<EntityType, string> = {
  trial_organizations: 'org_id',
  trial_users: 'user_id',
  tickets: 'id',
  trial_timeline_events: 'id',
  user_activity_log: 'id',
};

// ============================================
// Field Definitions CRUD
// ============================================

/**
 * Get all custom field definitions for an entity type
 */
export async function getCustomFieldDefinitions(
  supabase: SupabaseClient,
  entityType: EntityType,
  options?: {
    includeHidden?: boolean;
    filterableOnly?: boolean;
    listOnly?: boolean;
  }
): Promise<CustomFieldDefinition[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('entity_type', entityType)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (!options?.includeHidden) {
    query = query.eq('is_visible', true);
  }

  if (options?.filterableOnly) {
    query = query.eq('is_filterable', true);
  }

  if (options?.listOnly) {
    query = query.eq('show_in_list', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching custom field definitions:', error);
    throw new Error(`Failed to fetch custom field definitions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single custom field definition by ID
 */
export async function getCustomFieldDefinitionById(
  supabase: SupabaseClient,
  id: string
): Promise<CustomFieldDefinition | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch custom field definition: ${error.message}`);
  }

  return data;
}

/**
 * Get a custom field definition by key and entity type
 */
export async function getCustomFieldDefinitionByKey(
  supabase: SupabaseClient,
  entityType: EntityType,
  fieldKey: string
): Promise<CustomFieldDefinition | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('entity_type', entityType)
    .eq('field_key', fieldKey)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch custom field definition: ${error.message}`);
  }

  return data;
}

/**
 * Create a new custom field definition
 */
export async function createCustomFieldDefinition(
  supabase: SupabaseClient,
  input: CreateCustomFieldDefinition,
  userId?: string
): Promise<CustomFieldDefinition> {
  // Validate input
  const validation = createCustomFieldDefinitionSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(`Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`);
  }

  // Check for duplicate field_key
  const existing = await getCustomFieldDefinitionByKey(
    supabase,
    input.entity_type,
    input.field_key
  );
  if (existing) {
    throw new Error(`Field key "${input.field_key}" already exists for ${input.entity_type}`);
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...validation.data,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create custom field definition: ${error.message}`);
  }

  return data;
}

/**
 * Update a custom field definition
 */
export async function updateCustomFieldDefinition(
  supabase: SupabaseClient,
  id: string,
  input: UpdateCustomFieldDefinition,
  userId?: string
): Promise<CustomFieldDefinition> {
  // Validate input
  const validation = updateCustomFieldDefinitionSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(`Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`);
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      ...validation.data,
      updated_by: userId,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update custom field definition: ${error.message}`);
  }

  return data;
}

/**
 * Delete a custom field definition
 */
export async function deleteCustomFieldDefinition(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete custom field definition: ${error.message}`);
  }
}

/**
 * Reorder custom field definitions
 */
export async function reorderCustomFieldDefinitions(
  supabase: SupabaseClient,
  entityType: EntityType,
  orderedIds: string[]
): Promise<void> {
  // Update each field's display_order
  const updates = orderedIds.map((id, index) => ({
    id,
    display_order: index,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ display_order: update.display_order })
      .eq('id', update.id)
      .eq('entity_type', entityType);

    if (error) {
      throw new Error(`Failed to reorder custom field definitions: ${error.message}`);
    }
  }
}

// ============================================
// Custom Field Values CRUD
// ============================================

/**
 * Get custom field values for an entity
 */
export async function getCustomFieldValues(
  supabase: SupabaseClient,
  entityType: EntityType,
  entityId: string
): Promise<CustomFieldValues> {
  const tableName = ENTITY_TABLE_MAP[entityType];
  const idColumn = ENTITY_ID_COLUMN_MAP[entityType];

  const { data, error } = await supabase
    .from(tableName)
    .select('custom_fields')
    .eq(idColumn, entityId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return {}; // Entity not found
    }
    throw new Error(`Failed to fetch custom field values: ${error.message}`);
  }

  return (data?.custom_fields as CustomFieldValues) || {};
}

/**
 * Update custom field values for an entity
 */
export async function updateCustomFieldValues(
  supabase: SupabaseClient,
  entityType: EntityType,
  entityId: string,
  values: CustomFieldValues
): Promise<CustomFieldValues> {
  const tableName = ENTITY_TABLE_MAP[entityType];
  const idColumn = ENTITY_ID_COLUMN_MAP[entityType];

  // Validate values against definitions
  const validationResult = await validateCustomFieldValues(supabase, entityType, values);
  if (!validationResult.is_valid) {
    throw new Error(
      `Validation errors: ${validationResult.errors.map(e => e.message).join(', ')}`
    );
  }

  // Get existing values and merge
  const existing = await getCustomFieldValues(supabase, entityType, entityId);
  const merged = { ...existing, ...values };

  const { data, error } = await supabase
    .from(tableName)
    .update({ custom_fields: merged })
    .eq(idColumn, entityId)
    .select('custom_fields')
    .single();

  if (error) {
    throw new Error(`Failed to update custom field values: ${error.message}`);
  }

  return (data?.custom_fields as CustomFieldValues) || {};
}

/**
 * Bulk update custom field values for multiple entities
 */
export async function bulkUpdateCustomFieldValues(
  supabase: SupabaseClient,
  entityType: EntityType,
  entityIds: string[],
  values: CustomFieldValues
): Promise<number> {
  const tableName = ENTITY_TABLE_MAP[entityType];
  const idColumn = ENTITY_ID_COLUMN_MAP[entityType];

  // Validate values against definitions
  const validationResult = await validateCustomFieldValues(supabase, entityType, values);
  if (!validationResult.is_valid) {
    throw new Error(
      `Validation errors: ${validationResult.errors.map(e => e.message).join(', ')}`
    );
  }

  let updatedCount = 0;

  // Update in batches
  const batchSize = 50;
  for (let i = 0; i < entityIds.length; i += batchSize) {
    const batch = entityIds.slice(i, i + batchSize);

    // For each entity, merge existing values with new values
    for (const entityId of batch) {
      const existing = await getCustomFieldValues(supabase, entityType, entityId);
      const merged = { ...existing, ...values };

      const { error } = await supabase
        .from(tableName)
        .update({ custom_fields: merged })
        .eq(idColumn, entityId);

      if (!error) {
        updatedCount++;
      }
    }
  }

  return updatedCount;
}

// ============================================
// Validation
// ============================================

/**
 * Validate custom field values against definitions
 */
export async function validateCustomFieldValues(
  supabase: SupabaseClient,
  entityType: EntityType,
  values: CustomFieldValues
): Promise<FieldValidationResult> {
  const definitions = await getCustomFieldDefinitions(supabase, entityType);
  const errors: FieldValidationError[] = [];

  for (const def of definitions) {
    const value = values[def.field_key];

    // Check required fields
    if (def.is_required && (value === null || value === undefined || value === '')) {
      errors.push({
        field_key: def.field_key,
        message: `${def.field_label} is required`,
      });
      continue;
    }

    // Skip validation if value is empty and not required
    if (value === null || value === undefined || value === '') {
      continue;
    }

    // Type-specific validation
    switch (def.field_type) {
      case 'email':
        if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push({
            field_key: def.field_key,
            message: `${def.field_label} must be a valid email address`,
          });
        }
        break;

      case 'url':
        if (typeof value === 'string') {
          try {
            new URL(value);
          } catch {
            errors.push({
              field_key: def.field_key,
              message: `${def.field_label} must be a valid URL`,
            });
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          errors.push({
            field_key: def.field_key,
            message: `${def.field_label} must be a number`,
          });
        } else {
          const config = def.field_config as { min?: number; max?: number };
          if (config.min !== undefined && value < config.min) {
            errors.push({
              field_key: def.field_key,
              message: `${def.field_label} must be at least ${config.min}`,
            });
          }
          if (config.max !== undefined && value > config.max) {
            errors.push({
              field_key: def.field_key,
              message: `${def.field_label} must be at most ${config.max}`,
            });
          }
        }
        break;

      case 'enum':
        if (typeof value === 'string') {
          const config = def.field_config as { options: { value: string }[] };
          const validValues = config.options?.map(o => o.value) || [];
          if (!validValues.includes(value)) {
            errors.push({
              field_key: def.field_key,
              message: `${def.field_label} must be one of: ${validValues.join(', ')}`,
            });
          }
        }
        break;

      case 'multi_select':
        if (Array.isArray(value)) {
          const config = def.field_config as { options: { value: string }[]; maxSelections?: number };
          const validValues = config.options?.map(o => o.value) || [];
          const invalidValues = value.filter(v => !validValues.includes(v));
          if (invalidValues.length > 0) {
            errors.push({
              field_key: def.field_key,
              message: `${def.field_label} contains invalid values: ${invalidValues.join(', ')}`,
            });
          }
          if (config.maxSelections && value.length > config.maxSelections) {
            errors.push({
              field_key: def.field_key,
              message: `${def.field_label} allows at most ${config.maxSelections} selections`,
            });
          }
        }
        break;

      case 'text':
        if (typeof value === 'string') {
          const config = def.field_config as { maxLength?: number };
          if (config.maxLength && value.length > config.maxLength) {
            errors.push({
              field_key: def.field_key,
              message: `${def.field_label} must be at most ${config.maxLength} characters`,
            });
          }
        }
        break;
    }

    // Custom regex validation
    if (def.validation_regex && typeof value === 'string') {
      try {
        const regex = new RegExp(def.validation_regex);
        if (!regex.test(value)) {
          errors.push({
            field_key: def.field_key,
            message: def.validation_message || `${def.field_label} is invalid`,
          });
        }
      } catch {
        // Invalid regex - skip validation
      }
    }
  }

  return {
    is_valid: errors.length === 0,
    errors,
  };
}

// ============================================
// Query Helpers
// ============================================

/**
 * Build Supabase filter for custom field values
 */
export function buildCustomFieldFilter(
  filter: CustomFieldFilter
): { column: string; operator: string; value: unknown } {
  const column = `custom_fields->>${filter.field_key}`;

  switch (filter.operator) {
    case 'eq':
      return { column, operator: 'eq', value: filter.value };
    case 'neq':
      return { column, operator: 'neq', value: filter.value };
    case 'gt':
      return { column, operator: 'gt', value: filter.value };
    case 'gte':
      return { column, operator: 'gte', value: filter.value };
    case 'lt':
      return { column, operator: 'lt', value: filter.value };
    case 'lte':
      return { column, operator: 'lte', value: filter.value };
    case 'contains':
      return { column, operator: 'ilike', value: `%${filter.value}%` };
    case 'in':
      return { column, operator: 'in', value: filter.value };
    case 'not_in':
      return { column, operator: 'not.in', value: filter.value };
    case 'is_null':
      return { column, operator: 'is', value: null };
    case 'not_null':
      return { column, operator: 'not.is', value: null };
    default:
      return { column, operator: 'eq', value: filter.value };
  }
}

// ============================================
// Export
// ============================================

export const customFieldsService = {
  // Definitions
  getDefinitions: getCustomFieldDefinitions,
  getDefinitionById: getCustomFieldDefinitionById,
  getDefinitionByKey: getCustomFieldDefinitionByKey,
  createDefinition: createCustomFieldDefinition,
  updateDefinition: updateCustomFieldDefinition,
  deleteDefinition: deleteCustomFieldDefinition,
  reorderDefinitions: reorderCustomFieldDefinitions,

  // Values
  getValues: getCustomFieldValues,
  updateValues: updateCustomFieldValues,
  bulkUpdateValues: bulkUpdateCustomFieldValues,

  // Validation
  validateValues: validateCustomFieldValues,

  // Query helpers
  buildFilter: buildCustomFieldFilter,
};

export default customFieldsService;
