/**
 * Teams Notification Dispatcher
 *
 * Handles sending notifications to Microsoft Teams based on ticket events.
 * Checks notification rules and logs all messages sent.
 */

import { createClient } from '@/lib/supabase/server';
import { getActiveTeamsIntegration, GraphClient } from './graphClient';
import {
  newTicketCard,
  statusChangedCard,
  priorityChangedCard,
  commentCard,
  assignedCard,
  resolvedCard,
  Ticket,
  Comment,
} from './adaptiveCards';

export type NotificationEventType =
  | 'new_ticket'
  | 'status_changed'
  | 'priority_changed'
  | 'comment_added'
  | 'ticket_assigned'
  | 'ticket_resolved';

export interface NotificationEventData {
  ticket: Ticket;
  oldStatus?: string;
  newStatus?: string;
  oldPriority?: string;
  newPriority?: string;
  comment?: Comment;
  assigneeName?: string;
}

/**
 * Check if notification should be sent based on rules
 */
function shouldSendNotification(
  eventType: NotificationEventType,
  notificationRules: any
): boolean {
  if (!notificationRules) {
    // Default: send all notifications
    return true;
  }

  const ruleMap: Record<NotificationEventType, string> = {
    new_ticket: 'newTickets',
    status_changed: 'statusChanges',
    priority_changed: 'priorityChanges',
    comment_added: 'newComments',
    ticket_assigned: 'assignedTickets',
    ticket_resolved: 'resolvedTickets',
  };

  const ruleKey = ruleMap[eventType];
  return notificationRules[ruleKey] !== false; // Default to true if not explicitly disabled
}

/**
 * Get adaptive card for event type
 */
function getAdaptiveCard(
  eventType: NotificationEventType,
  data: NotificationEventData
): any {
  switch (eventType) {
    case 'new_ticket':
      return newTicketCard(data.ticket);

    case 'status_changed':
      if (!data.oldStatus || !data.newStatus) {
        throw new Error('oldStatus and newStatus required for status_changed event');
      }
      return statusChangedCard(data.ticket, data.oldStatus, data.newStatus);

    case 'priority_changed':
      if (!data.oldPriority || !data.newPriority) {
        throw new Error('oldPriority and newPriority required for priority_changed event');
      }
      return priorityChangedCard(data.ticket, data.oldPriority, data.newPriority);

    case 'comment_added':
      if (!data.comment) {
        throw new Error('comment required for comment_added event');
      }
      return commentCard(data.ticket, data.comment);

    case 'ticket_assigned':
      if (!data.assigneeName) {
        throw new Error('assigneeName required for ticket_assigned event');
      }
      return assignedCard(data.ticket, data.assigneeName);

    case 'ticket_resolved':
      return resolvedCard(data.ticket);

    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }
}

/**
 * Log Teams message to database
 */
async function logTeamsMessage(
  ticketId: string,
  channelId: string,
  teamsMessageId: string,
  conversationId?: string
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('teams_messages').insert({
      ticket_id: ticketId,
      teams_message_id: teamsMessageId,
      channel_id: channelId,
      conversation_id: conversationId,
    });

    if (error) {
      console.error('Failed to log Teams message:', error);
    }
  } catch (error) {
    console.error('Error logging Teams message:', error);
  }
}

/**
 * Send Teams notification for a ticket event
 *
 * @param ticketId - ID of the ticket
 * @param eventType - Type of event that triggered the notification
 * @param data - Event-specific data
 * @returns true if notification was sent successfully, false otherwise
 */
export async function sendTeamsNotification(
  ticketId: string,
  eventType: NotificationEventType,
  data: NotificationEventData
): Promise<boolean> {
  try {
    // Get active Teams integration
    const integration = await getActiveTeamsIntegration();

    if (!integration) {
      console.log('No active Teams integration found, skipping notification');
      return false;
    }

    // Check notification rules
    if (!shouldSendNotification(eventType, integration.notification_rules)) {
      console.log(`Notification skipped based on rules: ${eventType}`);
      return false;
    }

    // Create Graph client
    const client = new GraphClient(integration.access_token);

    // Generate adaptive card
    const adaptiveCard = getAdaptiveCard(eventType, data);

    // Send message to Teams channel
    const response = await client.sendMessage(
      integration.team_id,
      integration.channel_id,
      adaptiveCard
    );

    // Log the message
    await logTeamsMessage(
      ticketId,
      integration.channel_id,
      response.id,
      response.id // Using message id as conversation id
    );

    console.log(`Teams notification sent successfully: ${eventType} for ticket ${ticketId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send Teams notification for ${eventType}:`, error);
    return false;
  }
}

/**
 * Send notification for new ticket
 */
export async function notifyNewTicket(ticket: Ticket): Promise<boolean> {
  return sendTeamsNotification(ticket.id, 'new_ticket', { ticket });
}

/**
 * Send notification for status change
 */
export async function notifyStatusChanged(
  ticket: Ticket,
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  // Special case: send resolved notification
  if (newStatus === 'Resolved') {
    return sendTeamsNotification(ticket.id, 'ticket_resolved', { ticket });
  }

  return sendTeamsNotification(ticket.id, 'status_changed', {
    ticket,
    oldStatus,
    newStatus,
  });
}

/**
 * Send notification for priority change
 */
export async function notifyPriorityChanged(
  ticket: Ticket,
  oldPriority: string,
  newPriority: string
): Promise<boolean> {
  return sendTeamsNotification(ticket.id, 'priority_changed', {
    ticket,
    oldPriority,
    newPriority,
  });
}

/**
 * Send notification for new comment
 */
export async function notifyCommentAdded(
  ticket: Ticket,
  comment: Comment
): Promise<boolean> {
  return sendTeamsNotification(ticket.id, 'comment_added', {
    ticket,
    comment,
  });
}

/**
 * Send notification for ticket assignment
 */
export async function notifyTicketAssigned(
  ticket: Ticket,
  assigneeName: string
): Promise<boolean> {
  return sendTeamsNotification(ticket.id, 'ticket_assigned', {
    ticket,
    assigneeName,
  });
}

/**
 * Send notification for ticket resolved
 */
export async function notifyTicketResolved(ticket: Ticket): Promise<boolean> {
  return sendTeamsNotification(ticket.id, 'ticket_resolved', { ticket });
}

/**
 * Batch send notifications (for testing or bulk operations)
 */
export async function sendBatchNotifications(
  notifications: Array<{
    ticketId: string;
    eventType: NotificationEventType;
    data: NotificationEventData;
  }>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    try {
      const success = await sendTeamsNotification(
        notification.ticketId,
        notification.eventType,
        notification.data
      );

      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Add delay between messages to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to send notification in batch:', error);
      failed++;
    }
  }

  return { sent, failed };
}
