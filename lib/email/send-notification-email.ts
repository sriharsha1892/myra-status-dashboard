/**
 * Send Notification Emails
 *
 * High-level functions for sending notification emails using Brevo.
 * Handles template rendering, email composition, and delivery.
 */

import { render } from '@react-email/components';
import { sendEmailViaBrevo, getSenderConfig, getBaseUrl } from './brevo-client';
import {
  NotificationEmailType,
  MentionEmailData,
  TrialHandoffEmailData,
  AccountManagerNoteEmailData,
  DailyDigestEmailData,
  WeeklyDigestEmailData,
  EmailSendResult,
} from './types';

// Import email templates
import MentionNotification from '@/emails/MentionNotification';
import TrialHandoffNotification from '@/emails/TrialHandoffNotification';
import AccountManagerNote from '@/emails/AccountManagerNote';
import DailyDigest from '@/emails/DailyDigest';
import WeeklyDigest from '@/emails/WeeklyDigest';

/**
 * Send a notification email
 *
 * Routes to the appropriate email template based on type and sends via Brevo
 *
 * @param type - Type of notification email to send
 * @param data - Email data specific to the notification type
 * @returns Promise with send result
 */
export async function sendNotificationEmail(
  type: NotificationEmailType,
  data:
    | MentionEmailData
    | TrialHandoffEmailData
    | AccountManagerNoteEmailData
    | DailyDigestEmailData
    | WeeklyDigestEmailData
): Promise<EmailSendResult> {
  try {
    // Check if email sending is enabled
    if (!process.env.BREVO_API_KEY) {
      console.warn('Email sending skipped: BREVO_API_KEY not configured');
      return {
        success: false,
        reason: 'Email sending not configured',
      };
    }

    // Get sender configuration
    const sender = getSenderConfig();
    const baseUrl = getBaseUrl();

    // Prepare recipient
    const recipient = {
      email: data.to,
      name: data.toName || data.to.split('@')[0],
    };

    let subject: string;
    let htmlContent: string;
    let tags: string[];

    // Route to appropriate email template based on type
    switch (type) {
      case 'mention':
        const mentionData = data as MentionEmailData;
        subject = `You were mentioned in ${mentionData.orgName}`;
        tags = ['notification', 'mention'];
        htmlContent = await render(MentionNotification({ ...mentionData, baseUrl }));
        break;

      case 'trial_handoff':
        const handoffData = data as TrialHandoffEmailData;
        subject = `Trial handoff: ${handoffData.orgName}`;
        tags = ['notification', 'handoff'];
        htmlContent = await render(TrialHandoffNotification({ ...handoffData, baseUrl }));
        break;

      case 'account_manager_note':
        const noteData = data as AccountManagerNoteEmailData;
        subject = `New ${noteData.noteCategory} note: ${noteData.orgName}`;
        tags = ['notification', 'note'];
        htmlContent = await render(AccountManagerNote({ ...noteData, baseUrl }));
        break;

      case 'daily_digest':
        const dailyData = data as DailyDigestEmailData;
        subject = `Your daily digest - ${dailyData.totalCount} notifications`;
        tags = ['digest', 'daily'];
        htmlContent = await render(DailyDigest({ ...dailyData, baseUrl }));
        break;

      case 'weekly_digest':
        const weeklyData = data as WeeklyDigestEmailData;
        subject = `Your weekly digest - ${weeklyData.totalCount} notifications`;
        tags = ['digest', 'weekly'];
        htmlContent = await render(WeeklyDigest({ ...weeklyData, baseUrl }));
        break;

      default:
        return {
          success: false,
          reason: `Unknown email type: ${type}`,
        };
    }

    // Send via Brevo
    const result = await sendEmailViaBrevo({
      to: [recipient],
      sender,
      subject,
      htmlContent,
      tags,
    });

    if (result.success) {
      console.log(`📧 Email sent: ${type} to ${data.to} (messageId: ${result.messageId})`);
      return {
        success: true,
        messageId: result.messageId,
      };
    } else {
      console.error(`❌ Email failed: ${type} to ${data.to}`, result.error);
      return {
        success: false,
        error: result.error,
        reason: result.reason,
      };
    }
  } catch (error: any) {
    console.error('Error sending notification email:', error);
    return {
      success: false,
      error,
      reason: error.message || 'Unknown error',
    };
  }
}

/**
 * Batch send notification emails
 * Useful for sending multiple emails at once (e.g., digest emails)
 *
 * @param emails - Array of email configs to send
 * @returns Array of send results
 */
export async function batchSendNotificationEmails(
  emails: Array<{ type: NotificationEmailType; data: any }>
): Promise<EmailSendResult[]> {
  const results: EmailSendResult[] = [];

  for (const email of emails) {
    const result = await sendNotificationEmail(email.type, email.data);
    results.push(result);
  }

  return results;
}

