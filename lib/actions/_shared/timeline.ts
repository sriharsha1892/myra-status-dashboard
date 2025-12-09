/**
 * Timeline Event Utilities
 * Helper functions for creating timeline events from actions
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/db/schema';
import { insertOne } from './db';
import type { ActionError, DatabaseChange } from './types';

// ============ EVENT TYPES ============

/**
 * Event categories for timeline events
 */
export type EventCategory =
  | 'onboarding'
  | 'engagement'
  | 'communication'
  | 'feedback'
  | 'support'
  | 'milestones'
  | 'sales_notes'
  | 'learnings'
  | 'system'; // For system-generated events

/**
 * Common event types used by actions
 */
export type ActionEventType =
  // Organization events
  | 'org_created'
  | 'org_updated'
  | 'org_stage_changed'
  | 'org_deal_updated'
  // User events
  | 'user_added'
  | 'user_updated'
  // Ticket events
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_resolved'
  // Feature request events
  | 'feature_request_created'
  | 'feature_request_updated'
  // Roadmap events
  | 'roadmap_item_created'
  | 'roadmap_item_updated'
  // Note events
  | 'note_added'
  // Activity events
  | 'activity_logged'
  // Account management
  | 'account_manager_assigned'
  // Generic events
  | 'custom_event';

/**
 * Sentiment values for timeline events
 */
export type Sentiment = 'positive' | 'neutral' | 'negative';

/**
 * Severity levels for timeline events
 */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

// ============ INPUT TYPES ============

/**
 * Input for creating a timeline event
 */
export interface TimelineEventInput {
  /** Organization ID (required) */
  orgId: string;
  /** User ID (optional, for user-specific events) */
  userId?: string;
  /** Event type */
  eventType: ActionEventType | string;
  /** Event category */
  eventCategory?: EventCategory;
  /** Event title (short description) */
  title: string;
  /** Full description */
  description?: string;
  /** Event timestamp (defaults to now) */
  eventTimestamp?: Date | string;
  /** Who logged this event (user ID) */
  loggedBy?: string;
  /** Sentiment of the event */
  sentiment?: Sentiment;
  /** Severity level */
  severity?: Severity;
  /** Tags for the event */
  tags?: string[];
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Output from timeline event creation
 */
export interface TimelineEventOutput {
  eventId: string;
  eventType: string;
  title: string;
}

// ============ EVENT CREATION ============

/**
 * Create a timeline event for tracking activity
 * @param supabase - Supabase client
 * @param input - Event details
 * @returns Event ID and any error
 */
export async function createTimelineEvent(
  supabase: SupabaseClient,
  input: TimelineEventInput
): Promise<{
  data: TimelineEventOutput | null;
  error: ActionError | null;
  change: DatabaseChange | null;
}> {
  // Determine category from event type if not provided
  const category = input.eventCategory || inferCategory(input.eventType);

  // Determine sentiment and severity defaults
  const sentiment = input.sentiment || 'neutral';
  const severity = input.severity || inferSeverity(category, sentiment);

  const eventRecord = {
    org_id: input.orgId,
    user_id: input.userId || null,
    event_type: input.eventType,
    event_category: category,
    title: input.title,
    description: input.description || input.title,
    event_timestamp: input.eventTimestamp || new Date().toISOString(),
    logged_by: input.loggedBy || null,
    sentiment,
    severity,
    tags: input.tags || [],
    metadata: input.metadata || {},
  };

  const { data, error } = await insertOne(
    supabase,
    TABLES.TIMELINE_EVENTS,
    eventRecord
  );

  if (error) {
    return { data: null, error, change: null };
  }

  const eventId = data?.id;

  return {
    data: {
      eventId,
      eventType: input.eventType,
      title: input.title,
    },
    error: null,
    change: {
      table: TABLES.TIMELINE_EVENTS,
      operation: 'insert',
      record_id: eventId,
      new_values: eventRecord,
    },
  };
}

// ============ HELPER FACTORIES ============

/**
 * Create a timeline event for organization creation
 */
export function orgCreatedEvent(
  orgId: string,
  orgName: string,
  loggedBy?: string
): TimelineEventInput {
  return {
    orgId,
    eventType: 'org_created',
    eventCategory: 'milestones',
    title: `Organization "${orgName}" created`,
    description: `New organization "${orgName}" was added to the system`,
    loggedBy,
    sentiment: 'positive',
    severity: 'medium',
  };
}

/**
 * Create a timeline event for stage change
 */
export function stageChangedEvent(
  orgId: string,
  orgName: string,
  previousStage: string | undefined,
  newStage: string,
  loggedBy?: string
): TimelineEventInput {
  const direction = getStageDirection(previousStage, newStage);
  return {
    orgId,
    eventType: 'org_stage_changed',
    eventCategory: 'milestones',
    title: previousStage
      ? `Stage changed from "${previousStage}" to "${newStage}"`
      : `Stage set to "${newStage}"`,
    description: `${orgName}'s lifecycle stage was ${previousStage ? 'changed' : 'set'} to "${newStage}"`,
    loggedBy,
    sentiment: direction === 'forward' ? 'positive' : direction === 'backward' ? 'negative' : 'neutral',
    severity: 'medium',
    metadata: {
      previous_stage: previousStage,
      new_stage: newStage,
    },
  };
}

/**
 * Create a timeline event for user addition
 */
export function userAddedEvent(
  orgId: string,
  userName: string,
  userEmail: string,
  loggedBy?: string
): TimelineEventInput {
  return {
    orgId,
    eventType: 'user_added',
    eventCategory: 'onboarding',
    title: `User "${userName}" added`,
    description: `New user "${userName}" (${userEmail}) was added to the organization`,
    loggedBy,
    sentiment: 'positive',
    severity: 'low',
    metadata: {
      user_name: userName,
      user_email: userEmail,
    },
  };
}

/**
 * Create a timeline event for deal update
 */
export function dealUpdatedEvent(
  orgId: string,
  orgName: string,
  dealValue?: number,
  dealStatus?: string,
  loggedBy?: string
): TimelineEventInput {
  const parts: string[] = [];
  if (dealValue !== undefined) parts.push(`value: $${dealValue.toLocaleString()}`);
  if (dealStatus) parts.push(`status: ${dealStatus}`);

  return {
    orgId,
    eventType: 'org_deal_updated',
    eventCategory: 'sales_notes',
    title: `Deal updated for ${orgName}`,
    description: `Deal information updated: ${parts.join(', ')}`,
    loggedBy,
    sentiment: dealStatus === 'won' ? 'positive' : dealStatus === 'lost' ? 'negative' : 'neutral',
    severity: 'medium',
    metadata: {
      deal_value: dealValue,
      deal_status: dealStatus,
    },
  };
}

/**
 * Create a timeline event for ticket creation
 */
export function ticketCreatedEvent(
  orgId: string,
  ticketTitle: string,
  priority?: string,
  loggedBy?: string
): TimelineEventInput {
  return {
    orgId,
    eventType: 'ticket_created',
    eventCategory: 'support',
    title: `Support ticket: "${ticketTitle}"`,
    description: `New support ticket created${priority ? ` with ${priority} priority` : ''}`,
    loggedBy,
    sentiment: 'neutral',
    severity: priorityToSeverity(priority),
    metadata: {
      ticket_title: ticketTitle,
      priority,
    },
  };
}

/**
 * Create a timeline event for feature request
 */
export function featureRequestCreatedEvent(
  orgId: string,
  featureTitle: string,
  loggedBy?: string
): TimelineEventInput {
  return {
    orgId,
    eventType: 'feature_request_created',
    eventCategory: 'feedback',
    title: `Feature request: "${featureTitle}"`,
    description: `New feature request submitted: "${featureTitle}"`,
    loggedBy,
    sentiment: 'neutral',
    severity: 'low',
    metadata: {
      feature_title: featureTitle,
    },
  };
}

/**
 * Create a timeline event for note addition
 */
export function noteAddedEvent(
  orgId: string,
  noteCategory: string,
  notePreview: string,
  loggedBy?: string
): TimelineEventInput {
  return {
    orgId,
    eventType: 'note_added',
    eventCategory: 'sales_notes',
    title: `Note added (${noteCategory})`,
    description: notePreview.length > 200 ? notePreview.substring(0, 197) + '...' : notePreview,
    loggedBy,
    sentiment: 'neutral',
    severity: 'low',
    metadata: {
      note_category: noteCategory,
    },
  };
}

/**
 * Create a timeline event for activity logging
 */
export function activityLoggedEvent(
  orgId: string,
  activityType: string,
  title: string,
  loggedBy?: string
): TimelineEventInput {
  return {
    orgId,
    eventType: 'activity_logged',
    eventCategory: inferCategoryFromActivity(activityType),
    title,
    loggedBy,
    sentiment: 'neutral',
    severity: 'low',
    metadata: {
      activity_type: activityType,
    },
  };
}

// ============ INTERNAL HELPERS ============

/**
 * Infer category from event type
 */
function inferCategory(eventType: string): EventCategory {
  if (eventType.startsWith('org_') || eventType.includes('stage') || eventType.includes('deal')) {
    return 'milestones';
  }
  if (eventType.startsWith('user_') || eventType.includes('onboard')) {
    return 'onboarding';
  }
  if (eventType.startsWith('ticket_') || eventType.includes('support')) {
    return 'support';
  }
  if (eventType.startsWith('feature_') || eventType.includes('feedback')) {
    return 'feedback';
  }
  if (eventType.includes('note') || eventType.includes('activity')) {
    return 'sales_notes';
  }
  return 'system';
}

/**
 * Infer severity from category and sentiment
 */
function inferSeverity(category: EventCategory, sentiment: Sentiment): Severity {
  if (category === 'support' && sentiment === 'negative') return 'high';
  if (category === 'feedback' && sentiment === 'negative') return 'medium';
  if (category === 'milestones') return 'medium';
  return 'low';
}

/**
 * Determine stage progression direction
 */
function getStageDirection(
  previous: string | undefined,
  next: string
): 'forward' | 'backward' | 'neutral' {
  const stageOrder = ['trial', 'active', 'at_risk', 'churned', 'converted'];

  if (!previous) return 'neutral';

  const prevIndex = stageOrder.indexOf(previous.toLowerCase());
  const nextIndex = stageOrder.indexOf(next.toLowerCase());

  if (prevIndex === -1 || nextIndex === -1) return 'neutral';
  if (next === 'converted') return 'forward';
  if (next === 'churned') return 'backward';
  if (nextIndex > prevIndex) return 'forward';
  if (nextIndex < prevIndex) return 'backward';
  return 'neutral';
}

/**
 * Map priority to severity
 */
function priorityToSeverity(priority?: string): Severity {
  if (!priority) return 'low';
  const p = priority.toLowerCase();
  if (['urgent', 'critical', 'p0'].includes(p)) return 'critical';
  if (['high', 'p1'].includes(p)) return 'high';
  if (['medium', 'normal', 'p2'].includes(p)) return 'medium';
  return 'low';
}

/**
 * Infer category from activity type
 */
function inferCategoryFromActivity(activityType: string): EventCategory {
  const type = activityType.toLowerCase();
  if (type.includes('email') || type.includes('call') || type.includes('meeting')) {
    return 'communication';
  }
  if (type.includes('support') || type.includes('ticket')) {
    return 'support';
  }
  if (type.includes('feedback') || type.includes('survey')) {
    return 'feedback';
  }
  return 'sales_notes';
}
