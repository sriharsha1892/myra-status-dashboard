/**
 * Intelligent Command Interface - Type Definitions
 * Types for natural language command parsing and execution
 */

// Action types that can be parsed from natural language
export type CommandAction =
  // Existing actions
  | 'LOG_ACTIVITY'           // User ran query, logged in, used feature
  | 'UPDATE_DEAL'            // Deal value/status change
  | 'UPDATE_STAGE'           // Organization lifecycle change
  | 'ADD_NOTE'               // Activity note
  // CREATE actions
  | 'CREATE_ORG'             // Create new trial organization
  | 'CREATE_USER'            // Create new contact/user
  | 'CREATE_TICKET'          // Create support ticket
  | 'CREATE_FEATURE_REQUEST' // Create feature request
  | 'CREATE_ROADMAP_ITEM'    // Create roadmap item
  | 'CREATE_TIMELINE_EVENT'  // Create timeline event
  // UPDATE actions
  | 'UPDATE_ORG'             // Update organization details
  | 'UPDATE_USER'            // Update user details
  | 'ASSIGN_ACCOUNT_MANAGER' // Assign AM to organization
  // Quick actions
  | 'QUICK_STATUS_UPDATE'    // Quick status note without stage change
  // Sales intelligence actions
  | 'SCHEDULE_FOLLOWUP'      // Schedule a follow-up reminder
  | 'UPDATE_STAKEHOLDER'     // Update stakeholder influence level
  | 'LOG_COMPETITOR'         // Log competitor interaction
  | 'TRACK_FEATURE_INTEREST' // Track feature interest
  | 'UPDATE_MOMENTUM'        // Update deal momentum
  // DELETE actions
  | 'DELETE_ORG'             // Delete trial organization
  | 'DELETE_USER'            // Delete user/contact
  | 'DELETE_TICKET'          // Delete support ticket
  | 'DELETE_FEATURE_REQUEST' // Delete feature request
  | 'DELETE_ROADMAP_ITEM'    // Delete roadmap item
  | 'DELETE_TIMELINE_EVENT'  // Delete timeline event
  | 'DELETE_NOTE'            // Delete activity note
  | 'DELETE_FOLLOWUP'        // Delete follow-up reminder
  // Bulk actions (future)
  | 'BULK_UPDATE_STAGE'      // Update stage for multiple orgs
  | 'BULK_ASSIGN_AM'         // Assign AM to multiple orgs
  // Prospect lifecycle actions (pre-trial)
  | 'CREATE_PROSPECT_ORG'    // Add new prospect organization
  | 'ADD_PROSPECT_CONTACT'   // Add contact to prospect org
  | 'LOG_OUTREACH'           // Log outreach activity (email, call, linkedin)
  | 'LOG_RESPONSE'           // Log prospect response
  | 'LOG_SCREENING'          // Log screening/qualification
  | 'UPDATE_PROSPECT_STAGE'  // Move prospect through pipeline
  | 'DISQUALIFY_PROSPECT'    // Mark prospect as not a fit
  | 'CONVERT_TO_TRIAL'       // Convert prospect to trial org
  // Deal outcome actions (post-trial)
  | 'UPDATE_DEAL_STAGE'      // Move through deal pipeline
  | 'CLOSE_DEAL_WON'         // Close deal as won
  | 'CLOSE_DEAL_LOST'        // Close deal as lost
  | 'DEFER_DEAL';            // Defer deal to future date

// Confidence tiers for auto-execution decisions
export type ConfidenceTier = 'high' | 'medium' | 'low';

// Activity types for LOG_ACTIVITY action
export type ActivityType =
  | 'query'
  | 'login'
  | 'demo'
  | 'call'
  | 'email'
  | 'meeting'
  | 'feature_usage'
  | 'feedback'
  | 'support_request'
  | 'check_in'
  | 'follow_up'
  | 'training'
  | 'onboarding'
  | 'presentation'
  | 'poc'
  | 'negotiation';

// Deal statuses
export type DealStatus =
  | 'prospect'
  | 'negotiating'
  | 'won'
  | 'lost'
  | 'deferred';

// Prospect pipeline stages (pre-trial)
export type ProspectStage =
  | 'cold_lead'
  | 'contacted'
  | 'responded'
  | 'screening'
  | 'demo_scheduled'
  | 'demo_done'
  | 'disqualified';

// Prospect source channels
export type ProspectSource =
  | 'cold_outreach'
  | 'inbound'
  | 'referral'
  | 'event'
  | 'linkedin'
  | 'other';

// Outreach activity types
export type OutreachType =
  | 'email_sent'
  | 'email_received'
  | 'call'
  | 'linkedin'
  | 'meeting'
  | 'note'
  | 'screening'
  | 'demo';

// Outreach direction
export type OutreachDirection = 'outbound' | 'inbound';

// Response statuses for outreach
export type ResponseStatus =
  | 'no_response'
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'pending';

// Deal pipeline stages (post-trial)
export type DealPipelineStage =
  | 'evaluation'
  | 'trial_expired'
  | 'negotiation'
  | 'closed';

// Deal outcomes
export type DealOutcome = 'won' | 'lost' | 'deferred';

// Organization lifecycle stages
// Matches database constraint: prospect → trial_pending → trial_active → trial_expired → customer | lost
export type LifecycleStage =
  | 'prospect'
  | 'trial_pending'
  | 'trial_active'
  | 'trial_expired'
  | 'customer'
  | 'lost';

// Trial statuses
export type TrialStatus =
  | 'requested'
  | 'approved'
  | 'in_progress'
  | 'active'
  | 'extended'
  | 'completed'
  | 'closed';

// Note categories
export type NoteCategory =
  | 'first_login'
  | 'question'
  | 'issue'
  | 'success'
  | 'data_quality'
  | 'feature_request'
  | 'other';

// Ticket priority levels
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

// Ticket categories
export type TicketCategory =
  | 'bug'
  | 'feature_request'
  | 'question'
  | 'integration'
  | 'performance'
  | 'security'
  | 'documentation'
  | 'other';

// Feature request priority
export type FeatureRequestPriority = 'low' | 'medium' | 'high' | 'critical';

// Roadmap item status
export type RoadmapItemStatus = 'planned' | 'in_progress' | 'completed' | 'blocked';

// Roadmap item priority
export type RoadmapItemPriority = 'low' | 'medium' | 'high';

// Timeline event types (comprehensive list)
export type TimelineEventType =
  | 'query_executed'
  | 'user_logged_in'
  | 'demo_conducted'
  | 'call_completed'
  | 'email_sent'
  | 'meeting_held'
  | 'feature_used'
  | 'feedback_received'
  | 'support_ticket_created'
  | 'trial_started'
  | 'trial_extended'
  | 'trial_ended'
  | 'stage_changed'
  | 'note_added'
  | 'other';

// Timeline event categories
export type TimelineEventCategory =
  | 'engagement'
  | 'support'
  | 'lifecycle'
  | 'activity'
  | 'system';

// Timeline event sentiment
export type TimelineEventSentiment = 'positive' | 'neutral' | 'negative';

// Domain categories for organizations
export type DomainCategory =
  | 'AAD'     // Automotive & Aerospace Defense
  | 'AF&B'    // Agriculture, Food & Beverage
  | 'E&C'     // Energy & Chemicals
  | 'HC'      // Healthcare
  | 'NEO'     // New Economy
  | 'TMT';    // Technology, Media & Telecom

// Contact for CREATE_ORG - extracted contact info
export interface ExtractedContact {
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  is_primary?: boolean;
}

// Parsed command from Groq
export interface ParsedCommand {
  action: CommandAction;
  confidence: number;        // 0.0 - 1.0
  org_name: string | null;
  user_name: string | null;
  fields: {
    // Existing fields (LOG_ACTIVITY, UPDATE_DEAL, UPDATE_STAGE, ADD_NOTE)
    activity_type?: ActivityType;
    deal_value?: number;
    deal_status?: DealStatus;
    lifecycle_stage?: LifecycleStage;
    trial_status?: TrialStatus;
    note_category?: NoteCategory;
    note_text?: string;
    date?: string;           // ISO date or relative ("yesterday")
    details?: string;        // Additional context

    // CREATE_ORG fields
    website?: string;
    domain_category?: DomainCategory;
    team_size?: number;
    contract_value?: number;
    contacts?: ExtractedContact[];
    description?: string;
    logo_url?: string;

    // CREATE_USER fields
    email?: string;
    role?: string;
    phone?: string;
    designation?: string;

    // CREATE_TICKET fields
    ticket_title?: string;
    ticket_description?: string;
    ticket_priority?: TicketPriority;
    ticket_category?: TicketCategory;

    // CREATE_FEATURE_REQUEST fields
    feature_title?: string;
    feature_description?: string;
    feature_use_case?: string;
    feature_priority?: FeatureRequestPriority;

    // CREATE_ROADMAP_ITEM fields
    roadmap_title?: string;
    roadmap_description?: string;
    roadmap_status?: RoadmapItemStatus;
    roadmap_priority?: RoadmapItemPriority;
    target_date?: string;

    // CREATE_TIMELINE_EVENT fields
    event_type?: TimelineEventType;
    event_category?: TimelineEventCategory;
    event_title?: string;
    event_sentiment?: TimelineEventSentiment;

    // UPDATE_ORG fields (same as CREATE_ORG but for updates)
    // UPDATE_USER fields (same as CREATE_USER but for updates)

    // ASSIGN_ACCOUNT_MANAGER fields
    account_manager_name?: string;

    // DELETE action fields (entity IDs for deletion)
    ticket_id?: string;
    feature_request_id?: string;
    roadmap_item_id?: string;
    event_id?: string;
    note_id?: string;
    followup_id?: string;
    confirm_name?: string;     // Optional confirmation for destructive operations

    // Prospect lifecycle fields
    prospect_stage?: ProspectStage;       // Current prospect pipeline stage
    prospect_source?: ProspectSource;     // How prospect was sourced
    icp_fit_score?: number;               // ICP fit score 0-100
    contact_name?: string;                // Prospect contact name
    contact_title?: string;               // Prospect contact job title
    contact_email?: string;               // Prospect contact email
    contact_phone?: string;               // Prospect contact phone
    linkedin_url?: string;                // LinkedIn profile URL
    is_primary_contact?: boolean;         // Is this the primary contact

    // Outreach activity fields
    outreach_type?: OutreachType;         // Type of outreach activity
    outreach_direction?: OutreachDirection; // Inbound or outbound
    outreach_subject?: string;            // Subject line for emails
    outreach_content?: string;            // Content/notes of outreach
    response_status?: ResponseStatus;     // Response status from prospect

    // Deal pipeline fields (post-trial)
    deal_pipeline_stage?: DealPipelineStage; // Current deal stage
    deal_outcome?: DealOutcome;           // Final deal outcome
    deal_outcome_reason?: string;         // Reason for outcome (lost/deferred)
    deferred_until?: string;              // Date to follow up if deferred
    disqualify_reason?: string;           // Reason for disqualification
  };
  reasoning?: string;        // AI's explanation
}

// Entity match result from fuzzy matching
export interface EntityMatch {
  id: string;
  name: string;
  confidence: number;
  strategy: 'exact' | 'fuzzy' | 'domain' | 'alias';
  alternatives?: Array<{
    id: string;
    name: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
}

// Resolved command with matched entities
export interface ResolvedCommand {
  id: string;                  // Unique ID for this command
  originalText: string;        // What user typed
  parsed: ParsedCommandWithSpans;  // AI-parsed structure with extraction spans
  entities: {
    org: EntityMatch | null;
    user: EntityMatch | null;
  };
  confidenceTier: ConfidenceTier;
  confidenceBreakdown?: ConfidenceBreakdown;  // Detailed confidence breakdown
  status: 'pending' | 'needs_confirmation' | 'needs_disambiguation' | 'executing' | 'success' | 'failed' | 'undone';
  error?: string;
}

// Database change record for undo
export interface DatabaseChange {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  record_id: string;
  previous_values?: Record<string, any>;
  new_values?: Record<string, any>;  // Optional for delete operations
}

// Execution result
export interface ExecutionResult {
  success: boolean;
  command_id: string;
  changes: DatabaseChange[];
  summary: string;             // Human-readable summary
  undo_id?: string;            // Reference for undo
  undo_expires_at?: string;    // When undo expires
  error?: string;
}

// Batch processing request
export interface BatchCommandRequest {
  commands: string[];          // Array of natural language commands
  auto_execute_high_confidence?: boolean;
}

// Batch processing response
export interface BatchCommandResponse {
  success: boolean;
  results: ResolvedCommand[];
  summary: {
    total: number;
    auto_executed: number;
    needs_confirmation: number;
    needs_disambiguation: number;
    failed: number;
  };
}

// Undo request
export interface UndoRequest {
  undo_id: string;
}

// Undo response
export interface UndoResponse {
  success: boolean;
  reverted_changes: string[];
  error?: string;
}

// Confidence breakdown for transparency
export interface ConfidenceBreakdown {
  parse: number;       // AI parse confidence (0-1)
  org: number;         // Organization match confidence (0-1)
  user: number;        // User match confidence (0-1)
  weights: {
    parse: number;     // Weight applied to parse (default 0.4)
    org: number;       // Weight applied to org (default 0.4)
    user: number;      // Weight applied to user (default 0.2)
  };
  combined: number;    // Final weighted confidence
}

// Extraction span showing where AI found each entity
export interface ExtractionSpan {
  text: string;        // The extracted text
  type:
    | 'org'
    | 'user'
    | 'action'
    | 'value'
    | 'date'
    | 'status'
    // New span types for extended actions
    | 'email'
    | 'phone'
    | 'website'
    | 'title'
    | 'description'
    | 'priority'
    | 'category'
    | 'team_size'
    | 'contract_value'
    | 'account_manager'
    // Prospect lifecycle span types
    | 'prospect_stage'
    | 'prospect_source'
    | 'outreach_type'
    | 'response_status'
    | 'icp_score'
    | 'deal_stage'
    | 'deal_outcome'
    | 'deferred_date'
    | 'reason'
    | 'linkedin';
  start: number;       // Start index in original text
  end: number;         // End index in original text
  confidence?: number; // Confidence for this specific extraction
}

// Extended ParsedCommand with extraction spans
export interface ParsedCommandWithSpans extends ParsedCommand {
  extractedSpans?: ExtractionSpan[];
}

// Error diagnostics for better error recovery
export interface ParseDiagnostics {
  hasOrgIndicator: boolean;
  hasActionVerb: boolean;
  hasUserIndicator: boolean;
  hasDateIndicator: boolean;
  ambiguousElements: string[];
  suggestions: string[];
}

// Extended EntityMatch with match explanation
export interface EntityMatchWithExplanation extends EntityMatch {
  matchExplanation?: string;     // Human-readable explanation
  matchedOn?: 'full_name' | 'partial_name' | 'first_name' | 'domain' | 'alias' | 'fuzzy';
  fuzzyScore?: number;           // Raw fuzzy match score
}

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.90,      // Auto-execute
  MEDIUM: 0.70,    // Show confirmation
  LOW: 0.70,       // Below this, require disambiguation
} as const;

// Helper to determine confidence tier
export function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}
