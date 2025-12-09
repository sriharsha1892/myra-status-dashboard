/**
 * Complexity Detector
 * Determines whether a create action should be handled inline or via form
 */

import type { CommandAction, ParsedCommand } from './types';
import { ACTION_SCHEMAS, type ActionSchema } from './actionSchemas';

// Complexity thresholds
const THRESHOLDS = {
  MAX_INLINE_FIELDS: 4,         // More than 4 extracted fields → form
  MIN_CONFIDENCE: 0.80,         // Below 80% confidence → form
  REQUIRED_FIELD_CONFIDENCE: 1.0, // Required fields must be certain
};

// Actions that are always simple (no form needed)
const ALWAYS_INLINE_ACTIONS: CommandAction[] = [
  'LOG_ACTIVITY',
  'ADD_NOTE',
  'UPDATE_STAGE',
];

// Actions that are always complex (always use form)
const ALWAYS_FORM_ACTIONS: CommandAction[] = [
  'BULK_UPDATE_STAGE',
  'BULK_ASSIGN_AM',
];

export type CreateFlowType = 'inline' | 'form';

export interface ComplexityResult {
  flow: CreateFlowType;
  reason: string;
  missingRequired: string[];
  extractedCount: number;
  confidence: number;
}

/**
 * Determine whether a create action should be handled inline or via form
 *
 * Returns 'inline' when:
 * - All required fields are present
 * - Confidence is high (≥80%)
 * - Not too many fields (≤4)
 *
 * Returns 'form' when:
 * - Missing required fields
 * - Low confidence (<80%)
 * - Many fields extracted (>4)
 * - Action is inherently complex
 */
export function determineCreateFlow(
  action: CommandAction,
  parsed: ParsedCommand
): ComplexityResult {
  // Always inline for simple actions
  if (ALWAYS_INLINE_ACTIONS.includes(action)) {
    return {
      flow: 'inline',
      reason: 'Simple action type',
      missingRequired: [],
      extractedCount: countExtractedFields(parsed),
      confidence: parsed.confidence,
    };
  }

  // Always form for bulk actions
  if (ALWAYS_FORM_ACTIONS.includes(action)) {
    return {
      flow: 'form',
      reason: 'Bulk action requires form',
      missingRequired: [],
      extractedCount: countExtractedFields(parsed),
      confidence: parsed.confidence,
    };
  }

  const schema = ACTION_SCHEMAS[action];
  if (!schema) {
    // Unknown action, default to form for safety
    return {
      flow: 'form',
      reason: 'Unknown action type',
      missingRequired: [],
      extractedCount: 0,
      confidence: parsed.confidence,
    };
  }

  // Check for missing required fields
  const missingRequired = getMissingRequiredFields(parsed, schema);

  // Count extracted fields
  const extractedCount = countExtractedFields(parsed);

  // Low confidence check
  if (parsed.confidence < THRESHOLDS.MIN_CONFIDENCE) {
    return {
      flow: 'form',
      reason: `Low confidence (${Math.round(parsed.confidence * 100)}%)`,
      missingRequired,
      extractedCount,
      confidence: parsed.confidence,
    };
  }

  // Missing required fields check
  if (missingRequired.length > 0) {
    return {
      flow: 'form',
      reason: `Missing required: ${missingRequired.join(', ')}`,
      missingRequired,
      extractedCount,
      confidence: parsed.confidence,
    };
  }

  // Too many fields check
  if (extractedCount > THRESHOLDS.MAX_INLINE_FIELDS) {
    return {
      flow: 'form',
      reason: `Many fields (${extractedCount}) - form for review`,
      missingRequired,
      extractedCount,
      confidence: parsed.confidence,
    };
  }

  // All checks passed - inline is fine
  return {
    flow: 'inline',
    reason: 'All required fields present with high confidence',
    missingRequired: [],
    extractedCount,
    confidence: parsed.confidence,
  };
}

/**
 * Get list of required fields that are missing from the parsed command
 */
function getMissingRequiredFields(
  parsed: ParsedCommand,
  schema: ActionSchema
): string[] {
  const missing: string[] = [];

  for (const required of schema.required) {
    let value: any;

    // Check top-level fields
    if (required === 'org_name') {
      value = parsed.org_name;
    } else if (required === 'user_name') {
      value = parsed.user_name;
    } else {
      // Check in fields object
      value = (parsed.fields as any)[required];
    }

    // Check if value is present and non-empty
    if (value === undefined || value === null || value === '') {
      missing.push(required);
    }
  }

  return missing;
}

/**
 * Count how many fields were extracted from the command
 */
function countExtractedFields(parsed: ParsedCommand): number {
  let count = 0;

  // Count top-level fields
  if (parsed.org_name) count++;
  if (parsed.user_name) count++;

  // Count fields in the fields object
  for (const [key, value] of Object.entries(parsed.fields)) {
    if (value !== undefined && value !== null && value !== '') {
      // Arrays count as 1 field
      if (Array.isArray(value)) {
        if (value.length > 0) count++;
      } else {
        count++;
      }
    }
  }

  return count;
}

/**
 * Get a user-friendly explanation of the complexity decision
 */
export function getComplexityExplanation(result: ComplexityResult): string {
  if (result.flow === 'inline') {
    return `Ready to execute: ${result.reason}`;
  }

  if (result.missingRequired.length > 0) {
    return `Need more info: ${result.missingRequired.join(', ')} required`;
  }

  return result.reason;
}

/**
 * Get form prefill data from parsed command
 */
export function getFormPrefillData(
  action: CommandAction,
  parsed: ParsedCommand
): Record<string, any> {
  const prefill: Record<string, any> = {};

  // Add top-level fields
  if (parsed.org_name) {
    prefill.org_name = parsed.org_name;
  }
  if (parsed.user_name) {
    prefill.user_name = parsed.user_name;
    prefill.name = parsed.user_name;
  }

  // Add all extracted fields
  for (const [key, value] of Object.entries(parsed.fields)) {
    if (value !== undefined && value !== null) {
      // Map field names to form field names
      const formFieldName = mapToFormFieldName(action, key);
      prefill[formFieldName] = value;
    }
  }

  return prefill;
}

/**
 * Map parser field names to form field names
 */
function mapToFormFieldName(action: CommandAction, fieldName: string): string {
  // Common mappings
  const mappings: Record<string, string> = {
    ticket_title: 'title',
    ticket_description: 'description',
    ticket_priority: 'priority',
    ticket_category: 'category',
    feature_title: 'title',
    feature_description: 'description',
    feature_priority: 'priority',
    feature_use_case: 'use_case',
    roadmap_title: 'title',
    roadmap_description: 'description',
    roadmap_status: 'status',
    roadmap_priority: 'priority',
    event_type: 'event_type',
    event_title: 'title',
    note_text: 'note_text',
    note_category: 'note_category',
    lifecycle_stage: 'lifecycle_stage',
    deal_value: 'deal_value',
    deal_status: 'deal_status',
  };

  return mappings[fieldName] || fieldName;
}

/**
 * Get the form type to open for a given action
 */
export function getFormType(action: CommandAction): string | null {
  const formTypes: Partial<Record<CommandAction, string>> = {
    CREATE_ORG: 'CreateOrganizationModal',
    CREATE_USER: 'CreateUserModal',
    CREATE_TICKET: 'CreateTicketModal',
    CREATE_FEATURE_REQUEST: 'CreateFeatureRequestModal',
    CREATE_ROADMAP_ITEM: 'CreateRoadmapItemModal',
    CREATE_TIMELINE_EVENT: 'CreateTimelineEventModal',
    UPDATE_ORG: 'EditOrganizationModal',
    UPDATE_USER: 'EditUserModal',
  };

  return formTypes[action] || null;
}

/**
 * Check if an action supports inline execution
 */
export function supportsInlineExecution(action: CommandAction): boolean {
  return !ALWAYS_FORM_ACTIONS.includes(action);
}

/**
 * Get the minimum required fields for inline execution
 */
export function getMinimumRequiredFields(action: CommandAction): string[] {
  const schema = ACTION_SCHEMAS[action];
  return schema?.required || [];
}
