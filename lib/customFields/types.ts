/**
 * Custom Fields Type Definitions
 * Types for admin-defined custom fields on entities
 */

// ============================================
// Field Type Definitions
// ============================================

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'multi_select'
  | 'url'
  | 'email';

export type EntityType =
  | 'trial_organizations'
  | 'trial_users'
  | 'tickets'
  | 'trial_timeline_events'
  | 'user_activity_log';

// ============================================
// Field Configuration Types
// ============================================

export interface EnumOption {
  value: string;
  label: string;
  color?: string;
}

export interface TextFieldConfig {
  maxLength?: number;
  placeholder?: string;
  multiline?: boolean;
}

export interface NumberFieldConfig {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
}

export interface DateFieldConfig {
  includeTime?: boolean;
  minDate?: string;
  maxDate?: string;
}

export interface EnumFieldConfig {
  options: EnumOption[];
}

export interface MultiSelectFieldConfig {
  options: EnumOption[];
  maxSelections?: number;
}

export interface UrlFieldConfig {
  placeholder?: string;
}

export interface EmailFieldConfig {
  placeholder?: string;
}

export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | DateFieldConfig
  | EnumFieldConfig
  | MultiSelectFieldConfig
  | UrlFieldConfig
  | EmailFieldConfig;

// ============================================
// Field Definition Types
// ============================================

export interface CustomFieldDefinition {
  id: string;
  field_key: string;
  field_label: string;
  description?: string;
  entity_type: EntityType;
  field_type: CustomFieldType;
  field_config: FieldConfig;
  is_required: boolean;
  default_value?: unknown;
  validation_regex?: string;
  validation_message?: string;
  display_order: number;
  is_visible: boolean;
  show_in_list: boolean;
  show_in_detail: boolean;
  is_filterable: boolean;
  is_sortable: boolean;
  is_searchable: boolean;
  import_column_name?: string;
  export_column_name?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomFieldDefinition {
  field_key: string;
  field_label: string;
  description?: string;
  entity_type: EntityType;
  field_type: CustomFieldType;
  field_config?: FieldConfig;
  is_required?: boolean;
  default_value?: unknown;
  validation_regex?: string;
  validation_message?: string;
  display_order?: number;
  is_visible?: boolean;
  show_in_list?: boolean;
  show_in_detail?: boolean;
  is_filterable?: boolean;
  is_sortable?: boolean;
  is_searchable?: boolean;
  import_column_name?: string;
  export_column_name?: string;
}

export interface UpdateCustomFieldDefinition {
  field_label?: string;
  description?: string;
  field_config?: FieldConfig;
  is_required?: boolean;
  default_value?: unknown;
  validation_regex?: string;
  validation_message?: string;
  display_order?: number;
  is_visible?: boolean;
  show_in_list?: boolean;
  show_in_detail?: boolean;
  is_filterable?: boolean;
  is_sortable?: boolean;
  is_searchable?: boolean;
  import_column_name?: string;
  export_column_name?: string;
}

// ============================================
// Custom Field Values
// ============================================

export type CustomFieldValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | null;

export type CustomFieldValues = Record<string, CustomFieldValue>;

// ============================================
// Validation Types
// ============================================

export interface FieldValidationError {
  field_key: string;
  message: string;
}

export interface FieldValidationResult {
  is_valid: boolean;
  errors: FieldValidationError[];
}

// ============================================
// Filter Types
// ============================================

export type FilterOperator =
  | 'eq'       // equals
  | 'neq'      // not equals
  | 'gt'       // greater than
  | 'gte'      // greater than or equal
  | 'lt'       // less than
  | 'lte'      // less than or equal
  | 'contains' // text contains
  | 'in'       // value in array
  | 'not_in'   // value not in array
  | 'is_null'  // is null
  | 'not_null'; // is not null

export interface CustomFieldFilter {
  field_key: string;
  operator: FilterOperator;
  value: CustomFieldValue | CustomFieldValue[];
}

// ============================================
// Display Labels
// ============================================

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  trial_organizations: 'Organizations',
  trial_users: 'Trial Users',
  tickets: 'Tickets',
  trial_timeline_events: 'Timeline Events',
  user_activity_log: 'User Activity',
};

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  boolean: 'Yes/No',
  date: 'Date',
  enum: 'Dropdown',
  multi_select: 'Multi-Select',
  url: 'URL',
  email: 'Email',
};

export const FIELD_TYPE_ICONS: Record<CustomFieldType, string> = {
  text: 'Type',
  number: 'Hash',
  boolean: 'ToggleLeft',
  date: 'Calendar',
  enum: 'ChevronDown',
  multi_select: 'ListChecks',
  url: 'Link',
  email: 'Mail',
};

// ============================================
// Helper Types
// ============================================

export interface CustomFieldsResponse {
  definitions: CustomFieldDefinition[];
  values: CustomFieldValues;
}

export interface BulkUpdateCustomFieldsRequest {
  entity_type: EntityType;
  entity_ids: string[];
  custom_fields: CustomFieldValues;
}
