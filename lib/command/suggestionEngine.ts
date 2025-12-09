/**
 * Suggestion Engine - Follow-up suggestions after action completion
 *
 * Analyzes completed actions and suggests relevant next steps.
 */

import type { CommandAction } from './types';

export interface FollowUpSuggestion {
  id: string;
  label: string;
  description: string;
  action: CommandAction;
  prefillCommand: string;
  relevanceScore: number;
  category: 'engagement' | 'update' | 'create' | 'track';
}

interface CompletedAction {
  action: CommandAction;
  orgName?: string;
  userName?: string;
  fields?: Record<string, any>;
}

// Suggestion rules based on completed action
const SUGGESTION_RULES: Record<CommandAction, (ctx: CompletedAction) => FollowUpSuggestion[]> = {
  LOG_ACTIVITY: (ctx) => {
    const suggestions: FollowUpSuggestion[] = [];
    const orgName = ctx.orgName || '[org]';
    const activityType = ctx.fields?.activity_type || 'activity';

    // After logging activity, suggest stage update or follow-up
    if (activityType === 'demo' || activityType === 'meeting') {
      suggestions.push({
        id: 'update_stage_after_demo',
        label: 'Update to Trial Active',
        description: 'Move to trial_active stage after demo',
        action: 'UPDATE_STAGE',
        prefillCommand: `Move ${orgName} to trial_active`,
        relevanceScore: 0.85,
        category: 'update',
      });
      suggestions.push({
        id: 'schedule_followup',
        label: 'Schedule Follow-up',
        description: 'Schedule a follow-up meeting',
        action: 'SCHEDULE_FOLLOWUP',
        prefillCommand: `Schedule follow-up for ${orgName} in 1 week`,
        relevanceScore: 0.80,
        category: 'engagement',
      });
    }

    // After query activity, suggest adding a note
    if (activityType === 'query' || activityType === 'support') {
      suggestions.push({
        id: 'add_note_after_query',
        label: 'Add Note',
        description: 'Document the interaction details',
        action: 'ADD_NOTE',
        prefillCommand: `Note for ${orgName}: `,
        relevanceScore: 0.75,
        category: 'track',
      });
    }

    return suggestions;
  },

  UPDATE_DEAL: (ctx) => {
    const suggestions: FollowUpSuggestion[] = [];
    const orgName = ctx.orgName || '[org]';
    const dealValue = ctx.fields?.deal_value;

    // Large deal value -> suggest stage update
    if (dealValue && dealValue > 20000) {
      suggestions.push({
        id: 'update_stage_large_deal',
        label: 'Update to Negotiating',
        description: 'Move to negotiating stage for large deals',
        action: 'UPDATE_STAGE',
        prefillCommand: `Move ${orgName} to negotiating`,
        relevanceScore: 0.90,
        category: 'update',
      });
      suggestions.push({
        id: 'track_momentum',
        label: 'Update Momentum',
        description: 'Track deal momentum status',
        action: 'UPDATE_MOMENTUM',
        prefillCommand: `Set ${orgName} momentum to fast_track`,
        relevanceScore: 0.75,
        category: 'track',
      });
    }

    // Add note after deal update
    suggestions.push({
      id: 'add_note_after_deal',
      label: 'Add Note',
      description: 'Document deal context',
      action: 'ADD_NOTE',
      prefillCommand: `Note for ${orgName}: Deal discussion - `,
      relevanceScore: 0.70,
      category: 'track',
    });

    return suggestions;
  },

  UPDATE_STAGE: (ctx) => {
    const suggestions: FollowUpSuggestion[] = [];
    const orgName = ctx.orgName || '[org]';
    const stage = ctx.fields?.lifecycle_stage;

    if (stage === 'trial_active') {
      suggestions.push({
        id: 'log_activity_trial_active',
        label: 'Log Onboarding Activity',
        description: 'Track their first activity',
        action: 'LOG_ACTIVITY',
        prefillCommand: `Log onboarding at ${orgName}`,
        relevanceScore: 0.85,
        category: 'engagement',
      });
      suggestions.push({
        id: 'schedule_check_in',
        label: 'Schedule Check-in',
        description: 'Schedule a check-in call',
        action: 'SCHEDULE_FOLLOWUP',
        prefillCommand: `Schedule check-in for ${orgName} in 3 days`,
        relevanceScore: 0.80,
        category: 'engagement',
      });
    }

    if (stage === 'customer') {
      suggestions.push({
        id: 'update_deal_customer',
        label: 'Update Deal Value',
        description: 'Set the final contract value',
        action: 'UPDATE_DEAL',
        prefillCommand: `Update ${orgName} deal to $`,
        relevanceScore: 0.90,
        category: 'update',
      });
      suggestions.push({
        id: 'add_celebration_note',
        label: 'Add Note',
        description: 'Document the win!',
        action: 'ADD_NOTE',
        prefillCommand: `Note for ${orgName}: Customer signed! `,
        relevanceScore: 0.75,
        category: 'track',
      });
    }

    if (stage === 'churned' || stage === 'lost') {
      suggestions.push({
        id: 'add_churn_note',
        label: 'Document Reason',
        description: 'Record why they churned',
        action: 'ADD_NOTE',
        prefillCommand: `Note for ${orgName}: Churned because `,
        relevanceScore: 0.95,
        category: 'track',
      });
      suggestions.push({
        id: 'log_competitor',
        label: 'Log Competitor',
        description: 'Track if lost to a competitor',
        action: 'LOG_COMPETITOR',
        prefillCommand: `Lost ${orgName} to `,
        relevanceScore: 0.80,
        category: 'track',
      });
    }

    return suggestions;
  },

  CREATE_ORG: (ctx) => {
    const suggestions: FollowUpSuggestion[] = [];
    const orgName = ctx.orgName || ctx.fields?.org_name || '[org]';

    suggestions.push({
      id: 'add_user_after_org',
      label: 'Add User',
      description: 'Add a primary contact',
      action: 'CREATE_USER',
      prefillCommand: `Add user  at ${orgName} as `,
      relevanceScore: 0.95,
      category: 'create',
    });
    suggestions.push({
      id: 'log_first_activity',
      label: 'Log First Activity',
      description: 'Record initial engagement',
      action: 'LOG_ACTIVITY',
      prefillCommand: `Log demo at ${orgName}`,
      relevanceScore: 0.85,
      category: 'engagement',
    });
    suggestions.push({
      id: 'update_deal_new_org',
      label: 'Set Deal Value',
      description: 'Set initial deal estimate',
      action: 'UPDATE_DEAL',
      prefillCommand: `Update ${orgName} deal to $`,
      relevanceScore: 0.75,
      category: 'update',
    });

    return suggestions;
  },

  CREATE_USER: (ctx) => {
    const suggestions: FollowUpSuggestion[] = [];
    const userName = ctx.userName || ctx.fields?.name || '[user]';
    const orgName = ctx.orgName || '[org]';

    suggestions.push({
      id: 'log_activity_new_user',
      label: 'Log Activity',
      description: `Record ${userName}'s first activity`,
      action: 'LOG_ACTIVITY',
      prefillCommand: `${userName} at ${orgName} ran `,
      relevanceScore: 0.85,
      category: 'engagement',
    });
    suggestions.push({
      id: 'update_stakeholder',
      label: 'Set Influence Level',
      description: 'Tag their decision-making power',
      action: 'UPDATE_STAKEHOLDER',
      prefillCommand: `${userName} is a decision_maker`,
      relevanceScore: 0.80,
      category: 'track',
    });

    return suggestions;
  },

  ADD_NOTE: (ctx) => {
    const suggestions: FollowUpSuggestion[] = [];
    const orgName = ctx.orgName || '[org]';

    suggestions.push({
      id: 'log_activity_after_note',
      label: 'Log Activity',
      description: 'Track related engagement',
      action: 'LOG_ACTIVITY',
      prefillCommand: `Log call at ${orgName}`,
      relevanceScore: 0.70,
      category: 'engagement',
    });
    suggestions.push({
      id: 'schedule_followup_after_note',
      label: 'Schedule Follow-up',
      description: 'Set a reminder',
      action: 'SCHEDULE_FOLLOWUP',
      prefillCommand: `Schedule follow-up for ${orgName} in `,
      relevanceScore: 0.65,
      category: 'engagement',
    });

    return suggestions;
  },

  CREATE_TICKET: (ctx) => {
    const suggestions: FollowUpSuggestion[] = [];
    const orgName = ctx.orgName || '[org]';

    suggestions.push({
      id: 'add_note_ticket',
      label: 'Add Note',
      description: 'Document ticket context',
      action: 'ADD_NOTE',
      prefillCommand: `Note for ${orgName}: Ticket details - `,
      relevanceScore: 0.75,
      category: 'track',
    });

    return suggestions;
  },

  // Default empty suggestions for other actions
  QUICK_STATUS_UPDATE: () => [],
  UPDATE_ORG: () => [],
  UPDATE_USER: () => [],
  CREATE_FEATURE_REQUEST: () => [],
  CREATE_ROADMAP_ITEM: () => [],
  CREATE_TIMELINE_EVENT: () => [],
  ASSIGN_ACCOUNT_MANAGER: () => [],
  SCHEDULE_FOLLOWUP: () => [],
  UPDATE_STAKEHOLDER: () => [],
  LOG_COMPETITOR: () => [],
  TRACK_FEATURE_INTEREST: () => [],
  UPDATE_MOMENTUM: () => [],
  DELETE_ORG: () => [],
  DELETE_USER: () => [],
  DELETE_TICKET: () => [],
  DELETE_FEATURE_REQUEST: () => [],
  DELETE_ROADMAP_ITEM: () => [],
  DELETE_TIMELINE_EVENT: () => [],
  DELETE_NOTE: () => [],
  DELETE_FOLLOWUP: () => [],
  BULK_UPDATE_STAGE: () => [],
  BULK_ASSIGN_AM: () => [],

  // Prospect lifecycle actions
  CREATE_PROSPECT_ORG: (ctx) => {
    const orgName = ctx.orgName || '[org]';
    return [{
      id: 'add_contact_after_prospect',
      label: 'Add Contact',
      description: 'Add a contact to the prospect org',
      action: 'ADD_PROSPECT_CONTACT',
      prefillCommand: `Add contact to ${orgName}`,
      relevanceScore: 0.90,
      category: 'create',
    }, {
      id: 'log_outreach_after_prospect',
      label: 'Log First Outreach',
      description: 'Log initial outreach activity',
      action: 'LOG_OUTREACH',
      prefillCommand: `Sent email to ${orgName}`,
      relevanceScore: 0.85,
      category: 'engagement',
    }];
  },
  ADD_PROSPECT_CONTACT: (ctx) => {
    const orgName = ctx.orgName || '[org]';
    return [{
      id: 'log_outreach_after_contact',
      label: 'Log Outreach',
      description: 'Log outreach to new contact',
      action: 'LOG_OUTREACH',
      prefillCommand: `Emailed ${ctx.fields?.contact_name || 'contact'} at ${orgName}`,
      relevanceScore: 0.85,
      category: 'engagement',
    }];
  },
  LOG_OUTREACH: (ctx) => {
    const orgName = ctx.orgName || '[org]';
    return [{
      id: 'schedule_followup_after_outreach',
      label: 'Schedule Follow-up',
      description: 'Schedule a follow-up',
      action: 'SCHEDULE_FOLLOWUP',
      prefillCommand: `Follow up with ${orgName} in 3 days`,
      relevanceScore: 0.80,
      category: 'engagement',
    }];
  },
  LOG_RESPONSE: (ctx) => {
    const orgName = ctx.orgName || '[org]';
    const status = ctx.fields?.response_status;
    if (status === 'positive') {
      return [{
        id: 'update_stage_positive',
        label: 'Update to Responded',
        description: 'Move prospect to responded stage',
        action: 'UPDATE_PROSPECT_STAGE',
        prefillCommand: `${orgName} responded positively`,
        relevanceScore: 0.85,
        category: 'update',
      }, {
        id: 'schedule_demo',
        label: 'Schedule Demo',
        description: 'Schedule a demo call',
        action: 'UPDATE_PROSPECT_STAGE',
        prefillCommand: `Schedule demo for ${orgName}`,
        relevanceScore: 0.80,
        category: 'engagement',
      }];
    }
    return [];
  },
  LOG_SCREENING: (ctx) => {
    const orgName = ctx.orgName || '[org]';
    const icpScore = ctx.fields?.icp_fit_score;
    if (icpScore && icpScore >= 70) {
      return [{
        id: 'schedule_demo_high_icp',
        label: 'Schedule Demo',
        description: 'High ICP fit - schedule demo',
        action: 'UPDATE_PROSPECT_STAGE',
        prefillCommand: `Move ${orgName} to demo scheduled`,
        relevanceScore: 0.90,
        category: 'engagement',
      }];
    }
    return [];
  },
  UPDATE_PROSPECT_STAGE: (ctx) => {
    const orgName = ctx.orgName || '[org]';
    const stage = ctx.fields?.prospect_stage;
    if (stage === 'demo_done') {
      return [{
        id: 'convert_after_demo',
        label: 'Convert to Trial',
        description: 'Start trial after successful demo',
        action: 'CONVERT_TO_TRIAL',
        prefillCommand: `Start trial for ${orgName}`,
        relevanceScore: 0.85,
        category: 'update',
      }];
    }
    return [];
  },
  DISQUALIFY_PROSPECT: () => [],
  CONVERT_TO_TRIAL: (ctx) => {
    const orgName = ctx.orgName || '[org]';
    return [{
      id: 'schedule_checkin',
      label: 'Schedule Check-in',
      description: 'Schedule first week check-in',
      action: 'SCHEDULE_FOLLOWUP',
      prefillCommand: `Check in with ${orgName} in 1 week`,
      relevanceScore: 0.85,
      category: 'engagement',
    }];
  },

  // Deal outcome actions
  UPDATE_DEAL_STAGE: (ctx) => {
    const orgName = ctx.orgName || '[org]';
    const stage = ctx.fields?.deal_pipeline_stage;
    if (stage === 'negotiation') {
      return [{
        id: 'log_negotiation_call',
        label: 'Log Call',
        description: 'Log negotiation call',
        action: 'LOG_ACTIVITY',
        prefillCommand: `Had negotiation call with ${orgName}`,
        relevanceScore: 0.80,
        category: 'engagement',
      }];
    }
    return [];
  },
  CLOSE_DEAL_WON: (ctx) => {
    const orgName = ctx.orgName || '[org]';
    return [{
      id: 'update_to_customer',
      label: 'Mark as Customer',
      description: 'Update stage to customer',
      action: 'UPDATE_STAGE',
      prefillCommand: `${orgName} is now a customer`,
      relevanceScore: 0.90,
      category: 'update',
    }];
  },
  CLOSE_DEAL_LOST: () => [],
  DEFER_DEAL: (ctx) => {
    const orgName = ctx.orgName || '[org]';
    return [{
      id: 'schedule_reengagement',
      label: 'Schedule Re-engagement',
      description: 'Schedule follow-up for deferred date',
      action: 'SCHEDULE_FOLLOWUP',
      prefillCommand: `Re-engage ${orgName} on ${ctx.fields?.deferred_until || 'deferred date'}`,
      relevanceScore: 0.85,
      category: 'engagement',
    }];
  },
};

/**
 * Get follow-up suggestions based on completed action
 */
export function getSuggestions(completedAction: CompletedAction): FollowUpSuggestion[] {
  const ruleGenerator = SUGGESTION_RULES[completedAction.action];
  if (!ruleGenerator) return [];

  const suggestions = ruleGenerator(completedAction);

  // Sort by relevance score
  return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3);
}

/**
 * Get contextual suggestions based on multiple recent actions
 */
export function getContextualSuggestions(
  recentActions: CompletedAction[],
  focusedOrgName?: string
): FollowUpSuggestion[] {
  if (recentActions.length === 0) return [];

  // Get suggestions from most recent action
  const mostRecent = recentActions[0];
  const suggestions = getSuggestions(mostRecent);

  // If org is focused, customize prefill commands
  if (focusedOrgName) {
    return suggestions.map(s => ({
      ...s,
      prefillCommand: s.prefillCommand.replace('[org]', focusedOrgName),
    }));
  }

  return suggestions;
}

export default getSuggestions;
