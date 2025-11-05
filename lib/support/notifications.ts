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
      .from('ticket_watchers' as any)
      .select('user_id')
      .eq('ticket_id', ticketId) as any;

    if (watchersError) throw watchersError;

    if (!watchers || watchers.length === 0) {
      return { success: true, notified: 0 };
    }

    // Filter out the user who made the change (optional)
    const userIdsToNotify = excludeUserId
      ? (watchers as any[]).filter((w: any) => w.user_id !== excludeUserId).map((w: any) => w.user_id)
      : (watchers as any[]).map((w: any) => w.user_id);

    if (userIdsToNotify.length === 0) {
      return { success: true, notified: 0 };
    }

    // Map notification type to preference type
    const preferenceTypeMap: Record<string, string> = {
      'status_change': 'ticket_status_change',
      'assigned': 'ticket_assigned',
      'mention': 'mention',
      'comment': 'new_note', // Comments map to new_note preference
    };
    const preferenceType = preferenceTypeMap[type] || type;

    // Get user emails for preference checking
    const { data: users, error: usersError } = await supabase
      .from('users' as any)
      .select('id, email')
      .in('id', userIdsToNotify) as any;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      // Continue without preference filtering if we can't get users
    }

    let filteredUserIds = userIdsToNotify;

    if (users && users.length > 0) {
      const userEmails = (users as any[]).map((u: any) => u.email);

      // Fetch user preferences
      const { data: preferences } = await supabase
        .from('user_notification_preferences' as any)
        .select('user_email, notification_type, enabled')
        .in('user_email', userEmails)
        .eq('notification_type', preferenceType) as any;

      // Create a map of users who have disabled this notification type
      const disabledUserEmails = new Set(
        ((preferences as any[]) || [])
          .filter((p: any) => !p.enabled)
          .map((p: any) => p.user_email)
      );

      // Filter users based on preferences
      const userEmailToIdMap = new Map((users as any[]).map((u: any) => [u.email, u.id]));
      filteredUserIds = userIdsToNotify.filter(userId => {
        const user = (users as any[]).find((u: any) => u.id === userId);
        if (!user) return true; // Keep if we can't find user (fail open)
        return !disabledUserEmails.has(user.email); // Filter out if disabled
      });
    }

    if (filteredUserIds.length === 0) {
      return { success: true, notified: 0 };
    }

    // Create notifications for filtered watchers
    const notifications = filteredUserIds.map((userId) => ({
      user_id: userId,
      ticket_id: ticketId,
      type,
      message,
      is_read: false,
    }));

    const { error: notifyError } = await supabase
      .from('notifications' as any)
      .insert(notifications as any);

    if (notifyError) throw notifyError;

    return { success: true, notified: filteredUserIds.length };
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
    // Check if user has mentions enabled
    const { data: user } = await supabase
      .from('users' as any)
      .select('email')
      .eq('id', mentionedUserId)
      .single() as any;

    if (user?.email) {
      const { data: preference } = await supabase
        .from('user_notification_preferences' as any)
        .select('enabled')
        .eq('user_email', user.email)
        .eq('notification_type', 'mention')
        .single() as any;

      // If preference exists and is disabled, don't send notification
      if (preference && !(preference as any).enabled) {
        return { success: true, skipped: true };
      }
    }

    const { error } = await supabase.from('notifications' as any).insert({
      user_id: mentionedUserId,
      ticket_id: ticketId,
      type: 'mention',
      message,
      is_read: false,
    } as any);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error notifying mention:', error);
    return { success: false, error };
  }
}
