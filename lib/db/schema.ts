/**
 * Database Schema Registry
 * Central source of truth for all table names, ID columns, and column mappings.
 *
 * IMPORTANT: When the database schema changes, update this file ONLY.
 * All action modules and queries reference this file.
 */

// ============ TABLE NAMES ============
export const TABLES = {
  // Core trial tables
  ORGANIZATIONS: 'trial_organizations',
  USERS: 'trial_users',
  TIMELINE_EVENTS: 'trial_timeline_events',

  // Organization-related tables
  DEAL_TRACKING: 'org_deal_tracking',
  ACTIVITY_NOTES: 'org_activity_notes',
  PRODUCT_ROADMAP: 'org_product_roadmap',

  // Support tables
  TICKETS: 'tickets',
  FEATURE_REQUESTS: 'feature_requests',

  // System tables
  ACCOUNT_MANAGERS: 'account_managers',
  ENTITY_ALIASES: 'entity_aliases',
  COMMAND_UNDO_LOG: 'command_undo_log',

  // Additional tables
  TICKET_COMMENTS: 'ticket_comments',
  TICKET_LINKS: 'ticket_links',
  TICKET_WATCHERS: 'ticket_watchers',
  TICKET_ACTIVITIES: 'ticket_activities',
  NOTIFICATIONS: 'notifications',
  USER_PROFILES: 'user_profiles',
  USER_ACTIVITY_LOG: 'user_activity_log',
  IMPORT_BATCHES: 'import_batches',
  DEMO_EVENTS: 'demo_events',
  MEETING_NOTES: 'meeting_notes',
  FOLLOWUPS: 'follow_ups',
} as const;

// Type for table names
export type TableName = typeof TABLES[keyof typeof TABLES];

// ============ ID COLUMNS ============
// Maps each table to its primary key column name
export const ID_COLUMNS: Record<TableName, string> = {
  [TABLES.ORGANIZATIONS]: 'org_id',
  [TABLES.USERS]: 'user_id',
  [TABLES.TIMELINE_EVENTS]: 'id',
  [TABLES.DEAL_TRACKING]: 'id',
  [TABLES.ACTIVITY_NOTES]: 'note_id',
  [TABLES.PRODUCT_ROADMAP]: 'id',
  [TABLES.TICKETS]: 'id',
  [TABLES.FEATURE_REQUESTS]: 'id',
  [TABLES.ACCOUNT_MANAGERS]: 'id',
  [TABLES.ENTITY_ALIASES]: 'id',
  [TABLES.COMMAND_UNDO_LOG]: 'id',
  [TABLES.TICKET_COMMENTS]: 'id',
  [TABLES.TICKET_LINKS]: 'id',
  [TABLES.TICKET_WATCHERS]: 'id',
  [TABLES.TICKET_ACTIVITIES]: 'id',
  [TABLES.NOTIFICATIONS]: 'id',
  [TABLES.USER_PROFILES]: 'user_id',
  [TABLES.USER_ACTIVITY_LOG]: 'activity_id',
  [TABLES.IMPORT_BATCHES]: 'import_id',
  [TABLES.DEMO_EVENTS]: 'demo_id',
  [TABLES.MEETING_NOTES]: 'meeting_id',
  [TABLES.FOLLOWUPS]: 'followup_id',
};

// ============ COLUMN SELECTIONS ============
// Pre-defined column selections for common queries
export const COLUMNS = {
  // Organization columns
  ORG_BASIC: 'org_id, org_name, org_domain, org_url',
  ORG_STAGE: 'org_lifecycle_stage, trial_status',
  ORG_ACCOUNT_MANAGER: 'account_manager_id',
  ORG_FULL: '*',

  // User columns
  USER_BASIC: 'user_id, name, email, org_id',
  USER_ACTIVITY: 'last_login_date, last_login_at, queries_executed',
  USER_FULL: '*',

  // Account manager columns
  ACCOUNT_MANAGER_BASIC: 'id, full_name',

  // Entity alias columns
  ALIAS_TARGET: 'target_id, target_name',

  // Generic
  ID_ONLY: 'id',
  ALL: '*',
} as const;

// ============ HELPER FUNCTIONS ============

/**
 * Get the ID column for a given table
 * @param table - Table name (use TABLES constant)
 * @returns The primary key column name
 */
export function getIdColumn(table: TableName | string): string {
  return ID_COLUMNS[table as TableName] || 'id';
}

/**
 * Type-safe helper to ensure table name is valid
 */
export function isValidTable(table: string): table is TableName {
  return Object.values(TABLES).includes(table as TableName);
}

/**
 * Get table display name for error messages
 */
export function getTableDisplayName(table: TableName): string {
  const displayNames: Record<TableName, string> = {
    [TABLES.ORGANIZATIONS]: 'Organization',
    [TABLES.USERS]: 'User',
    [TABLES.TIMELINE_EVENTS]: 'Timeline Event',
    [TABLES.DEAL_TRACKING]: 'Deal',
    [TABLES.ACTIVITY_NOTES]: 'Note',
    [TABLES.PRODUCT_ROADMAP]: 'Roadmap Item',
    [TABLES.TICKETS]: 'Ticket',
    [TABLES.FEATURE_REQUESTS]: 'Feature Request',
    [TABLES.ACCOUNT_MANAGERS]: 'Account Manager',
    [TABLES.ENTITY_ALIASES]: 'Entity Alias',
    [TABLES.COMMAND_UNDO_LOG]: 'Undo Record',
    [TABLES.TICKET_COMMENTS]: 'Comment',
    [TABLES.TICKET_LINKS]: 'Ticket Link',
    [TABLES.TICKET_WATCHERS]: 'Watcher',
    [TABLES.TICKET_ACTIVITIES]: 'Activity',
    [TABLES.NOTIFICATIONS]: 'Notification',
    [TABLES.USER_PROFILES]: 'User Profile',
    [TABLES.USER_ACTIVITY_LOG]: 'Activity Log',
    [TABLES.IMPORT_BATCHES]: 'Import Batch',
    [TABLES.DEMO_EVENTS]: 'Demo Event',
    [TABLES.MEETING_NOTES]: 'Meeting Note',
    [TABLES.FOLLOWUPS]: 'Follow-up',
  };
  return displayNames[table] || table;
}

// ============ COLUMN MAPPINGS ============
// Detailed column definitions for each entity (camelCase -> snake_case)

export const ORG_COLUMNS = {
  id: 'org_id',
  name: 'org_name',
  domain: 'org_domain',
  url: 'org_url',
  lifecycleStage: 'org_lifecycle_stage',
  trialStatus: 'trial_status',
  trialStartDate: 'trial_start_date',
  trialEndDate: 'trial_end_date',
  accountManagerId: 'account_manager_id',
  teamSize: 'team_size',
  contractValue: 'contract_value',
  description: 'description',
  parentCompany: 'parent_company',
  lastActivityAt: 'last_activity_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

export const USER_COLUMNS = {
  id: 'user_id',
  orgId: 'org_id',
  email: 'email',
  name: 'name',
  fullName: 'full_name',
  designation: 'designation',
  phone: 'phone',
  currentStage: 'current_stage',
  lastLoginDate: 'last_login_date',
  lastLoginAt: 'last_login_at',
  queriesExecuted: 'queries_executed',
  createdAt: 'created_at',
} as const;

export const TIMELINE_EVENT_COLUMNS = {
  id: 'id',
  orgId: 'org_id',
  userId: 'user_id',
  eventType: 'event_type',
  eventCategory: 'event_category',
  title: 'title',
  description: 'description',
  eventTimestamp: 'event_timestamp',
  loggedBy: 'logged_by',
  sentiment: 'sentiment',
  severity: 'severity',
  createdAt: 'created_at',
} as const;

export const DEAL_COLUMNS = {
  id: 'id',
  orgId: 'org_id',
  dealValue: 'deal_value',
  dealStatus: 'deal_status',
  statusUpdatedAt: 'status_updated_at',
  statusUpdatedBy: 'status_updated_by',
  notes: 'notes',
} as const;

export const NOTE_COLUMNS = {
  id: 'note_id',
  orgId: 'org_id',
  userId: 'trial_user_id',
  noteCategory: 'note_category',
  noteText: 'note_text',
  loggedBy: 'logged_by',
  linkedRoadmapId: 'linked_roadmap_id',
  mentions: 'mentions',
  createdAt: 'created_at',
} as const;

export const TICKET_COLUMNS = {
  id: 'id',
  orgId: 'org_id',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  category: 'category',
  createdBy: 'created_by',
  assignedTo: 'assigned_to',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

export const FEATURE_REQUEST_COLUMNS = {
  id: 'id',
  orgId: 'org_id',
  title: 'title',
  description: 'description',
  useCase: 'use_case',
  priority: 'priority',
  status: 'status',
  votes: 'votes',
  createdAt: 'created_at',
} as const;

export const ROADMAP_COLUMNS = {
  id: 'id',
  orgId: 'org_id',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  targetDate: 'target_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

export const UNDO_LOG_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  commandText: 'command_text',
  changes: 'changes',
  executedAt: 'executed_at',
  expiresAt: 'expires_at',
  undone: 'undone',
} as const;
