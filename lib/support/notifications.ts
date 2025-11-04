import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

type NotificationType = Database['public']['Tables']['notifications']['Row']['type'];

/**
 * Notify all watchers of a ticket about a change
 */
export async function notifyWatchers(
  ticketId: string,
  type: NotificationType,
  message: string,
  excludeUserId?: string
) {
  const supabase = createClient();

  try {
    // Get all watchers for this ticket
    const { data: watchers, error: watchersError } = await supabase
      .from('ticket_watchers')
      .select('user_id')
      .eq('ticket_id', ticketId);

    if (watchersError) throw watchersError;

    if (!watchers || watchers.length === 0) {
      return { success: true, notified: 0 };
    }

    // Filter out the user who made the change (optional)
    const userIdsToNotify = excludeUserId
      ? watchers.filter((w) => w.user_id !== excludeUserId).map((w) => w.user_id)
      : watchers.map((w) => w.user_id);

    if (userIdsToNotify.length === 0) {
      return { success: true, notified: 0 };
    }

    // Create notifications for all watchers
    const notifications = userIdsToNotify.map((userId) => ({
      user_id: userId,
      ticket_id: ticketId,
      type,
      message,
      is_read: false,
    }));

    const { error: notifyError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifyError) throw notifyError;

    return { success: true, notified: userIdsToNotify.length };
  } catch (error) {
    console.error('Error notifying watchers:', error);
    return { success: false, notified: 0, error };
  }
}

/**
 * Notify watchers when ticket status changes
 */
export async function notifyStatusChange(
  ticketId: string,
  ticketNumber: string,
  oldStatus: string,
  newStatus: string,
  changedByUserId: string
) {
  const message = `Ticket ${ticketNumber} status changed from "${oldStatus}" to "${newStatus}"`;
  return notifyWatchers(ticketId, 'status_change', message, changedByUserId);
}

/**
 * Notify watchers when a new comment is added
 */
export async function notifyNewComment(
  ticketId: string,
  ticketNumber: string,
  commenterId: string,
  commenterName: string
) {
  const message = `${commenterName} commented on ticket ${ticketNumber}`;
  return notifyWatchers(ticketId, 'comment', message, commenterId);
}

/**
 * Notify watchers when ticket is assigned
 */
export async function notifyAssignment(
  ticketId: string,
  ticketNumber: string,
  assignedTo: string,
  assignedByUserId: string
) {
  const message = `Ticket ${ticketNumber} was assigned to ${assignedTo}`;
  return notifyWatchers(ticketId, 'assigned', message, assignedByUserId);
}

/**
 * Notify a specific user when they are mentioned in a comment
 */
export async function notifyMention(
  ticketId: string,
  ticketNumber: string,
  mentionedUserId: string,
  mentionedByName: string
) {
  const supabase = createClient();
  const message = `${mentionedByName} mentioned you in ticket ${ticketNumber}`;

  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: mentionedUserId,
      ticket_id: ticketId,
      type: 'mention',
      message,
      is_read: false,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error notifying mention:', error);
    return { success: false, error };
  }
}
