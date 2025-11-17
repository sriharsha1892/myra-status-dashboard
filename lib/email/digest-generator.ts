/**
 * Email Digest Generator
 *
 * Aggregates notifications for users who prefer digest delivery
 * Generates daily and weekly digest emails with grouped notifications
 */

import { createClient } from '@/lib/supabase/server';
import { sendNotificationEmail } from '@/lib/email/send-notification-email';

export type DigestType = 'daily' | 'weekly';

export interface DigestNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  priority?: number;
  metadata?: any;
}

export interface DigestStats {
  totalNotifications: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  unreadCount: number;
}

export interface UserDigest {
  userEmail: string;
  userName: string;
  notifications: DigestNotification[];
  stats: DigestStats;
}

/**
 * Get the time period for digest query based on digest type
 * Daily: last 24 hours
 * Weekly: last 7 days
 */
function getDigestTimePeriod(digestType: DigestType): Date {
  const now = new Date();
  if (digestType === 'daily') {
    now.setHours(now.getHours() - 24);
  } else {
    now.setDate(now.getDate() - 7);
  }
  return now;
}

/**
 * Get the last digest send time for a user
 * Returns null if no digest was sent before
 */
async function getLastDigestTime(
  userEmail: string,
  digestType: DigestType
): Promise<Date | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('user_digest_history' as any)
      .select('sent_at')
      .eq('user_email', userEmail)
      .eq('digest_type', digestType)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single() as any;

    return data?.sent_at ? new Date(data.sent_at) : null;
  } catch {
    return null;
  }
}

/**
 * Get all users who want digest emails for the given digest type
 */
async function getUsersWithDigestPreference(
  digestType: DigestType
): Promise<string[]> {
  const supabase = await createClient();
  const deliveryFrequency = digestType === 'daily' ? 'daily_digest' : 'weekly_digest';

  const { data } = await supabase
    .from('user_notification_preferences' as any)
    .select('user_email')
    .eq('email_delivery_frequency', deliveryFrequency)
    .eq('enabled', true) as any;

  if (!data) return [];

  // Get unique user emails
  const uniqueEmails = [...new Set(data.map((pref: any) => pref.user_email))];
  return uniqueEmails;
}

/**
 * Get notifications for a user since the last digest or within time period
 */
async function getUserNotifications(
  userEmail: string,
  sinceDate: Date
): Promise<DigestNotification[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('notifications' as any)
    .select('*')
    .eq('user_email', userEmail)
    .gte('created_at', sinceDate.toISOString())
    .order('created_at', { ascending: false }) as any;

  return data || [];
}

/**
 * Calculate digest statistics from notifications
 */
function calculateDigestStats(notifications: DigestNotification[]): DigestStats {
  const stats: DigestStats = {
    totalNotifications: notifications.length,
    highPriorityCount: 0,
    mediumPriorityCount: 0,
    lowPriorityCount: 0,
    unreadCount: 0,
  };

  notifications.forEach((notif) => {
    if (!notif.read) {
      stats.unreadCount++;
    }

    const priority = notif.priority || 50;
    if (priority >= 80) {
      stats.highPriorityCount++;
    } else if (priority >= 50) {
      stats.mediumPriorityCount++;
    } else {
      stats.lowPriorityCount++;
    }
  });

  return stats;
}

/**
 * Get user's full name from email
 */
async function getUserFullName(email: string): Promise<string> {
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

/**
 * Generate digest for a single user
 */
async function generateUserDigest(
  userEmail: string,
  digestType: DigestType
): Promise<UserDigest | null> {
  // Get the time period to query
  const defaultSinceDate = getDigestTimePeriod(digestType);

  // Check last digest time - use whichever is more recent
  const lastDigestTime = await getLastDigestTime(userEmail, digestType);
  const sinceDate = lastDigestTime && lastDigestTime > defaultSinceDate
    ? lastDigestTime
    : defaultSinceDate;

  // Get notifications
  const notifications = await getUserNotifications(userEmail, sinceDate);

  // If no notifications, skip this user
  if (notifications.length === 0) {
    return null;
  }

  // Get user name
  const userName = await getUserFullName(userEmail);

  // Calculate stats
  const stats = calculateDigestStats(notifications);

  return {
    userEmail,
    userName,
    notifications,
    stats,
  };
}

/**
 * Record digest send in history
 */
async function recordDigestHistory(
  userEmail: string,
  digestType: DigestType,
  notificationCount: number
): Promise<void> {
  const supabase = await createClient();

  await supabase.from('user_digest_history' as any).insert({
    user_email: userEmail,
    digest_type: digestType,
    sent_at: new Date().toISOString(),
    notification_count: notificationCount,
  });
}

/**
 * Send digest email to a user
 */
async function sendDigestEmail(
  digest: UserDigest,
  digestType: DigestType
): Promise<{ success: boolean; error?: string }> {
  try {
    // Group notifications by priority
    const highPriority = digest.notifications.filter((n) => (n.priority || 50) >= 80);
    const mediumPriority = digest.notifications.filter(
      (n) => (n.priority || 50) >= 50 && (n.priority || 50) < 80
    );
    const lowPriority = digest.notifications.filter((n) => (n.priority || 50) < 50);

    // Send digest email
    const result = await sendNotificationEmail(
      digestType === 'daily' ? 'daily_digest' : 'weekly_digest',
      {
        to: digest.userEmail,
        toName: digest.userName,
        digestPeriod: digestType === 'daily' ? '24 hours' : '7 days',
        totalNotifications: digest.stats.totalNotifications,
        highPriorityCount: digest.stats.highPriorityCount,
        mediumPriorityCount: digest.stats.mediumPriorityCount,
        lowPriorityCount: digest.stats.lowPriorityCount,
        unreadCount: digest.stats.unreadCount,
        highPriorityNotifications: highPriority.map((n) => ({
          title: n.title,
          message: n.message,
          timestamp: new Date(n.created_at).toLocaleString(),
        })),
        mediumPriorityNotifications: mediumPriority.map((n) => ({
          title: n.title,
          message: n.message,
          timestamp: new Date(n.created_at).toLocaleString(),
        })),
        lowPriorityNotifications: lowPriority.map((n) => ({
          title: n.title,
          message: n.message,
          timestamp: new Date(n.created_at).toLocaleString(),
        })),
        actionUrl: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/support/notifications`,
      }
    );

    if (result.success) {
      // Record in history
      await recordDigestHistory(
        digest.userEmail,
        digestType,
        digest.stats.totalNotifications
      );
      return { success: true };
    } else {
      return { success: false, error: result.reason };
    }
  } catch (error: any) {
    console.error(`Error sending ${digestType} digest to ${digest.userEmail}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate and send digests for all users with the given preference
 * This is the main function called by cron jobs
 */
export async function generateAndSendDigests(
  digestType: DigestType
): Promise<{
  success: boolean;
  totalUsers: number;
  successfulSends: number;
  failedSends: number;
  errors: Array<{ userEmail: string; error: string }>;
}> {
  console.log(`Starting ${digestType} digest generation...`);

  const result = {
    success: true,
    totalUsers: 0,
    successfulSends: 0,
    failedSends: 0,
    errors: [] as Array<{ userEmail: string; error: string }>,
  };

  try {
    // Get all users who want this digest type
    const userEmails = await getUsersWithDigestPreference(digestType);
    result.totalUsers = userEmails.length;

    console.log(`Found ${userEmails.length} users with ${digestType} digest preference`);

    // Process each user
    for (const userEmail of userEmails) {
      try {
        // Generate digest for this user
        const digest = await generateUserDigest(userEmail, digestType);

        // Skip if no notifications
        if (!digest) {
          console.log(`No notifications for ${userEmail}, skipping...`);
          continue;
        }

        // Send digest email
        const sendResult = await sendDigestEmail(digest, digestType);

        if (sendResult.success) {
          result.successfulSends++;
          console.log(`Sent ${digestType} digest to ${userEmail} (${digest.stats.totalNotifications} notifications)`);
        } else {
          result.failedSends++;
          result.errors.push({
            userEmail,
            error: sendResult.error || 'Unknown error',
          });
          console.error(`Failed to send ${digestType} digest to ${userEmail}:`, sendResult.error);
        }
      } catch (error: any) {
        result.failedSends++;
        result.errors.push({
          userEmail,
          error: error.message || 'Unknown error',
        });
        console.error(`Error processing ${digestType} digest for ${userEmail}:`, error);
      }
    }

    console.log(`${digestType} digest generation completed:`, {
      totalUsers: result.totalUsers,
      successfulSends: result.successfulSends,
      failedSends: result.failedSends,
    });

    return result;
  } catch (error: any) {
    console.error(`Fatal error during ${digestType} digest generation:`, error);
    return {
      ...result,
      success: false,
      errors: [{ userEmail: 'system', error: error.message }],
    };
  }
}
