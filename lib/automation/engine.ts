/**
 * Automation Engine
 * Evaluates conditions and executes actions
 */

import type {
  ConditionGroup,
  Condition,
  TextCondition,
  NumberCondition,
  DateCondition,
  EnumCondition,
  BooleanCondition,
  AutomationAction,
  ActionType,
} from './types';

// ============================================
// Condition Evaluation
// ============================================

/**
 * Evaluate a condition group against entity data
 */
export function evaluateConditions(
  conditionGroup: ConditionGroup,
  entityData: Record<string, unknown>
): boolean {
  const { logic, conditions } = conditionGroup;

  if (conditions.length === 0) {
    return true; // No conditions = always match
  }

  if (logic === 'AND') {
    return conditions.every((condition) => evaluateCondition(condition, entityData));
  } else {
    return conditions.some((condition) => evaluateCondition(condition, entityData));
  }
}

/**
 * Evaluate a single condition
 */
export function evaluateCondition(
  condition: Condition,
  entityData: Record<string, unknown>
): boolean {
  const value = entityData[condition.field];

  switch (condition.fieldType) {
    case 'text':
      return evaluateTextCondition(condition, value);
    case 'number':
      return evaluateNumberCondition(condition, value);
    case 'date':
      return evaluateDateCondition(condition, value);
    case 'enum':
      return evaluateEnumCondition(condition, value);
    case 'boolean':
      return evaluateBooleanCondition(condition, value);
    default:
      return false;
  }
}

function evaluateTextCondition(condition: TextCondition, value: unknown): boolean {
  const strValue = value != null ? String(value).toLowerCase() : '';
  const condValue = condition.value?.toLowerCase() || '';

  switch (condition.operator) {
    case 'equals':
      return strValue === condValue;
    case 'not_equals':
      return strValue !== condValue;
    case 'contains':
      return strValue.includes(condValue);
    case 'not_contains':
      return !strValue.includes(condValue);
    case 'starts_with':
      return strValue.startsWith(condValue);
    case 'ends_with':
      return strValue.endsWith(condValue);
    case 'is_empty':
      return !value || strValue === '';
    case 'is_not_empty':
      return !!value && strValue !== '';
    default:
      return false;
  }
}

function evaluateNumberCondition(condition: NumberCondition, value: unknown): boolean {
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));

  if (isNaN(numValue)) {
    return false;
  }

  switch (condition.operator) {
    case 'equals':
      return numValue === condition.value;
    case 'not_equals':
      return numValue !== condition.value;
    case 'greater_than':
      return typeof condition.value === 'number' && numValue > condition.value;
    case 'greater_than_or_equals':
      return typeof condition.value === 'number' && numValue >= condition.value;
    case 'less_than':
      return typeof condition.value === 'number' && numValue < condition.value;
    case 'less_than_or_equals':
      return typeof condition.value === 'number' && numValue <= condition.value;
    case 'between':
      if (Array.isArray(condition.value) && condition.value.length === 2) {
        return numValue >= condition.value[0] && numValue <= condition.value[1];
      }
      return false;
    default:
      return false;
  }
}

function evaluateDateCondition(condition: DateCondition, value: unknown): boolean {
  const dateValue = value ? new Date(String(value)) : null;
  const now = new Date();

  switch (condition.operator) {
    case 'equals':
      if (!dateValue || typeof condition.value !== 'string') return false;
      return dateValue.toDateString() === new Date(condition.value).toDateString();

    case 'before':
      if (!dateValue || typeof condition.value !== 'string') return false;
      return dateValue < new Date(condition.value);

    case 'after':
      if (!dateValue || typeof condition.value !== 'string') return false;
      return dateValue > new Date(condition.value);

    case 'between':
      if (!dateValue || !Array.isArray(condition.value)) return false;
      const [start, end] = condition.value;
      return dateValue >= new Date(start) && dateValue <= new Date(end);

    case 'in_last_n_days':
      if (!dateValue || typeof condition.value !== 'number') return false;
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - condition.value);
      return dateValue >= daysAgo && dateValue <= now;

    case 'in_next_n_days':
      if (!dateValue || typeof condition.value !== 'number') return false;
      const daysAhead = new Date();
      daysAhead.setDate(daysAhead.getDate() + condition.value);
      return dateValue >= now && dateValue <= daysAhead;

    case 'is_today':
      if (!dateValue) return false;
      return dateValue.toDateString() === now.toDateString();

    case 'is_empty':
      return !dateValue || isNaN(dateValue.getTime());

    case 'is_not_empty':
      return !!dateValue && !isNaN(dateValue.getTime());

    default:
      return false;
  }
}

function evaluateEnumCondition(condition: EnumCondition, value: unknown): boolean {
  const strValue = value != null ? String(value) : '';

  switch (condition.operator) {
    case 'equals':
      return strValue === condition.value;
    case 'not_equals':
      return strValue !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(strValue);
    case 'not_in':
      return Array.isArray(condition.value) && !condition.value.includes(strValue);
    default:
      return false;
  }
}

function evaluateBooleanCondition(condition: BooleanCondition, value: unknown): boolean {
  const boolValue = Boolean(value);
  return boolValue === condition.value;
}

// ============================================
// Template Processing
// ============================================

/**
 * Process a template string with entity data
 * Supports {{field_name}} syntax
 */
export function processTemplate(
  template: string,
  entityData: Record<string, unknown>,
  extraContext?: Record<string, unknown>
): string {
  const context = { ...entityData, ...extraContext };

  return template.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
    const value = context[fieldName];
    if (value === null || value === undefined) {
      return '';
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return String(value);
  });
}

// ============================================
// Action Execution
// ============================================

export interface ActionResult {
  action_id: string;
  action_type: ActionType;
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Execute a single action
 */
export async function executeAction(
  action: AutomationAction,
  entityData: Record<string, unknown>,
  context: {
    entityType: string;
    entityId: string;
    // Add functions for different action types
    sendNotification?: (config: unknown) => Promise<void>;
    sendEmail?: (config: unknown) => Promise<void>;
    sendTeamsMessage?: (webhookUrl: string, message: string) => Promise<void>;
    updateField?: (field: string, value: unknown) => Promise<void>;
    createTicket?: (config: unknown) => Promise<void>;
    addTimelineEvent?: (config: unknown) => Promise<void>;
    assignUser?: (userId: string) => Promise<void>;
  }
): Promise<ActionResult> {
  const result: ActionResult = {
    action_id: action.id,
    action_type: action.type,
    success: false,
  };

  try {
    switch (action.type) {
      case 'send_notification': {
        const config = action.config as {
          message_template: string;
          subject?: string;
          recipients: string;
          specific_user_ids?: string[];
        };
        const message = processTemplate(config.message_template, entityData);
        const subject = config.subject ? processTemplate(config.subject, entityData) : undefined;

        if (context.sendNotification) {
          await context.sendNotification({
            ...config,
            message,
            subject,
          });
        }
        result.success = true;
        result.result = { message };
        break;
      }

      case 'send_email': {
        const config = action.config as {
          subject_template: string;
          body_template: string;
          recipients: string;
          specific_emails?: string[];
        };
        const subject = processTemplate(config.subject_template, entityData);
        const body = processTemplate(config.body_template, entityData);

        if (context.sendEmail) {
          await context.sendEmail({
            ...config,
            subject,
            body,
          });
        }
        result.success = true;
        result.result = { subject };
        break;
      }

      case 'send_teams_message': {
        const config = action.config as {
          webhook_url: string;
          message_template: string;
          include_link?: boolean;
        };
        const message = processTemplate(config.message_template, entityData);

        if (context.sendTeamsMessage) {
          await context.sendTeamsMessage(config.webhook_url, message);
        }
        result.success = true;
        result.result = { message };
        break;
      }

      case 'update_field': {
        const config = action.config as {
          field: string;
          value: unknown;
        };

        if (context.updateField) {
          await context.updateField(config.field, config.value);
        }
        result.success = true;
        result.result = { field: config.field, value: config.value };
        break;
      }

      case 'create_ticket': {
        const config = action.config as {
          title_template: string;
          description_template: string;
          priority: string;
          assign_to: string;
          specific_user_id?: string;
          category?: string;
        };
        const title = processTemplate(config.title_template, entityData);
        const description = processTemplate(config.description_template, entityData);

        if (context.createTicket) {
          await context.createTicket({
            ...config,
            title,
            description,
          });
        }
        result.success = true;
        result.result = { title };
        break;
      }

      case 'add_timeline_event': {
        const config = action.config as {
          event_type: string;
          description_template: string;
        };
        const description = processTemplate(config.description_template, entityData);

        if (context.addTimelineEvent) {
          await context.addTimelineEvent({
            event_type: config.event_type,
            description,
          });
        }
        result.success = true;
        result.result = { event_type: config.event_type, description };
        break;
      }

      case 'assign_user': {
        const config = action.config as {
          strategy: string;
          user_id?: string;
        };

        if (context.assignUser && config.user_id) {
          await context.assignUser(config.user_id);
        }
        result.success = true;
        result.result = { user_id: config.user_id };
        break;
      }

      default:
        result.error = `Unknown action type: ${action.type}`;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

/**
 * Execute all actions for a rule
 */
export async function executeActions(
  actions: AutomationAction[],
  entityData: Record<string, unknown>,
  context: Parameters<typeof executeAction>[2]
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action, entityData, context);
    results.push(result);

    // Stop on error (fail-fast behavior)
    if (!result.success) {
      break;
    }
  }

  return results;
}

// ============================================
// Export
// ============================================

export const automationEngine = {
  evaluateConditions,
  evaluateCondition,
  processTemplate,
  executeAction,
  executeActions,
};

export default automationEngine;
