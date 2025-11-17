import { createClient } from '@/lib/supabase/server';
import { sendMentionEmail, sendAccountManagerNoteEmail } from './send-with-email';

interface CreateActivityNoteNotificationParams {
  noteId: string;
  orgId: string;
  orgName: string;
  noteCategory: string;
  noteText: string;
  actorEmail: string;
  actorName: string;
  mentionedEmails: string[];
}

/**
 * Create notifications in unified table for activity note mentions
 * Follows pattern from resource discussion notifications
 */
export async function createActivityNoteNotifications(
  params: CreateActivityNoteNotificationParams
): Promise<{ success: boolean; created: number; error?: any }> {
  try {
    const supabase = await createClient();

    if (!params.mentionedEmails || params.mentionedEmails.length === 0) {
      return { success: true, created: 0 };
    }

    // Get actor user ID
    const { data: actor } = await supabase
      .from('users' as any)
      .select('id')
      .eq('email', params.actorEmail)
      .single() as any;

    const actorId = actor?.id;

    // Get mentioned user IDs from emails
    const { data: mentionedUsers, error: usersError } = await supabase
      .from('users' as any)
      .select('id, email')
      .in('email', params.mentionedEmails) as any;

    if (usersError) {
      console.error('Error fetching mentioned users:', usersError);
      return { success: false, created: 0, error: usersError };
    }

    if (!mentionedUsers || mentionedUsers.length === 0) {
      return { success: true, created: 0 };
    }

    // Create preview from note text (first 100 chars)
    const notePreview = params.noteText.length > 100
      ? params.noteText.substring(0, 100) + '...'
      : params.noteText;

    // Build action URL - deep link to activity log tab
    const actionUrl = `/support/trials/${params.orgId}?tab=activitylog#note-${params.noteId}`;

    // Thread key for grouping
    const threadKey = `note:${params.noteId}`;

    // Base priority for mentions
    const priorityScore = 60;

    // Build notifications for unified table
    const unifiedNotifications = [];

    for (const user of mentionedUsers as any[]) {
      // Don't notify the actor
      if (user.email === params.actorEmail) {
        continue;
      }

      unifiedNotifications.push({
        user_id: user.id,
        entity_type: 'note',
        entity_id: params.noteId,
        entity_title: params.orgName,
        notification_type: 'mention',
        actor_id: actorId,
        title: `${params.actorName} mentioned you in ${params.orgName}`,
        message: notePreview,
        action_url: actionUrl,
        thread_key: threadKey,
        priority_score: priorityScore,
        status: 'unread',
      });
    }

    // Insert into unified notifications table
    if (unifiedNotifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(unifiedNotifications as any);

      if (insertError) {
        console.error('Error inserting unified notifications:', insertError);
        return { success: false, created: 0, error: insertError };
      }

      // Send email notifications asynchronously
      for (const user of mentionedUsers as any[]) {
        if (user.email !== params.actorEmail) {
          sendMentionEmail({
            recipientEmail: user.email,
            actorName: params.actorName,
            orgName: params.orgName,
            notePreview,
            actionUrl,
            notePriority: priorityScore,
          });
        }
      }
    }

    return { success: true, created: unifiedNotifications.length };
  } catch (error) {
    console.error('Error creating activity note notifications:', error);
    return { success: false, created: 0, error };
  }
}

/**
 * Notify account manager of new note if they're not the author
 */
export async function notifyAccountManagerOfNote(
  noteId: string,
  orgId: string,
  orgName: string,
  accountManagerEmail: string,
  noteCategory: string,
  noteText: string,
  actorEmail: string,
  actorName: string
): Promise<{ success: boolean; created: number }> {
  try {
    // Don't notify if account manager is the author
    if (accountManagerEmail === actorEmail) {
      return { success: true, created: 0 };
    }

    const supabase = await createClient();

    // Get user IDs
    const { data: users } = await supabase
      .from('users' as any)
      .select('id, email')
      .in('email', [accountManagerEmail, actorEmail]) as any;

    if (!users || users.length === 0) {
      return { success: true, created: 0 };
    }

    const accountManager = (users as any[]).find((u: any) => u.email === accountManagerEmail);
    const actor = (users as any[]).find((u: any) => u.email === actorEmail);

    if (!accountManager) {
      return { success: true, created: 0 };
    }

    const notePreview = noteText.length > 100
      ? noteText.substring(0, 100) + '...'
      : noteText;

    const actionUrl = `/support/trials/${orgId}?tab=activitylog#note-${noteId}`;
    const threadKey = `note:${noteId}`;

    // Lower priority for account manager notifications (not a direct mention)
    const priorityScore = 40;

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: accountManager.id,
        entity_type: 'note',
        entity_id: noteId,
        entity_title: orgName,
        notification_type: 'comment',
        actor_id: actor?.id,
        title: `New ${noteCategory} note in ${orgName}`,
        message: notePreview,
        action_url: actionUrl,
        thread_key: threadKey,
        priority_score: priorityScore,
        status: 'unread',
      } as any);

    if (error) {
      console.error('Error notifying account manager:', error);
      return { success: false, created: 0 };
    }

    // Send email notification asynchronously
    sendAccountManagerNoteEmail({
      recipientEmail: accountManagerEmail,
      orgName,
      noteCategory,
      notePreview,
      actionUrl,
      actorName,
      notePriority: priorityScore,
    });

    return { success: true, created: 1 };
  } catch (error) {
    console.error('Error in notifyAccountManagerOfNote:', error);
    return { success: false, created: 0 };
  }
}
