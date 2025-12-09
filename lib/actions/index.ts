/**
 * Action Registry and Executor
 * Central entry point for all command actions
 */

import { createClient } from '@/lib/supabase/server';
import type { Action, ActionResult, ActionContext } from './_shared';
import { failedResult, fieldError, notFoundError } from './_shared';
import { normalizeFields } from '@/lib/command/fieldNormalizer';

// Import all action modules
import { createOrganization, mapToCreateOrgInput } from './createOrganization';
import { createUser, mapToCreateUserInput } from './createUser';
import { createTicket, mapToCreateTicketInput } from './createTicket';
import { createFeatureRequest, mapToCreateFeatureRequestInput } from './createFeatureRequest';
import { createRoadmapItem, mapToCreateRoadmapItemInput } from './createRoadmapItem';
import { createTimelineEventAction, mapToCreateTimelineEventInput } from './createTimelineEvent';
import { logActivity, mapToLogActivityInput } from './logActivity';
import { updateStage, mapToUpdateStageInput } from './updateStage';
import { updateDeal, mapToUpdateDealInput } from './updateDeal';
import { updateOrganization, mapToUpdateOrganizationInput } from './updateOrganization';
import { updateUser, mapToUpdateUserInput } from './updateUser';
import { addNote, mapToAddNoteInput } from './addNote';
import { logMeeting, mapToLogMeetingInput } from './logMeeting';
import { addDealNote, mapToAddDealNoteInput } from './addDealNote';
import { createFollowup, mapToCreateFollowupInput } from './createFollowup';
import { assignAccountManager, mapToAssignAccountManagerInput } from './assignAccountManager';
import { quickStatusUpdate, mapToQuickStatusUpdateInput } from './quickStatusUpdate';
// Sales intelligence actions
import { scheduleFollowup, mapToScheduleFollowupInput } from './scheduleFollowup';
import { updateStakeholder, mapToUpdateStakeholderInput } from './updateStakeholder';
import { logCompetitor, mapToLogCompetitorInput } from './logCompetitor';
import { trackFeatureInterest, mapToTrackFeatureInterestInput } from './trackFeatureInterest';
import { updateMomentum, mapToUpdateMomentumInput } from './updateMomentum';
// Delete actions
import { deleteOrganization, mapToDeleteOrganizationInput } from './deleteOrganization';
import { deleteUser, mapToDeleteUserInput } from './deleteUser';
import { deleteTicket, mapToDeleteTicketInput } from './deleteTicket';
import { deleteFeatureRequest, mapToDeleteFeatureRequestInput } from './deleteFeatureRequest';
import { deleteRoadmapItem, mapToDeleteRoadmapItemInput } from './deleteRoadmapItem';
import { deleteTimelineEvent, mapToDeleteTimelineEventInput } from './deleteTimelineEvent';
import { deleteNote, mapToDeleteNoteInput } from './deleteNote';
import { deleteFollowup, mapToDeleteFollowupInput } from './deleteFollowup';
// Prospect lifecycle actions
import { createProspectOrg, mapToCreateProspectOrgInput } from './createProspectOrg';
import { addProspectContact, mapToAddProspectContactInput } from './addProspectContact';
import { logOutreach, mapToLogOutreachInput } from './logOutreach';
import { logResponse, mapToLogResponseInput } from './logResponse';
import { logScreening, mapToLogScreeningInput } from './logScreening';
import { updateProspectStage, mapToUpdateProspectStageInput } from './updateProspectStage';
import { disqualifyProspect, mapToDisqualifyProspectInput } from './disqualifyProspect';
import { convertToTrial, mapToConvertToTrialInput } from './convertToTrial';
// Deal outcome actions
import { updateDealStage, mapToUpdateDealStageInput } from './updateDealStage';
import { closeDealWon, mapToCloseDealWonInput } from './closeDealWon';
import { closeDealLost, mapToCloseDealLostInput } from './closeDealLost';
import { deferDeal, mapToDeferDealInput } from './deferDeal';

// Re-export shared types
export type { ActionResult, ActionError, ActionContext, DatabaseChange } from './_shared';

// Re-export undo functionality
export { executeUndo } from './_shared';

// ============ ACTION REGISTRY ============

/**
 * Command actions that can be executed
 */
export type CommandAction =
  | 'CREATE_ORG'
  | 'CREATE_USER'
  | 'CREATE_TICKET'
  | 'CREATE_FEATURE_REQUEST'
  | 'CREATE_ROADMAP_ITEM'
  | 'CREATE_TIMELINE_EVENT'
  | 'LOG_ACTIVITY'
  | 'LOG_MEETING'
  | 'ADD_DEAL_NOTE'
  | 'CREATE_FOLLOWUP'
  | 'UPDATE_STAGE'
  | 'UPDATE_DEAL'
  | 'UPDATE_ORG'
  | 'UPDATE_USER'
  | 'ADD_NOTE'
  | 'ASSIGN_ACCOUNT_MANAGER'
  | 'QUICK_STATUS_UPDATE'
  // Sales intelligence actions
  | 'SCHEDULE_FOLLOWUP'
  | 'UPDATE_STAKEHOLDER'
  | 'LOG_COMPETITOR'
  | 'TRACK_FEATURE_INTEREST'
  | 'UPDATE_MOMENTUM'
  // Delete actions
  | 'DELETE_ORG'
  | 'DELETE_USER'
  | 'DELETE_TICKET'
  | 'DELETE_FEATURE_REQUEST'
  | 'DELETE_ROADMAP_ITEM'
  | 'DELETE_TIMELINE_EVENT'
  | 'DELETE_NOTE'
  | 'DELETE_FOLLOWUP'
  // Prospect lifecycle actions
  | 'CREATE_PROSPECT_ORG'
  | 'ADD_PROSPECT_CONTACT'
  | 'LOG_OUTREACH'
  | 'LOG_RESPONSE'
  | 'LOG_SCREENING'
  | 'UPDATE_PROSPECT_STAGE'
  | 'DISQUALIFY_PROSPECT'
  | 'CONVERT_TO_TRIAL'
  // Deal outcome actions
  | 'UPDATE_DEAL_STAGE'
  | 'CLOSE_DEAL_WON'
  | 'CLOSE_DEAL_LOST'
  | 'DEFER_DEAL';

/**
 * Registry of all action implementations
 * 39 actions: 19 original + 8 delete + 12 prospect/deal
 */
const ACTION_REGISTRY: Record<CommandAction, Action<any, any>> = {
  CREATE_ORG: createOrganization,
  CREATE_USER: createUser,
  CREATE_TICKET: createTicket,
  CREATE_FEATURE_REQUEST: createFeatureRequest,
  CREATE_ROADMAP_ITEM: createRoadmapItem,
  CREATE_TIMELINE_EVENT: createTimelineEventAction,
  LOG_ACTIVITY: logActivity,
  LOG_MEETING: logMeeting,
  ADD_DEAL_NOTE: addDealNote,
  CREATE_FOLLOWUP: createFollowup,
  UPDATE_STAGE: updateStage,
  UPDATE_DEAL: updateDeal,
  UPDATE_ORG: updateOrganization,
  UPDATE_USER: updateUser,
  ADD_NOTE: addNote,
  ASSIGN_ACCOUNT_MANAGER: assignAccountManager,
  QUICK_STATUS_UPDATE: quickStatusUpdate,
  // Sales intelligence actions
  SCHEDULE_FOLLOWUP: scheduleFollowup,
  UPDATE_STAKEHOLDER: updateStakeholder,
  LOG_COMPETITOR: logCompetitor,
  TRACK_FEATURE_INTEREST: trackFeatureInterest,
  UPDATE_MOMENTUM: updateMomentum,
  // Delete actions
  DELETE_ORG: deleteOrganization,
  DELETE_USER: deleteUser,
  DELETE_TICKET: deleteTicket,
  DELETE_FEATURE_REQUEST: deleteFeatureRequest,
  DELETE_ROADMAP_ITEM: deleteRoadmapItem,
  DELETE_TIMELINE_EVENT: deleteTimelineEvent,
  DELETE_NOTE: deleteNote,
  DELETE_FOLLOWUP: deleteFollowup,
  // Prospect lifecycle actions
  CREATE_PROSPECT_ORG: createProspectOrg,
  ADD_PROSPECT_CONTACT: addProspectContact,
  LOG_OUTREACH: logOutreach,
  LOG_RESPONSE: logResponse,
  LOG_SCREENING: logScreening,
  UPDATE_PROSPECT_STAGE: updateProspectStage,
  DISQUALIFY_PROSPECT: disqualifyProspect,
  CONVERT_TO_TRIAL: convertToTrial,
  // Deal outcome actions
  UPDATE_DEAL_STAGE: updateDealStage,
  CLOSE_DEAL_WON: closeDealWon,
  CLOSE_DEAL_LOST: closeDealLost,
  DEFER_DEAL: deferDeal,
};

/**
 * Input mappers for each action
 * Transform parsed command fields to action input
 */
const INPUT_MAPPERS: Record<CommandAction, (fields: Record<string, any>, context: ActionContext & { orgName?: string; userName?: string }) => any> = {
  CREATE_ORG: (fields, ctx) => mapToCreateOrgInput(fields, ctx.orgName),
  CREATE_USER: (fields, ctx) => mapToCreateUserInput(fields, ctx.orgId!, ctx.userName),
  CREATE_TICKET: (fields, ctx) => mapToCreateTicketInput(fields, ctx.orgId),
  CREATE_FEATURE_REQUEST: (fields, ctx) => mapToCreateFeatureRequestInput(fields, ctx.orgId!),
  CREATE_ROADMAP_ITEM: (fields, ctx) => mapToCreateRoadmapItemInput(fields, ctx.orgId),
  CREATE_TIMELINE_EVENT: (fields, ctx) => mapToCreateTimelineEventInput(fields, ctx.orgId!, ctx.trialUserId),
  LOG_ACTIVITY: (fields, ctx) => mapToLogActivityInput(fields, ctx.orgId!, ctx.trialUserId),
  LOG_MEETING: (fields, ctx) => mapToLogMeetingInput(fields, ctx.orgId!),
  ADD_DEAL_NOTE: (fields, ctx) => mapToAddDealNoteInput(fields, ctx.orgId!),
  CREATE_FOLLOWUP: (fields, ctx) => mapToCreateFollowupInput(fields, ctx.orgId!),
  UPDATE_STAGE: (fields, ctx) => mapToUpdateStageInput(fields, ctx.orgId!),
  UPDATE_DEAL: (fields, ctx) => mapToUpdateDealInput(fields, ctx.orgId!),
  UPDATE_ORG: (fields, ctx) => mapToUpdateOrganizationInput(fields, ctx.orgId!),
  UPDATE_USER: (fields, ctx) => mapToUpdateUserInput(fields, ctx.trialUserId!),
  ADD_NOTE: (fields, ctx) => mapToAddNoteInput(fields, ctx.orgId!, ctx.trialUserId),
  ASSIGN_ACCOUNT_MANAGER: (fields, ctx) => mapToAssignAccountManagerInput(fields, ctx.orgId!),
  QUICK_STATUS_UPDATE: (fields, ctx) => mapToQuickStatusUpdateInput(fields, ctx.orgId!),
  // Sales intelligence mappers
  SCHEDULE_FOLLOWUP: (fields, ctx) => mapToScheduleFollowupInput(fields, ctx.orgId!, ctx.trialUserId),
  UPDATE_STAKEHOLDER: (fields, ctx) => mapToUpdateStakeholderInput(fields, ctx.trialUserId!, ctx.orgId),
  LOG_COMPETITOR: (fields, ctx) => mapToLogCompetitorInput(fields, ctx.orgId!),
  TRACK_FEATURE_INTEREST: (fields, ctx) => mapToTrackFeatureInterestInput(fields, ctx.orgId!),
  UPDATE_MOMENTUM: (fields, ctx) => mapToUpdateMomentumInput(fields, ctx.orgId!),
  // Delete action mappers
  DELETE_ORG: (fields, ctx) => mapToDeleteOrganizationInput(fields, ctx.orgId!),
  DELETE_USER: (fields, ctx) => mapToDeleteUserInput(fields, ctx.trialUserId!),
  DELETE_TICKET: (fields, ctx) => mapToDeleteTicketInput(fields, fields.ticket_id),
  DELETE_FEATURE_REQUEST: (fields, ctx) => mapToDeleteFeatureRequestInput(fields, fields.feature_request_id),
  DELETE_ROADMAP_ITEM: (fields, ctx) => mapToDeleteRoadmapItemInput(fields, fields.roadmap_item_id),
  DELETE_TIMELINE_EVENT: (fields, ctx) => mapToDeleteTimelineEventInput(fields, fields.event_id),
  DELETE_NOTE: (fields, ctx) => mapToDeleteNoteInput(fields, fields.note_id),
  DELETE_FOLLOWUP: (fields, ctx) => mapToDeleteFollowupInput(fields, fields.followup_id),
  // Prospect lifecycle mappers
  CREATE_PROSPECT_ORG: (fields, ctx) => mapToCreateProspectOrgInput(fields, ctx.orgName),
  ADD_PROSPECT_CONTACT: (fields, ctx) => mapToAddProspectContactInput(fields, ctx.orgId!),
  LOG_OUTREACH: (fields, ctx) => mapToLogOutreachInput(fields, ctx.orgId!),
  LOG_RESPONSE: (fields, ctx) => mapToLogResponseInput(fields, ctx.orgId!),
  LOG_SCREENING: (fields, ctx) => mapToLogScreeningInput(fields, ctx.orgId!),
  UPDATE_PROSPECT_STAGE: (fields, ctx) => mapToUpdateProspectStageInput(fields, ctx.orgId!),
  DISQUALIFY_PROSPECT: (fields, ctx) => mapToDisqualifyProspectInput(fields, ctx.orgId!),
  CONVERT_TO_TRIAL: (fields, ctx) => mapToConvertToTrialInput(fields, ctx.orgId!),
  // Deal outcome mappers
  UPDATE_DEAL_STAGE: (fields, ctx) => mapToUpdateDealStageInput(fields, ctx.orgId!),
  CLOSE_DEAL_WON: (fields, ctx) => mapToCloseDealWonInput(fields, ctx.orgId!),
  CLOSE_DEAL_LOST: (fields, ctx) => mapToCloseDealLostInput(fields, ctx.orgId!),
  DEFER_DEAL: (fields, ctx) => mapToDeferDealInput(fields, ctx.orgId!),
};

// ============ ACTION EXECUTION ============

/**
 * Resolved command from parser
 */
export interface ResolvedCommand {
  id: string;
  parsed: {
    action: CommandAction;
    fields: Record<string, any>;
    org_name?: string;
    user_name?: string;
  };
  entities: {
    org?: { id: string; name: string };
    user?: { id: string; name: string };
  };
}

/**
 * Check if an action has been migrated to the new system
 * All actions are now migrated
 */
export function isActionMigrated(action: CommandAction): boolean {
  return action in ACTION_REGISTRY;
}

/**
 * Get list of migrated actions
 */
export function getMigratedActions(): CommandAction[] {
  return Object.keys(ACTION_REGISTRY) as CommandAction[];
}

/**
 * Execute an action from a resolved command
 * @param command - Resolved command from parser
 * @param userId - User executing the action
 * @returns Action result
 */
export async function executeAction(
  command: ResolvedCommand,
  userId: string
): Promise<ActionResult> {
  const { parsed, entities } = command;
  const action = ACTION_REGISTRY[parsed.action];

  // Check if action exists
  if (!action) {
    return failedResult(
      fieldError('action', `Action "${parsed.action}" is not supported`),
      'Unknown action'
    );
  }

  // Create Supabase client
  const supabase = await createClient();

  // Build action context
  const context: ActionContext = {
    userId,
    supabase,
    orgId: entities.org?.id,
    orgName: entities.org?.name,
    trialUserId: entities.user?.id,
  };

  // Map fields to action input
  const mapper = INPUT_MAPPERS[parsed.action];
  if (!mapper) {
    return failedResult(
      fieldError('action', `No input mapper for action "${parsed.action}"`),
      'Configuration error'
    );
  }

  // Normalize fields: map synonyms and convert values
  // e.g., contract_value → deal_value, "76K" → 76000
  const normalizedFields = normalizeFields(parsed.fields);

  const input = mapper(normalizedFields, {
    ...context,
    orgName: parsed.org_name,
    userName: parsed.user_name,
  });

  // Execute action
  try {
    return await action.execute(input, context);
  } catch (error: any) {
    console.error(`[Action] ${parsed.action} failed:`, error);
    return failedResult(
      {
        code: 'DATABASE_ERROR',
        message: 'An unexpected error occurred',
        suggestion: 'Please try again. If the problem persists, contact support.',
        technical: error?.message || String(error),
      },
      'Action failed'
    );
  }
}

// ============ DIRECT ACTION EXECUTION ============

/**
 * Execute an action directly with typed input
 * Useful for calling actions programmatically without going through parser
 */
export async function executeActionDirect<TInput, TOutput>(
  actionName: CommandAction,
  input: TInput,
  userId: string,
  options: {
    orgId?: string;
    orgName?: string;
    trialUserId?: string;
  } = {}
): Promise<ActionResult<TOutput>> {
  const action = ACTION_REGISTRY[actionName] as Action<TInput, TOutput> | undefined;

  if (!action) {
    return failedResult(
      notFoundError('Action', actionName),
      'Unknown action'
    );
  }

  const supabase = await createClient();

  const context: ActionContext = {
    userId,
    supabase,
    orgId: options.orgId,
    orgName: options.orgName,
    trialUserId: options.trialUserId,
  };

  try {
    return await action.execute(input, context);
  } catch (error: any) {
    console.error(`[Action] ${actionName} failed:`, error);
    return failedResult(
      {
        code: 'DATABASE_ERROR',
        message: 'An unexpected error occurred',
        suggestion: 'Please try again. If the problem persists, contact support.',
        technical: error?.message || String(error),
      },
      'Action failed'
    );
  }
}

// ============ EXPORTS ============

// Export individual actions for direct use
export { createOrganization, type CreateOrganizationInput } from './createOrganization';
export { createUser, type CreateUserInput } from './createUser';
export { createTicket, type CreateTicketInput, TICKET_PRIORITIES, TICKET_CATEGORIES } from './createTicket';
export { createFeatureRequest, type CreateFeatureRequestInput, FEATURE_PRIORITIES, FEATURE_STATUSES } from './createFeatureRequest';
export { createRoadmapItem, type CreateRoadmapItemInput, ROADMAP_STATUSES, ROADMAP_PRIORITIES } from './createRoadmapItem';
export { createTimelineEventAction as createTimelineEvent, type CreateTimelineEventInput } from './createTimelineEvent';
export { logActivity, type LogActivityInput, ACTIVITY_TYPES } from './logActivity';
export { updateStage, type UpdateStageInput, LIFECYCLE_STAGES, TRIAL_STATUSES } from './updateStage';
export { updateDeal, type UpdateDealInput, DEAL_STATUSES } from './updateDeal';
export { updateOrganization, type UpdateOrganizationInput } from './updateOrganization';
export { updateUser, type UpdateUserInput } from './updateUser';
export { addNote, type AddNoteInput, NOTE_CATEGORIES } from './addNote';
export { logMeeting, type LogMeetingInput, MEETING_TYPES, type LogMeetingOutput } from './logMeeting';
export { addDealNote, type AddDealNoteInput, type AddDealNoteOutput } from './addDealNote';
export { createFollowup, type CreateFollowupInput, FOLLOWUP_PRIORITIES, type CreateFollowupOutput } from './createFollowup';
export { assignAccountManager, type AssignAccountManagerInput } from './assignAccountManager';
export { quickStatusUpdate, type QuickStatusUpdateInput, STATUS_SENTIMENTS } from './quickStatusUpdate';
// Sales intelligence actions
export { scheduleFollowup, type ScheduleFollowupInput, FOLLOWUP_TYPES } from './scheduleFollowup';
export { updateStakeholder, type UpdateStakeholderInput, INFLUENCE_TYPES, INFLUENCE_LABELS } from './updateStakeholder';
export { logCompetitor, type LogCompetitorInput, POSITION_TYPES, POSITION_LABELS } from './logCompetitor';
export { trackFeatureInterest, type TrackFeatureInterestInput, FEATURE_INTEREST_PRIORITIES, PRIORITY_LABELS } from './trackFeatureInterest';
export { updateMomentum, type UpdateMomentumInput, MOMENTUM_TYPES, MOMENTUM_LABELS } from './updateMomentum';
// Delete actions
export { deleteOrganization, type DeleteOrganizationInput } from './deleteOrganization';
export { deleteUser, type DeleteUserInput } from './deleteUser';
export { deleteTicket, type DeleteTicketInput } from './deleteTicket';
export { deleteFeatureRequest, type DeleteFeatureRequestInput } from './deleteFeatureRequest';
export { deleteRoadmapItem, type DeleteRoadmapItemInput } from './deleteRoadmapItem';
export { deleteTimelineEvent, type DeleteTimelineEventInput } from './deleteTimelineEvent';
export { deleteNote, type DeleteNoteInput } from './deleteNote';
export { deleteFollowup, type DeleteFollowupInput } from './deleteFollowup';
// Prospect lifecycle actions
export { createProspectOrg, type CreateProspectOrgInput } from './createProspectOrg';
export { addProspectContact, type AddProspectContactInput } from './addProspectContact';
export { logOutreach, type LogOutreachInput, OUTREACH_TYPES, OUTREACH_DIRECTIONS } from './logOutreach';
export { logResponse, type LogResponseInput, RESPONSE_STATUSES } from './logResponse';
export { logScreening, type LogScreeningInput } from './logScreening';
export { updateProspectStage, type UpdateProspectStageInput } from './updateProspectStage';
// Re-export prospect config from centralized config
export { PROSPECT_STAGE_VALUES as PROSPECT_STAGES, PROSPECT_SOURCE_VALUES as PROSPECT_SOURCES } from '@/lib/prospects/config';
export { disqualifyProspect, type DisqualifyProspectInput } from './disqualifyProspect';
export { convertToTrial, type ConvertToTrialInput } from './convertToTrial';
// Deal outcome actions
export { updateDealStage, type UpdateDealStageInput, DEAL_PIPELINE_STAGES } from './updateDealStage';
export { closeDealWon, type CloseDealWonInput } from './closeDealWon';
export { closeDealLost, type CloseDealLostInput } from './closeDealLost';
export { deferDeal, type DeferDealInput } from './deferDeal';
