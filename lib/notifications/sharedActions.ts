/**
 * Shared Notification Actions
 * Helper functions for managing shared notifications across multiple users
 */

import { authenticatedFetch } from '@/lib/api-client';

/**
 * Mark a notification thread as complete
 * When one admin handles a shared notification, all admins see it as completed
 *
 * @param notificationId - The ID of any notification in the thread
 * @param completionNote - Optional note about how it was handled
 * @returns Promise with the result
 */
export async function markNotificationThreadComplete(
  notificationId: string,
  completionNote?: string
): Promise<{ success: boolean; message?: string; handler?: string; error?: string }> {
  try {
    const response = await authenticatedFetch(`/api/unified-notifications/${notificationId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        mark_thread_complete: true,
        completion_note: completionNote
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to mark thread complete'
      };
    }

    return {
      success: true,
      message: data.message,
      handler: data.handler
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Mark a single notification as read (without affecting others in thread)
 *
 * @param notificationId - The notification ID
 * @returns Promise with the result
 */
export async function markNotificationRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authenticatedFetch(`/api/unified-notifications/${notificationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'read' })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to mark as read'
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Send a notification to all super admins
 * Useful for urgent issues that need any admin's attention
 *
 * @param params - Notification parameters
 * @returns Promise with the result
 */
export async function notifyAllSuperAdmins(params: {
  entity_type: 'note' | 'ticket' | 'roadmap_item' | 'meeting' | 'trial_org';
  entity_id: string;
  entity_title: string;
  notification_type: 'mention' | 'assigned' | 'comment' | 'status_change' | 'issue_linked' | 'watching_update' | 'trial_expiring' | 'support_ticket' | 'error_report' | 'new_note' | 'feature_proposal' | 'issue';
  title: string;
  message: string;
  action_url: string;
  priority_score?: number;
}): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // First, get all super admin IDs from the API
    const usersResponse = await authenticatedFetch('/api/admin/users');
    const usersData = await usersResponse.json();

    if (!usersResponse.ok) {
      return {
        success: false,
        error: 'Failed to fetch admin users'
      };
    }

    // Filter for super admins
    const superAdminIds = usersData.users
      ?.filter((u: any) => u.role === 'Admin' || u.is_super_admin)
      ?.map((u: any) => u.id) || [];

    if (superAdminIds.length === 0) {
      return {
        success: false,
        error: 'No super admins found'
      };
    }

    // Send notification
    const response = await authenticatedFetch('/api/unified-notifications', {
      method: 'POST',
      body: JSON.stringify({
        ...params,
        mentioned_user_ids: superAdminIds,
        priority_score: params.priority_score || 85
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send notifications'
      };
    }

    return {
      success: true,
      count: data.count
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Example usage in a component:
 *
 * ```typescript
 * import { markNotificationThreadComplete, notifyAllSuperAdmins } from '@/lib/notifications/sharedActions';
 *
 * // In a notification item component:
 * const handleMarkComplete = async () => {
 *   const result = await markNotificationThreadComplete(
 *     notification.id,
 *     'Assigned to John Doe - Trial approved'
 *   );
 *
 *   if (result.success) {
 *     toast.success(`Marked as handled by ${result.handler}`);
 *     // Refresh notifications list
 *   } else {
 *     toast.error(result.error);
 *   }
 * };
 *
 * // When creating a new trial:
 * const notifyAdmins = async () => {
 *   const result = await notifyAllSuperAdmins({
 *     entity_type: 'trial_org',
 *     entity_id: trialId,
 *     entity_title: 'Acme Corp',
 *     notification_type: 'assigned',
 *     title: 'New Trial Request',
 *     message: 'Acme Corp needs attention',
 *     action_url: `/support/trials/${trialId}`,
 *     priority_score: 90
 *   });
 *
 *   if (result.success) {
 *     toast.success(`Notified ${result.count} admins`);
 *   }
 * };
 * ```
 */
