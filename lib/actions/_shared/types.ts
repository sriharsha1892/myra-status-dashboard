/**
 * Action Types
 * Core types for the action layer including ActionResult, ActionError, and ActionContext
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';

// ============ DATABASE CHANGE TRACKING ============

/**
 * Tracks a single database change for undo support
 */
export interface DatabaseChange {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  record_id: string;
  previous_values?: Record<string, any>;
  new_values?: Record<string, any>;
}

// ============ ERROR TYPES ============

/**
 * Error codes for categorizing action failures
 * Used by UI to display appropriate error messages and take appropriate action
 */
export type ActionErrorCode =
  | 'VALIDATION_ERROR'     // Input failed validation (Zod schema)
  | 'NOT_FOUND'           // Referenced entity not found
  | 'DUPLICATE_ENTRY'     // Unique constraint violation
  | 'PERMISSION_DENIED'   // User lacks permission
  | 'DATABASE_ERROR'      // Generic DB operation failure
  | 'TRANSACTION_FAILED'  // Multi-step operation partially failed
  | 'UNDO_EXPIRED'        // Undo window has passed
  | 'ALREADY_UNDONE'      // Action was already undone
  | 'INVALID_STATE'       // Entity in wrong state for operation
  | 'RATE_LIMITED';       // Too many requests

/**
 * Rich error with user guidance
 * Provides user-friendly message + suggestion for recovery
 */
export interface ActionError {
  /** Error category for programmatic handling */
  code: ActionErrorCode;
  /** User-friendly error message */
  message: string;
  /** Suggestion for what user can do to fix */
  suggestion?: string;
  /** Which input field caused the error (for form highlighting) */
  field?: string;
  /** Technical details for debugging (not shown to user) */
  technical?: string;
}

// ============ ACTION RESULT ============

/**
 * Standardized result from all action executions
 * @template T - Type of data returned on success
 */
export interface ActionResult<T = unknown> {
  /** Whether the action succeeded */
  success: boolean;
  /** Data returned on success (type varies by action) */
  data?: T;
  /** Database changes made (for undo support) */
  changes: DatabaseChange[];
  /** Human-readable summary of what happened */
  summary: string;
  /** Undo ID if action can be undone */
  undoId?: string;
  /** ISO timestamp when undo expires */
  undoExpiresAt?: string;
  /** Error details if action failed */
  error?: ActionError;
}

// ============ ACTION CONTEXT ============

/**
 * Context passed to all action executions
 * Contains dependencies and resolved entities
 */
export interface ActionContext {
  /** ID of user executing the action */
  userId: string;
  /** Supabase client for database operations */
  supabase: SupabaseClient;
  /** Resolved organization ID (if applicable) */
  orgId?: string;
  /** Resolved organization name (for display) */
  orgName?: string;
  /** Resolved trial user ID (if applicable) */
  trialUserId?: string;
  /** Parent company for multi-tenant filtering */
  parentCompany?: string;
}

// ============ ACTION DEFINITION ============

/**
 * Defines an executable action
 * @template TInput - Zod schema type for input validation
 * @template TOutput - Type of data returned on success
 */
export interface Action<TInput, TOutput = unknown> {
  /** Action name matching CommandAction enum */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Zod schema for input validation */
  schema: z.ZodSchema<TInput>;
  /** Execute the action with validated input */
  execute(input: TInput, context: ActionContext): Promise<ActionResult<TOutput>>;
}

// ============ ACTION INPUT MAPPERS ============

/**
 * Maps parsed command fields to action input
 * Used by the action registry to transform resolved command fields
 */
export type InputMapper<TInput> = (
  fields: Record<string, any>,
  context: ActionContext
) => TInput;

// ============ COMMON OUTPUT TYPES ============

/**
 * Output for organization creation
 */
export interface CreateOrgOutput {
  orgId: string;
  orgName: string;
  contactsCreated?: number;
}

/**
 * Output for user creation
 */
export interface CreateUserOutput {
  userId: string;
  email: string;
  orgId?: string;
}

/**
 * Output for ticket creation
 */
export interface CreateTicketOutput {
  ticketId: string;
  title: string;
}

/**
 * Output for feature request creation
 */
export interface CreateFeatureRequestOutput {
  featureRequestId: string;
  title: string;
}

/**
 * Output for roadmap item creation
 */
export interface CreateRoadmapItemOutput {
  roadmapItemId: string;
  title: string;
}

/**
 * Output for timeline event creation
 */
export interface CreateTimelineEventOutput {
  eventId: string;
  eventType: string;
}

/**
 * Output for stage update
 */
export interface UpdateStageOutput {
  orgId: string;
  previousStage?: string;
  newStage: string;
}

/**
 * Output for deal update
 */
export interface UpdateDealOutput {
  dealId: string;
  dealValue?: number;
  dealStatus?: string;
}

/**
 * Output for note addition
 */
export interface AddNoteOutput {
  noteId: string;
}

/**
 * Output for activity logging
 */
export interface LogActivityOutput {
  eventId: string;
  activityType: string;
}

/**
 * Output for quick status update
 */
export interface QuickStatusUpdateOutput {
  noteId: string;
  eventId: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

// ============ SALES INTELLIGENCE OUTPUTS ============

/**
 * Output for scheduling a follow-up
 */
export interface ScheduleFollowupOutput {
  followupId: string;
  dueDate: string;
  title: string;
  followupType: string;
}

/**
 * Output for updating stakeholder influence
 */
export interface UpdateStakeholderOutput {
  userId: string;
  influence: string;
  previousInfluence?: string;
}

/**
 * Output for logging competitive mention
 */
export interface LogCompetitorOutput {
  mentionId: string;
  competitorName: string;
  position?: string;
}

/**
 * Output for tracking feature interest
 */
export interface TrackFeatureInterestOutput {
  interestId: string;
  featureName: string;
  priority: string;
}

/**
 * Output for updating deal momentum
 */
export interface UpdateMomentumOutput {
  orgId: string;
  momentum: string;
  previousMomentum?: string;
}

// ============ PROSPECT LIFECYCLE OUTPUTS ============

/**
 * Output for creating a prospect organization
 */
export interface CreateProspectOrgOutput {
  orgId: string;
  orgName: string;
  prospectStage: string;
}

/**
 * Output for adding a prospect contact
 */
export interface AddProspectContactOutput {
  prospectId: string;
  contactName: string;
  orgId: string;
}

/**
 * Output for logging outreach activity
 */
export interface LogOutreachOutput {
  activityId: string;
  outreachType: string;
  orgId: string;
}

/**
 * Output for logging prospect response
 */
export interface LogResponseOutput {
  activityId: string;
  responseStatus: string;
  orgId: string;
}

/**
 * Output for logging screening
 */
export interface LogScreeningOutput {
  activityId: string;
  icpFitScore?: number;
  orgId: string;
}

/**
 * Output for updating prospect stage
 */
export interface UpdateProspectStageOutput {
  orgId: string;
  previousStage?: string;
  newStage: string;
}

/**
 * Output for disqualifying a prospect
 */
export interface DisqualifyProspectOutput {
  orgId: string;
  reason?: string;
}

/**
 * Output for converting prospect to trial
 */
export interface ConvertToTrialOutput {
  orgId: string;
  orgName: string;
  prospectsConverted: number;
}

// ============ DEAL OUTCOME OUTPUTS ============

/**
 * Output for updating deal stage
 */
export interface UpdateDealStageOutput {
  orgId: string;
  previousStage?: string;
  newStage: string;
}

/**
 * Output for closing a deal as won
 */
export interface CloseDealWonOutput {
  orgId: string;
  dealValue?: number;
}

/**
 * Output for closing a deal as lost
 */
export interface CloseDealLostOutput {
  orgId: string;
  reason?: string;
}

/**
 * Output for deferring a deal
 */
export interface DeferDealOutput {
  orgId: string;
  deferredUntil?: string;
  reason?: string;
}
