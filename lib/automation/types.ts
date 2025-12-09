/**
 * Automation System Types
 * Visual workflow automation for alerts and actions
 */

// ============================================
// Entity Types
// ============================================

export type AutomationEntityType = 'trial_organizations' | 'trial_users' | 'tickets';

// ============================================
// Trigger Types
// ============================================

export type TriggerType = 'event' | 'schedule';

export type TriggerEvent =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'field_changed'
  | 'status_changed'
  | 'trial_expired'
  | 'trial_expiring_soon'
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_resolved';

// ============================================
// Condition Types
// ============================================

export type ConditionLogic = 'AND' | 'OR';

export type TextOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty';

export type NumberOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_or_equals'
  | 'less_than'
  | 'less_than_or_equals'
  | 'between';

export type DateOperator =
  | 'equals'
  | 'before'
  | 'after'
  | 'between'
  | 'in_last_n_days'
  | 'in_next_n_days'
  | 'is_today'
  | 'is_empty'
  | 'is_not_empty';

export type EnumOperator = 'equals' | 'not_equals' | 'in' | 'not_in';

export type BooleanOperator = 'equals';

export type ConditionOperator =
  | TextOperator
  | NumberOperator
  | DateOperator
  | EnumOperator
  | BooleanOperator;

export interface BaseCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
}

export interface TextCondition extends BaseCondition {
  fieldType: 'text';
  operator: TextOperator;
  value?: string;
}

export interface NumberCondition extends BaseCondition {
  fieldType: 'number';
  operator: NumberOperator;
  value?: number | [number, number]; // [min, max] for 'between'
}

export interface DateCondition extends BaseCondition {
  fieldType: 'date';
  operator: DateOperator;
  value?: string | number | [string, string]; // date string, days count, or [start, end]
}

export interface EnumCondition extends BaseCondition {
  fieldType: 'enum';
  operator: EnumOperator;
  value?: string | string[];
}

export interface BooleanCondition extends BaseCondition {
  fieldType: 'boolean';
  operator: BooleanOperator;
  value?: boolean;
}

export type Condition =
  | TextCondition
  | NumberCondition
  | DateCondition
  | EnumCondition
  | BooleanCondition;

export interface ConditionGroup {
  logic: ConditionLogic;
  conditions: Condition[];
}

// ============================================
// Action Types
// ============================================

export type ActionType =
  | 'send_notification'
  | 'send_email'
  | 'send_teams_message'
  | 'update_field'
  | 'create_ticket'
  | 'add_timeline_event'
  | 'assign_user';

export type NotificationChannel = 'in_app' | 'email' | 'teams';

export type RecipientType =
  | 'owner'
  | 'assignee'
  | 'account_manager'
  | 'specific_users'
  | 'admins'
  | 'all_team';

export interface SendNotificationConfig {
  channel: NotificationChannel;
  recipients: RecipientType;
  specific_user_ids?: string[];
  message_template: string;
  subject?: string;
}

export interface SendEmailConfig {
  recipients: RecipientType;
  specific_emails?: string[];
  subject_template: string;
  body_template: string;
}

export interface SendTeamsMessageConfig {
  webhook_url: string;
  message_template: string;
  include_link?: boolean;
}

export interface UpdateFieldConfig {
  field: string;
  value: string | number | boolean | null;
}

export interface CreateTicketConfig {
  title_template: string;
  description_template: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assign_to: 'owner' | 'account_manager' | 'specific_user' | 'round_robin';
  specific_user_id?: string;
  category?: string;
}

export interface AddTimelineEventConfig {
  event_type: string;
  description_template: string;
}

export interface AssignUserConfig {
  strategy: 'specific_user' | 'round_robin' | 'least_busy';
  user_id?: string;
}

export type ActionConfig =
  | SendNotificationConfig
  | SendEmailConfig
  | SendTeamsMessageConfig
  | UpdateFieldConfig
  | CreateTicketConfig
  | AddTimelineEventConfig
  | AssignUserConfig;

export interface AutomationAction {
  id: string;
  type: ActionType;
  config: ActionConfig;
}

// ============================================
// Rule Types
// ============================================

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  entity_type: AutomationEntityType;
  is_active: boolean;
  trigger_type: TriggerType;
  trigger_event: TriggerEvent | null;
  schedule_cron: string | null;
  conditions: ConditionGroup;
  actions: AutomationAction[];
  max_executions_per_entity: number | null;
  cooldown_minutes: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  last_executed_at: string | null;
  execution_count: number;
}

export interface CreateAutomationRule {
  name: string;
  description?: string;
  entity_type: AutomationEntityType;
  is_active?: boolean;
  trigger_type: TriggerType;
  trigger_event?: TriggerEvent;
  schedule_cron?: string;
  conditions: ConditionGroup;
  actions: AutomationAction[];
  max_executions_per_entity?: number;
  cooldown_minutes?: number;
}

export interface UpdateAutomationRule {
  name?: string;
  description?: string;
  is_active?: boolean;
  trigger_type?: TriggerType;
  trigger_event?: TriggerEvent;
  schedule_cron?: string;
  conditions?: ConditionGroup;
  actions?: AutomationAction[];
  max_executions_per_entity?: number;
  cooldown_minutes?: number;
}

// ============================================
// Execution Types
// ============================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AutomationExecution {
  id: string;
  rule_id: string;
  entity_type: string;
  entity_id: string;
  status: ExecutionStatus;
  actions_executed: {
    action_id: string;
    action_type: ActionType;
    success: boolean;
    result?: unknown;
    error?: string;
  }[];
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  entity_snapshot: Record<string, unknown> | null;
}

// ============================================
// Field Metadata (for condition builder)
// ============================================

export interface FieldMetadata {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'enum' | 'boolean';
  options?: { value: string; label: string }[]; // For enum fields
  isCustomField?: boolean;
}

// Pre-defined fields for each entity type
export const ENTITY_FIELDS: Record<AutomationEntityType, FieldMetadata[]> = {
  trial_organizations: [
    { key: 'org_name', label: 'Organization Name', type: 'text' },
    { key: 'org_domain', label: 'Domain', type: 'text' },
    { key: 'account_manager', label: 'Account Manager', type: 'text' },
    {
      key: 'org_lifecycle_stage',
      label: 'Lifecycle Stage',
      type: 'enum',
      options: [
        { value: 'prospect', label: 'Prospect' },
        { value: 'trial_pending', label: 'Trial Pending' },
        { value: 'trial_active', label: 'Trial Active' },
        { value: 'trial_expired', label: 'Trial Expired' },
        { value: 'customer', label: 'Customer' },
        { value: 'lost', label: 'Lost' },
      ],
    },
    {
      key: 'trial_status',
      label: 'Trial Status',
      type: 'enum',
      options: [
        { value: 'requested', label: 'Requested' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'expired', label: 'Expired' },
        { value: 'converted', label: 'Converted' },
      ],
    },
    { key: 'trial_end_date', label: 'Trial End Date', type: 'date' },
    { key: 'total_users', label: 'Total Users', type: 'number' },
    { key: 'active_users', label: 'Active Users', type: 'number' },
    {
      key: 'customer_health_status',
      label: 'Health Status',
      type: 'enum',
      options: [
        { value: 'onboarding', label: 'Onboarding' },
        { value: 'healthy', label: 'Healthy' },
        { value: 'at_risk', label: 'At Risk' },
        { value: 'churning', label: 'Churning' },
      ],
    },
    { key: 'last_engagement_date', label: 'Last Engagement', type: 'date' },
  ],
  trial_users: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'job_title', label: 'Job Title', type: 'text' },
    {
      key: 'role',
      label: 'Role',
      type: 'enum',
      options: [
        { value: 'Champion', label: 'Champion' },
        { value: 'Evaluator', label: 'Evaluator' },
        { value: 'Decision Maker', label: 'Decision Maker' },
        { value: 'End User', label: 'End User' },
      ],
    },
    {
      key: 'engagement_level',
      label: 'Engagement Level',
      type: 'enum',
      options: [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    { key: 'last_active', label: 'Last Active', type: 'date' },
    { key: 'reports_generated', label: 'Reports Generated', type: 'number' },
    { key: 'is_primary_contact', label: 'Primary Contact', type: 'boolean' },
  ],
  tickets: [
    { key: 'title', label: 'Title', type: 'text' },
    {
      key: 'status',
      label: 'Status',
      type: 'enum',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'pending', label: 'Pending' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' },
      ],
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'enum',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' },
      ],
    },
    {
      key: 'category',
      label: 'Category',
      type: 'enum',
      options: [
        { value: 'bug', label: 'Bug' },
        { value: 'feature_request', label: 'Feature Request' },
        { value: 'question', label: 'Question' },
        { value: 'support', label: 'Support' },
      ],
    },
    { key: 'assigned_to', label: 'Assigned To', type: 'text' },
    { key: 'created_at', label: 'Created At', type: 'date' },
    { key: 'updated_at', label: 'Updated At', type: 'date' },
  ],
};

// Available trigger events per entity type
export const ENTITY_EVENTS: Record<AutomationEntityType, TriggerEvent[]> = {
  trial_organizations: [
    'created',
    'updated',
    'field_changed',
    'status_changed',
    'trial_expired',
    'trial_expiring_soon',
  ],
  trial_users: ['created', 'updated', 'field_changed'],
  tickets: [
    'created',
    'updated',
    'ticket_created',
    'ticket_assigned',
    'ticket_resolved',
    'field_changed',
    'status_changed',
  ],
};

// Human-readable labels
export const TRIGGER_EVENT_LABELS: Record<TriggerEvent, string> = {
  created: 'Record Created',
  updated: 'Record Updated',
  deleted: 'Record Deleted',
  field_changed: 'Field Changed',
  status_changed: 'Status Changed',
  trial_expired: 'Trial Expired',
  trial_expiring_soon: 'Trial Expiring Soon',
  ticket_created: 'Ticket Created',
  ticket_assigned: 'Ticket Assigned',
  ticket_resolved: 'Ticket Resolved',
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  send_notification: 'Send Notification',
  send_email: 'Send Email',
  send_teams_message: 'Send Teams Message',
  update_field: 'Update Field',
  create_ticket: 'Create Ticket',
  add_timeline_event: 'Add Timeline Event',
  assign_user: 'Assign User',
};

export const ENTITY_TYPE_LABELS: Record<AutomationEntityType, string> = {
  trial_organizations: 'Organizations',
  trial_users: 'Users',
  tickets: 'Tickets',
};
