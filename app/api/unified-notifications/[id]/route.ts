import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/unified-notifications/[id]
 * Update notification (mark as read, archived, etc.)
 *
 * Body:
 * - status: 'unread' | 'read' | 'archived' | 'completed'
 * - archived_reason: string (optional, for archived status)
 * - mark_thread_complete: boolean (optional, marks all notifications in thread as completed)
 * - completion_note: string (optional, note about who handled it)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, archived_reason, mark_thread_complete, completion_note } = body;

    if (!status && !mark_thread_complete) {
      return NextResponse.json(
        { error: 'status or mark_thread_complete is required' },
        { status: 400 }
      );
    }

    // First, get the notification to access its thread_key
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('thread_key, user_id')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Check if user owns this notification
    if (notification.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Handle thread-wide completion (for shared notifications)
    if (mark_thread_complete) {
      // Get user info for completion note
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const handlerName = userData?.full_name || userData?.email || 'Someone';
      const completionMessage = completion_note || `Handled by ${handlerName}`;

      // Mark all notifications in this thread as read/archived
      const threadUpdates: any = {
        status: 'archived',
        archived_at: new Date().toISOString(),
        category: 'archived',
        archived_reason: completionMessage,
        read_at: new Date().toISOString()
      };

      const { data: updatedNotifications, error: threadError } = await supabase
        .from('notifications')
        .update(threadUpdates)
        .eq('thread_key', notification.thread_key)
        .select();

      if (threadError) throw threadError;

      return NextResponse.json({
        success: true,
        message: `Marked ${updatedNotifications?.length || 0} notification(s) in thread as completed`,
        notifications: updatedNotifications,
        handler: handlerName
      });
    }

    // Build update object for single notification
    const updates: any = { status };

    if (status === 'read') {
      updates.read_at = new Date().toISOString();
    }

    if (status === 'archived') {
      updates.archived_at = new Date().toISOString();
      updates.category = 'archived';
      if (archived_reason) {
        updates.archived_reason = archived_reason;
      }
    }

    // Update single notification
    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'Notification not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: data
    });

  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/unified-notifications/[id]
 * Delete a notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete notification (only if it belongs to the user)
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
