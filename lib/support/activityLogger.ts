import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

type ActivityType = 'created' | 'status_changed' | 'assigned' | 'commented' | 'linked' | 'watched';

interface LogActivityParams {
  ticketId: string;
  userId: string;
  activityType: ActivityType;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Manually log a ticket activity
 * Note: 'created', 'status_changed', and 'assigned' are auto-logged via database triggers
 * This function is for manually logging 'commented', 'linked', and 'watched' events
 */
export async function logTicketActivity({
  ticketId,
  userId,
  activityType,
  oldValue = null,
  newValue = null,
  metadata = {},
}: LogActivityParams): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Get user profile for metadata
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', userId)
      .single();

    // Add user info to metadata
    const enrichedMetadata = {
      ...metadata,
      user_name: profile?.display_name || 'Unknown User',
      user_avatar: profile?.avatar_url,
    };

    const { error } = await supabase.from('ticket_activities').insert({
      ticket_id: ticketId,
      user_id: userId,
      activity_type: activityType,
      old_value: oldValue,
      new_value: newValue,
      metadata: enrichedMetadata,
    });

    if (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error logging activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log a comment activity
 */
export async function logCommentActivity(
  ticketId: string,
  userId: string,
  commentText: string
): Promise<{ success: boolean; error?: string }> {
  return logTicketActivity({
    ticketId,
    userId,
    activityType: 'commented',
    newValue: commentText.substring(0, 200), // Store first 200 chars
    metadata: {
      comment_length: commentText.length,
      comment_preview: commentText.substring(0, 100),
    },
  });
}

/**
 * Log a ticket link activity
 */
export async function logLinkActivity(
  ticketId: string,
  userId: string,
  linkedTicketNumber: string,
  linkType: 'blocks' | 'blocked_by' | 'related' | 'duplicate'
): Promise<{ success: boolean; error?: string }> {
  return logTicketActivity({
    ticketId,
    userId,
    activityType: 'linked',
    newValue: linkedTicketNumber,
    metadata: {
      linked_ticket: linkedTicketNumber,
      link_type: linkType,
    },
  });
}

/**
 * Log a watcher activity
 */
export async function logWatcherActivity(
  ticketId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return logTicketActivity({
    ticketId,
    userId,
    activityType: 'watched',
    metadata: {
      action: 'started_watching',
    },
  });
}

/**
 * Bulk log activities (useful for migrations or batch operations)
 */
export async function bulkLogActivities(
  activities: LogActivityParams[]
): Promise<{ success: boolean; error?: string; count?: number }> {
  const supabase = createClient();

  try {
    const activitiesToInsert = activities.map((activity) => ({
      ticket_id: activity.ticketId,
      user_id: activity.userId,
      activity_type: activity.activityType,
      old_value: activity.oldValue || null,
      new_value: activity.newValue || null,
      metadata: activity.metadata || {},
    }));

    const { error, count } = await supabase
      .from('ticket_activities')
      .insert(activitiesToInsert);

    if (error) {
      console.error('Error bulk logging activities:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error bulk logging activities:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
