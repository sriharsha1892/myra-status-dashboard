/**
 * Action Schemas - Define required and optional fields for each CommandAction
 * Used for validation and complexity detection (inline vs form flow)
 */

import type {
  CommandAction,
  ActivityType,
  DealStatus,
  LifecycleStage,
  TrialStatus,
  NoteCategory,
  TicketPriority,
  TicketCategory,
  FeatureRequestPriority,
  RoadmapItemStatus,
  RoadmapItemPriority,
  TimelineEventType,
  TimelineEventCategory,
  TimelineEventSentiment,
  DomainCategory,
  ProspectStage,
  ProspectSource,
  OutreachType,
  OutreachDirection,
  ResponseStatus,
  DealPipelineStage,
  DealOutcome,
} from './types';

// Field definition for schema
export interface FieldDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'enum' | 'array';
  enumValues?: readonly string[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  description: string;
}

// Action schema definition
export interface ActionSchema {
  action: CommandAction;
  description: string;
  required: string[];           // Required field names
  optional: string[];           // Optional field names
  fields: Record<string, FieldDefinition>;
  requiresOrg: boolean;         // Does this action need an org context?
  requiresUser: boolean;        // Does this action need a user context?
  targetTable: string;          // Primary database table
  createsTimeline: boolean;     // Should a timeline event be created?
}

// All action schemas
export const ACTION_SCHEMAS: Record<CommandAction, ActionSchema> = {
  // ============ EXISTING ACTIONS ============

  LOG_ACTIVITY: {
    action: 'LOG_ACTIVITY',
    description: 'Log user activity (query, login, demo, call, etc.)',
    required: ['activity_type'],
    optional: ['date', 'details', 'user_name'],
    fields: {
      activity_type: {
        type: 'enum',
        enumValues: ['query', 'login', 'demo', 'call', 'email', 'meeting', 'feature_usage', 'feedback', 'support_request'] as const,
        description: 'Type of activity',
      },
      date: { type: 'date', description: 'When the activity occurred' },
      details: { type: 'string', maxLength: 1000, description: 'Additional details' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_timeline_events',
    createsTimeline: true,
  },

  UPDATE_DEAL: {
    action: 'UPDATE_DEAL',
    description: 'Update deal value or status',
    required: [],
    optional: ['deal_value', 'deal_status', 'details'],
    fields: {
      deal_value: { type: 'number', min: 0, description: 'Deal value in dollars' },
      deal_status: {
        type: 'enum',
        enumValues: ['prospect', 'negotiating', 'won', 'lost', 'deferred'] as const,
        description: 'Current deal status',
      },
      details: { type: 'string', maxLength: 500, description: 'Notes about the deal' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'org_deal_tracking',
    createsTimeline: false,
  },

  UPDATE_STAGE: {
    action: 'UPDATE_STAGE',
    description: 'Update organization lifecycle stage',
    required: ['lifecycle_stage'],
    optional: ['trial_status', 'details'],
    fields: {
      lifecycle_stage: {
        type: 'enum',
        enumValues: ['prospect', 'trial_pending', 'trial_active', 'trial_expired', 'customer', 'lost'] as const,
        description: 'Organization lifecycle stage',
      },
      trial_status: {
        type: 'enum',
        enumValues: ['requested', 'approved', 'in_progress', 'active', 'extended', 'completed', 'closed'] as const,
        description: 'Trial status within the stage',
      },
      details: { type: 'string', maxLength: 500, description: 'Reason for stage change' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  ADD_NOTE: {
    action: 'ADD_NOTE',
    description: 'Add a note to an organization',
    required: ['note_text'],
    optional: ['note_category'],
    fields: {
      note_text: { type: 'string', minLength: 1, maxLength: 2000, description: 'Note content' },
      note_category: {
        type: 'enum',
        enumValues: ['first_login', 'question', 'issue', 'success', 'data_quality', 'feature_request', 'other'] as const,
        description: 'Note category',
      },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'org_activity_notes',
    createsTimeline: false,
  },

  // ============ CREATE ACTIONS ============

  CREATE_ORG: {
    action: 'CREATE_ORG',
    description: 'Create a new trial organization',
    required: ['org_name'],
    optional: ['website', 'domain_category', 'team_size', 'contract_value', 'contacts', 'description'],
    fields: {
      org_name: { type: 'string', minLength: 2, maxLength: 200, description: 'Organization name' },
      website: { type: 'url', description: 'Company website' },
      domain_category: {
        type: 'enum',
        enumValues: ['AAD', 'AF&B', 'E&C', 'HC', 'NEO', 'TMT'] as const,
        description: 'Industry domain category',
      },
      team_size: { type: 'number', min: 1, max: 100000, description: 'Number of users/team size' },
      contract_value: { type: 'number', min: 0, description: 'Expected contract value' },
      contacts: { type: 'array', description: 'Primary contacts (name, email, role)' },
      description: { type: 'string', maxLength: 1000, description: 'Organization description' },
    },
    requiresOrg: false,  // Creating new org
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  CREATE_USER: {
    action: 'CREATE_USER',
    description: 'Add a new contact/user',
    required: ['email'],
    optional: ['user_name', 'role', 'phone', 'designation'],
    fields: {
      email: { type: 'email', description: 'User email address' },
      user_name: { type: 'string', minLength: 2, maxLength: 100, description: 'Full name' },
      role: { type: 'string', maxLength: 100, description: 'Job title or role' },
      phone: { type: 'string', pattern: /^[\d\s\-\+\(\)]+$/, description: 'Phone number' },
      designation: { type: 'string', maxLength: 100, description: 'Designation/title' },
    },
    requiresOrg: true,   // User belongs to an org
    requiresUser: false,
    targetTable: 'trial_users',
    createsTimeline: true,
  },

  CREATE_TICKET: {
    action: 'CREATE_TICKET',
    description: 'Create a support ticket',
    required: ['ticket_title'],
    optional: ['ticket_description', 'ticket_priority', 'ticket_category'],
    fields: {
      ticket_title: { type: 'string', minLength: 5, maxLength: 200, description: 'Ticket subject/title' },
      ticket_description: { type: 'string', maxLength: 5000, description: 'Detailed description' },
      ticket_priority: {
        type: 'enum',
        enumValues: ['low', 'medium', 'high', 'critical'] as const,
        description: 'Priority level',
      },
      ticket_category: {
        type: 'enum',
        enumValues: ['bug', 'feature_request', 'question', 'integration', 'performance', 'security', 'documentation', 'other'] as const,
        description: 'Ticket category',
      },
    },
    requiresOrg: false,  // Tickets can be standalone
    requiresUser: false,
    targetTable: 'tickets',
    createsTimeline: false,
  },

  CREATE_FEATURE_REQUEST: {
    action: 'CREATE_FEATURE_REQUEST',
    description: 'Create a feature request',
    required: ['feature_title'],
    optional: ['feature_description', 'feature_use_case', 'feature_priority'],
    fields: {
      feature_title: { type: 'string', minLength: 5, maxLength: 200, description: 'Feature title' },
      feature_description: { type: 'string', maxLength: 2000, description: 'Detailed description' },
      feature_use_case: { type: 'string', maxLength: 1000, description: 'Use case explanation' },
      feature_priority: {
        type: 'enum',
        enumValues: ['low', 'medium', 'high', 'critical'] as const,
        description: 'Priority level',
      },
    },
    requiresOrg: true,   // Feature requests come from orgs
    requiresUser: false,
    targetTable: 'feature_requests',
    createsTimeline: true,
  },

  CREATE_ROADMAP_ITEM: {
    action: 'CREATE_ROADMAP_ITEM',
    description: 'Create a roadmap item',
    required: ['roadmap_title'],
    optional: ['roadmap_description', 'roadmap_status', 'roadmap_priority', 'target_date'],
    fields: {
      roadmap_title: { type: 'string', minLength: 5, maxLength: 200, description: 'Roadmap item title' },
      roadmap_description: { type: 'string', maxLength: 2000, description: 'Description' },
      roadmap_status: {
        type: 'enum',
        enumValues: ['planned', 'in_progress', 'completed', 'blocked'] as const,
        description: 'Current status',
      },
      roadmap_priority: {
        type: 'enum',
        enumValues: ['low', 'medium', 'high'] as const,
        description: 'Priority level',
      },
      target_date: { type: 'date', description: 'Target completion date' },
    },
    requiresOrg: false,  // Master roadmap items don't need org
    requiresUser: false,
    targetTable: 'org_product_roadmap',
    createsTimeline: false,
  },

  CREATE_TIMELINE_EVENT: {
    action: 'CREATE_TIMELINE_EVENT',
    description: 'Create a timeline event',
    required: ['event_type', 'event_title'],
    optional: ['event_category', 'event_sentiment', 'date', 'details'],
    fields: {
      event_type: {
        type: 'enum',
        enumValues: ['query_executed', 'user_logged_in', 'demo_conducted', 'call_completed', 'email_sent', 'meeting_held', 'feature_used', 'feedback_received', 'support_ticket_created', 'trial_started', 'trial_extended', 'trial_ended', 'stage_changed', 'note_added', 'other'] as const,
        description: 'Type of event',
      },
      event_category: {
        type: 'enum',
        enumValues: ['engagement', 'support', 'lifecycle', 'activity', 'system'] as const,
        description: 'Event category',
      },
      event_title: { type: 'string', minLength: 3, maxLength: 200, description: 'Event title' },
      event_sentiment: {
        type: 'enum',
        enumValues: ['positive', 'neutral', 'negative'] as const,
        description: 'Sentiment of the event',
      },
      date: { type: 'date', description: 'When the event occurred' },
      details: { type: 'string', maxLength: 2000, description: 'Additional details' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_timeline_events',
    createsTimeline: false, // This IS a timeline event
  },

  // ============ UPDATE ACTIONS ============

  UPDATE_ORG: {
    action: 'UPDATE_ORG',
    description: 'Update organization details',
    required: [],
    optional: ['website', 'domain_category', 'team_size', 'contract_value', 'description'],
    fields: {
      website: { type: 'url', description: 'Company website' },
      domain_category: {
        type: 'enum',
        enumValues: ['AAD', 'AF&B', 'E&C', 'HC', 'NEO', 'TMT'] as const,
        description: 'Industry domain category',
      },
      team_size: { type: 'number', min: 1, max: 100000, description: 'Number of users/team size' },
      contract_value: { type: 'number', min: 0, description: 'Expected contract value' },
      description: { type: 'string', maxLength: 1000, description: 'Organization description' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  UPDATE_USER: {
    action: 'UPDATE_USER',
    description: 'Update user/contact details',
    required: [],
    optional: ['user_name', 'role', 'phone', 'designation'],
    fields: {
      user_name: { type: 'string', minLength: 2, maxLength: 100, description: 'Full name' },
      role: { type: 'string', maxLength: 100, description: 'Job title or role' },
      phone: { type: 'string', pattern: /^[\d\s\-\+\(\)]+$/, description: 'Phone number' },
      designation: { type: 'string', maxLength: 100, description: 'Designation/title' },
    },
    requiresOrg: true,
    requiresUser: true,
    targetTable: 'trial_users',
    createsTimeline: false,
  },

  ASSIGN_ACCOUNT_MANAGER: {
    action: 'ASSIGN_ACCOUNT_MANAGER',
    description: 'Assign an account manager to an organization',
    required: ['account_manager_name'],
    optional: [],
    fields: {
      account_manager_name: { type: 'string', minLength: 2, maxLength: 100, description: 'Account manager name' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  // ============ QUICK & SALES INTELLIGENCE ACTIONS ============

  QUICK_STATUS_UPDATE: {
    action: 'QUICK_STATUS_UPDATE',
    description: 'Quick status note without stage change',
    required: [],
    optional: ['details'],
    fields: {
      details: { type: 'string', maxLength: 1000, description: 'Status note' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'org_activity_notes',
    createsTimeline: true,
  },

  SCHEDULE_FOLLOWUP: {
    action: 'SCHEDULE_FOLLOWUP',
    description: 'Schedule a follow-up reminder',
    required: ['date'],
    optional: ['details'],
    fields: {
      date: { type: 'date', description: 'Follow-up date' },
      details: { type: 'string', maxLength: 500, description: 'Follow-up notes' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'org_followups',
    createsTimeline: true,
  },

  UPDATE_STAKEHOLDER: {
    action: 'UPDATE_STAKEHOLDER',
    description: 'Update stakeholder influence level',
    required: [],
    optional: ['details'],
    fields: {
      details: { type: 'string', maxLength: 500, description: 'Stakeholder notes' },
    },
    requiresOrg: true,
    requiresUser: true,
    targetTable: 'org_stakeholders',
    createsTimeline: false,
  },

  LOG_COMPETITOR: {
    action: 'LOG_COMPETITOR',
    description: 'Log competitor interaction',
    required: [],
    optional: ['details'],
    fields: {
      details: { type: 'string', maxLength: 1000, description: 'Competitor details' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'org_competitors',
    createsTimeline: true,
  },

  TRACK_FEATURE_INTEREST: {
    action: 'TRACK_FEATURE_INTEREST',
    description: 'Track feature interest from org',
    required: [],
    optional: ['details'],
    fields: {
      details: { type: 'string', maxLength: 1000, description: 'Feature interest details' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'org_feature_interests',
    createsTimeline: true,
  },

  UPDATE_MOMENTUM: {
    action: 'UPDATE_MOMENTUM',
    description: 'Update deal momentum indicator',
    required: [],
    optional: ['details'],
    fields: {
      details: { type: 'string', maxLength: 500, description: 'Momentum notes' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'org_deal_tracking',
    createsTimeline: false,
  },

  // ============ BULK ACTIONS (Future) ============

  BULK_UPDATE_STAGE: {
    action: 'BULK_UPDATE_STAGE',
    description: 'Update stage for multiple organizations',
    required: ['lifecycle_stage'],
    optional: ['trial_status'],
    fields: {
      lifecycle_stage: {
        type: 'enum',
        enumValues: ['prospect', 'trial_pending', 'trial_active', 'trial_expired', 'customer', 'lost'] as const,
        description: 'Target lifecycle stage',
      },
      trial_status: {
        type: 'enum',
        enumValues: ['requested', 'approved', 'in_progress', 'active', 'extended', 'completed', 'closed'] as const,
        description: 'Trial status',
      },
    },
    requiresOrg: true,  // Requires multiple orgs
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  BULK_ASSIGN_AM: {
    action: 'BULK_ASSIGN_AM',
    description: 'Assign account manager to multiple organizations',
    required: ['account_manager_name'],
    optional: [],
    fields: {
      account_manager_name: { type: 'string', minLength: 2, maxLength: 100, description: 'Account manager name' },
    },
    requiresOrg: true,  // Requires multiple orgs
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  // ============ DELETE ACTIONS ============

  DELETE_ORG: {
    action: 'DELETE_ORG',
    description: 'Delete a trial organization',
    required: [],
    optional: ['confirm_name'],
    fields: {
      confirm_name: { type: 'string', description: 'Confirm org name to delete' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: false,
  },

  DELETE_USER: {
    action: 'DELETE_USER',
    description: 'Delete a user/contact',
    required: [],
    optional: ['confirm_name'],
    fields: {
      confirm_name: { type: 'string', description: 'Confirm user name to delete' },
    },
    requiresOrg: false,
    requiresUser: true,
    targetTable: 'trial_users',
    createsTimeline: false,
  },

  DELETE_TICKET: {
    action: 'DELETE_TICKET',
    description: 'Delete a support ticket',
    required: ['ticket_id'],
    optional: [],
    fields: {
      ticket_id: { type: 'string', description: 'Ticket ID to delete' },
    },
    requiresOrg: false,
    requiresUser: false,
    targetTable: 'tickets',
    createsTimeline: false,
  },

  DELETE_FEATURE_REQUEST: {
    action: 'DELETE_FEATURE_REQUEST',
    description: 'Delete a feature request',
    required: ['feature_request_id'],
    optional: [],
    fields: {
      feature_request_id: { type: 'string', description: 'Feature request ID to delete' },
    },
    requiresOrg: false,
    requiresUser: false,
    targetTable: 'feature_requests',
    createsTimeline: false,
  },

  DELETE_ROADMAP_ITEM: {
    action: 'DELETE_ROADMAP_ITEM',
    description: 'Delete a roadmap item',
    required: ['roadmap_item_id'],
    optional: [],
    fields: {
      roadmap_item_id: { type: 'string', description: 'Roadmap item ID to delete' },
    },
    requiresOrg: false,
    requiresUser: false,
    targetTable: 'roadmap_items',
    createsTimeline: false,
  },

  DELETE_TIMELINE_EVENT: {
    action: 'DELETE_TIMELINE_EVENT',
    description: 'Delete a timeline event',
    required: ['event_id'],
    optional: [],
    fields: {
      event_id: { type: 'string', description: 'Event ID to delete' },
    },
    requiresOrg: false,
    requiresUser: false,
    targetTable: 'trial_timeline_events',
    createsTimeline: false,
  },

  DELETE_NOTE: {
    action: 'DELETE_NOTE',
    description: 'Delete an activity note',
    required: ['note_id'],
    optional: [],
    fields: {
      note_id: { type: 'string', description: 'Note ID to delete' },
    },
    requiresOrg: false,
    requiresUser: false,
    targetTable: 'org_activity_notes',
    createsTimeline: false,
  },

  DELETE_FOLLOWUP: {
    action: 'DELETE_FOLLOWUP',
    description: 'Delete a follow-up reminder',
    required: ['followup_id'],
    optional: [],
    fields: {
      followup_id: { type: 'string', description: 'Follow-up ID to delete' },
    },
    requiresOrg: false,
    requiresUser: false,
    targetTable: 'org_followups',
    createsTimeline: false,
  },

  // ============ PROSPECT LIFECYCLE ACTIONS ============

  CREATE_PROSPECT_ORG: {
    action: 'CREATE_PROSPECT_ORG',
    description: 'Create a new prospect organization (pre-trial)',
    required: [],
    optional: ['website', 'domain_category', 'prospect_source', 'icp_fit_score', 'details'],
    fields: {
      website: { type: 'url', description: 'Company website' },
      domain_category: {
        type: 'enum',
        enumValues: ['AAD', 'AF&B', 'E&C', 'HC', 'NEO', 'TMT'] as const,
        description: 'Industry category',
      },
      prospect_source: {
        type: 'enum',
        enumValues: ['cold_outreach', 'inbound', 'referral', 'event', 'linkedin', 'other'] as const,
        description: 'How the prospect was sourced',
      },
      icp_fit_score: { type: 'number', min: 0, max: 100, description: 'ICP fit score 0-100' },
      details: { type: 'string', maxLength: 1000, description: 'Additional notes' },
    },
    requiresOrg: false,  // Creating new org
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  ADD_PROSPECT_CONTACT: {
    action: 'ADD_PROSPECT_CONTACT',
    description: 'Add a contact to a prospect organization',
    required: ['contact_name'],
    optional: ['contact_email', 'contact_title', 'contact_phone', 'linkedin_url', 'is_primary_contact'],
    fields: {
      contact_name: { type: 'string', minLength: 2, maxLength: 200, description: 'Contact full name' },
      contact_email: { type: 'email', description: 'Contact email address' },
      contact_title: { type: 'string', maxLength: 100, description: 'Job title' },
      contact_phone: { type: 'string', maxLength: 20, description: 'Phone number' },
      linkedin_url: { type: 'url', description: 'LinkedIn profile URL' },
      is_primary_contact: { type: 'boolean', description: 'Is this the primary contact?' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'prospects',
    createsTimeline: true,
  },

  LOG_OUTREACH: {
    action: 'LOG_OUTREACH',
    description: 'Log an outreach activity (email, call, linkedin)',
    required: ['outreach_type'],
    optional: ['outreach_direction', 'outreach_subject', 'outreach_content', 'date'],
    fields: {
      outreach_type: {
        type: 'enum',
        enumValues: ['email_sent', 'email_received', 'call', 'linkedin', 'meeting', 'note', 'screening', 'demo'] as const,
        description: 'Type of outreach activity',
      },
      outreach_direction: {
        type: 'enum',
        enumValues: ['outbound', 'inbound'] as const,
        description: 'Direction of outreach',
      },
      outreach_subject: { type: 'string', maxLength: 200, description: 'Subject line for emails' },
      outreach_content: { type: 'string', maxLength: 2000, description: 'Content or notes' },
      date: { type: 'date', description: 'When the outreach occurred' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'prospect_activities',
    createsTimeline: false,  // Uses prospect_activities table
  },

  LOG_RESPONSE: {
    action: 'LOG_RESPONSE',
    description: 'Log a response from a prospect',
    required: ['response_status'],
    optional: ['outreach_content', 'date'],
    fields: {
      response_status: {
        type: 'enum',
        enumValues: ['no_response', 'positive', 'negative', 'neutral', 'pending'] as const,
        description: 'Response status from prospect',
      },
      outreach_content: { type: 'string', maxLength: 2000, description: 'Response notes' },
      date: { type: 'date', description: 'When the response was received' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'prospect_activities',
    createsTimeline: false,
  },

  LOG_SCREENING: {
    action: 'LOG_SCREENING',
    description: 'Log screening/qualification result',
    required: [],
    optional: ['icp_fit_score', 'details'],
    fields: {
      icp_fit_score: { type: 'number', min: 0, max: 100, description: 'ICP fit score 0-100' },
      details: { type: 'string', maxLength: 2000, description: 'Screening notes' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  UPDATE_PROSPECT_STAGE: {
    action: 'UPDATE_PROSPECT_STAGE',
    description: 'Move prospect through pipeline stages',
    required: ['prospect_stage'],
    optional: ['details'],
    fields: {
      prospect_stage: {
        type: 'enum',
        enumValues: ['cold_lead', 'contacted', 'responded', 'screening', 'demo_scheduled', 'demo_done', 'disqualified'] as const,
        description: 'New prospect stage',
      },
      details: { type: 'string', maxLength: 500, description: 'Stage change notes' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  DISQUALIFY_PROSPECT: {
    action: 'DISQUALIFY_PROSPECT',
    description: 'Mark prospect as disqualified',
    required: [],
    optional: ['disqualify_reason'],
    fields: {
      disqualify_reason: { type: 'string', maxLength: 500, description: 'Reason for disqualification' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  CONVERT_TO_TRIAL: {
    action: 'CONVERT_TO_TRIAL',
    description: 'Convert prospect to active trial',
    required: [],
    optional: ['trial_status', 'details'],
    fields: {
      trial_status: {
        type: 'enum',
        enumValues: ['requested', 'approved', 'in_progress', 'active'] as const,
        description: 'Initial trial status',
      },
      details: { type: 'string', maxLength: 500, description: 'Conversion notes' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  // ============ DEAL OUTCOME ACTIONS ============

  UPDATE_DEAL_STAGE: {
    action: 'UPDATE_DEAL_STAGE',
    description: 'Move through deal pipeline stages (post-trial)',
    required: ['deal_pipeline_stage'],
    optional: ['details'],
    fields: {
      deal_pipeline_stage: {
        type: 'enum',
        enumValues: ['evaluation', 'trial_expired', 'negotiation', 'closed'] as const,
        description: 'New deal stage',
      },
      details: { type: 'string', maxLength: 500, description: 'Stage change notes' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  CLOSE_DEAL_WON: {
    action: 'CLOSE_DEAL_WON',
    description: 'Close deal as won',
    required: [],
    optional: ['deal_value', 'details'],
    fields: {
      deal_value: { type: 'number', min: 0, description: 'Deal value in dollars' },
      details: { type: 'string', maxLength: 500, description: 'Win notes' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  CLOSE_DEAL_LOST: {
    action: 'CLOSE_DEAL_LOST',
    description: 'Close deal as lost',
    required: [],
    optional: ['deal_outcome_reason', 'details'],
    fields: {
      deal_outcome_reason: { type: 'string', maxLength: 500, description: 'Reason for loss' },
      details: { type: 'string', maxLength: 500, description: 'Additional notes' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },

  DEFER_DEAL: {
    action: 'DEFER_DEAL',
    description: 'Defer deal to a future date',
    required: [],
    optional: ['deferred_until', 'deal_outcome_reason'],
    fields: {
      deferred_until: { type: 'date', description: 'Date to follow up' },
      deal_outcome_reason: { type: 'string', maxLength: 500, description: 'Reason for deferral' },
    },
    requiresOrg: true,
    requiresUser: false,
    targetTable: 'trial_organizations',
    createsTimeline: true,
  },
};

/**
 * Get schema for an action
 */
export function getActionSchema(action: CommandAction): ActionSchema {
  return ACTION_SCHEMAS[action];
}

/**
 * Validate fields against schema
 */
export function validateFields(
  action: CommandAction,
  fields: Record<string, any>
): { valid: boolean; errors: string[] } {
  const schema = ACTION_SCHEMAS[action];
  const errors: string[] = [];

  // Check required fields
  for (const fieldName of schema.required) {
    if (!(fieldName in fields) || fields[fieldName] === null || fields[fieldName] === undefined) {
      errors.push(`Missing required field: ${fieldName}`);
    }
  }

  // Validate field types and constraints
  const allFields = [...schema.required, ...schema.optional];
  for (const fieldName of allFields) {
    if (fieldName in fields && fields[fieldName] !== null && fields[fieldName] !== undefined) {
      const fieldDef = schema.fields[fieldName];
      const value = fields[fieldName];

      if (fieldDef) {
        // Type validation
        if (fieldDef.type === 'number' && typeof value !== 'number') {
          errors.push(`${fieldName} must be a number`);
        }
        if (fieldDef.type === 'string' && typeof value !== 'string') {
          errors.push(`${fieldName} must be a string`);
        }
        if (fieldDef.type === 'email' && typeof value === 'string' && !value.includes('@')) {
          errors.push(`${fieldName} must be a valid email`);
        }
        if (fieldDef.type === 'enum' && fieldDef.enumValues && !fieldDef.enumValues.includes(value)) {
          errors.push(`${fieldName} must be one of: ${fieldDef.enumValues.join(', ')}`);
        }

        // Constraint validation
        if (fieldDef.minLength && typeof value === 'string' && value.length < fieldDef.minLength) {
          errors.push(`${fieldName} must be at least ${fieldDef.minLength} characters`);
        }
        if (fieldDef.maxLength && typeof value === 'string' && value.length > fieldDef.maxLength) {
          errors.push(`${fieldName} must be at most ${fieldDef.maxLength} characters`);
        }
        if (fieldDef.min !== undefined && typeof value === 'number' && value < fieldDef.min) {
          errors.push(`${fieldName} must be at least ${fieldDef.min}`);
        }
        if (fieldDef.max !== undefined && typeof value === 'number' && value > fieldDef.max) {
          errors.push(`${fieldName} must be at most ${fieldDef.max}`);
        }
        if (fieldDef.pattern && typeof value === 'string' && !fieldDef.pattern.test(value)) {
          errors.push(`${fieldName} has invalid format`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if a CREATE action has enough fields for inline execution
 * Returns 'inline' if simple enough, 'form' if complex
 */
export function determineCreateFlow(
  action: CommandAction,
  extractedFields: Record<string, any>,
  parseConfidence: number
): 'inline' | 'form' {
  const schema = ACTION_SCHEMAS[action];

  // Only applies to CREATE actions
  if (!action.startsWith('CREATE_')) {
    return 'inline';
  }

  // Check for missing required fields
  const missingRequired = schema.required.filter(
    f => !(f in extractedFields) || extractedFields[f] === null || extractedFields[f] === undefined
  );

  // Rules for form vs inline:
  // 1. Missing required fields → form
  if (missingRequired.length > 0) {
    return 'form';
  }

  // 2. Low parse confidence → form
  if (parseConfidence < 0.80) {
    return 'form';
  }

  // 3. Too many fields extracted (complex) → form
  const extractedCount = Object.keys(extractedFields).filter(
    k => extractedFields[k] !== null && extractedFields[k] !== undefined
  ).length;
  if (extractedCount > 4) {
    return 'form';
  }

  // Otherwise inline is fine
  return 'inline';
}

/**
 * Get human-readable action description
 */
export function getActionDescription(action: CommandAction): string {
  return ACTION_SCHEMAS[action]?.description || action;
}

/**
 * Check if action creates timeline events
 */
export function createsTimelineEvent(action: CommandAction): boolean {
  return ACTION_SCHEMAS[action]?.createsTimeline || false;
}
