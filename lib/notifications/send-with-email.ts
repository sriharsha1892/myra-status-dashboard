/**
 * Notification + Email Integration
 *
 * Helper functions to send emails when notifications are created
 * Emails are sent asynchronously to avoid blocking the main flow
 * Respects user email delivery frequency preferences
 */

import { createClient } from '@/lib/supabase/server';
import { sendNotificationEmail } from '@/lib/email/send-notification-email';

/**
 * Check if user wants instant email for this notification type
 * Returns true if email should be sent immediately
 */
async function shouldSendInstantEmail(
  recipientEmail: string,
  notificationType: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('user_notification_preferences' as any)
      .select('email_delivery_frequency, enabled')
      .eq('user_email', recipientEmail)
      .eq('notification_type', notificationType)
      .single() as any;

    // If no preference found, default to instant delivery
    if (!data) return true;

    // Check if notification is enabled and set to instant delivery
    return data.enabled && data.email_delivery_frequency === 'instant';
  } catch (error) {
    // On error, default to sending (fail-open for better UX)
    console.error('Error checking email preferences:', error);
    return true;
  }
}

/**
 * Send email for a mention notification
 * Called after notification is created in database
 * Respects user email delivery preferences
 */
export async function sendMentionEmail(params: {
  recipientEmail: string;
  actorName: string;
  orgName: string;
  notePreview: string;
  actionUrl: string;
  notePriority: number;
}): Promise<void> {
  // Check if user wants instant emails for mentions
  const shouldSend = await shouldSendInstantEmail(params.recipientEmail, 'mention');

  if (!shouldSend) {
    console.log(`Skipping instant email for ${params.recipientEmail} - user prefers digest or disabled`);
    return;
  }

  // Send email asynchronously (don't await to avoid blocking)
  sendNotificationEmail('mention', {
    to: params.recipientEmail,
    toName: params.recipientEmail.split('@')[0],
    actorName: params.actorName,
    orgName: params.orgName,
    notePreview: params.notePreview,
    actionUrl: params.actionUrl,
    notePriority: params.notePriority,
  }).catch((error) => {
    console.error('Failed to send mention email:', error);
  });
}

/**
 * Send email for a trial handoff notification
 * Called after handoff notification is created in database
 * Respects user email delivery preferences
 */
export async function sendTrialHandoffEmail(params: {
  recipientEmail: string;
  orgName: string;
  previousAccountManager: string;
  newAccountManager: string;
  handoffReason: string;
  contextNotes?: string;
  actionUrl: string;
  actorName: string;
}): Promise<void> {
  // Check if user wants instant emails for assignments (handoffs)
  const shouldSend = await shouldSendInstantEmail(params.recipientEmail, 'assigned');

  if (!shouldSend) {
    console.log(`Skipping instant handoff email for ${params.recipientEmail} - user prefers digest or disabled`);
    return;
  }

  // Send email asynchronously (don't await to avoid blocking)
  sendNotificationEmail('trial_handoff', {
    to: params.recipientEmail,
    toName: params.recipientEmail.split('@')[0],
    orgName: params.orgName,
    previousAccountManager: params.previousAccountManager,
    newAccountManager: params.newAccountManager,
    handoffReason: params.handoffReason,
    contextNotes: params.contextNotes,
    actionUrl: params.actionUrl,
    actorName: params.actorName,
  }).catch((error) => {
    console.error('Failed to send trial handoff email:', error);
  });
}

/**
 * Send email for an account manager note notification
 * Called after note notification is created in database
 * Respects user email delivery preferences
 */
export async function sendAccountManagerNoteEmail(params: {
  recipientEmail: string;
  orgName: string;
  noteCategory: string;
  notePreview: string;
  actionUrl: string;
  actorName: string;
  notePriority: number;
}): Promise<void> {
  // Check if user wants instant emails for new notes
  const shouldSend = await shouldSendInstantEmail(params.recipientEmail, 'new_note');

  if (!shouldSend) {
    console.log(`Skipping instant note email for ${params.recipientEmail} - user prefers digest or disabled`);
    return;
  }

  // Send email asynchronously (don't await to avoid blocking)
  sendNotificationEmail('account_manager_note', {
    to: params.recipientEmail,
    toName: params.recipientEmail.split('@')[0],
    orgName: params.orgName,
    noteCategory: params.noteCategory,
    notePreview: params.notePreview,
    actionUrl: params.actionUrl,
    actorName: params.actorName,
    notePriority: params.notePriority,
  }).catch((error) => {
    console.error('Failed to send account manager note email:', error);
  });
}

/**
 * Get user's full name from database by email
 * Returns email username if full name not found
 */
export async function getUserFullName(email: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase
      .from('users' as any)
      .select('full_name')
      .eq('email', email)
      .single() as any;

    return user?.full_name || email.split('@')[0];
  } catch {
    return email.split('@')[0];
  }
}
