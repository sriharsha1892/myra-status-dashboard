/**
 * Push Notification Sending Utilities
 *
 * Handles sending push notifications to subscribed users
 * when status changes occur.
 */

import { webPush, initializeWebPush, validateVapidConfig } from './vapid';
import { createServiceClient } from '@/lib/supabase/service';
import type { ServiceStatus } from '@/lib/types';

// Push subscription from database
interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  preferences: {
    allChanges?: boolean;
    outagesOnly?: boolean;
    majorOutagesOnly?: boolean;
  };
  created_at: string;
}

// Notification payload
interface StatusNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

// Status to notification mapping
const STATUS_MESSAGES: Record<ServiceStatus, { title: string; body: string; severity: 'info' | 'warning' | 'critical' }> = {
  operational: {
    title: 'All Systems Operational',
    body: 'All services are now running normally.',
    severity: 'info',
  },
  degraded_performance: {
    title: 'Performance Degradation',
    body: 'Some services are experiencing slower than normal response times.',
    severity: 'warning',
  },
  partial_outage: {
    title: 'Partial Service Outage',
    body: 'Some services are currently unavailable.',
    severity: 'critical',
  },
  major_outage: {
    title: 'Major Service Outage',
    body: 'Multiple critical services are currently unavailable.',
    severity: 'critical',
  },
  under_maintenance: {
    title: 'Scheduled Maintenance',
    body: 'Services are undergoing planned maintenance.',
    severity: 'info',
  },
  unknown: {
    title: 'Status Unknown',
    body: 'Unable to determine current service status.',
    severity: 'warning',
  },
};

/**
 * Check if a subscription should receive a notification based on preferences
 */
function shouldNotify(
  subscription: PushSubscription,
  newStatus: ServiceStatus,
  previousStatus?: ServiceStatus
): boolean {
  const prefs = subscription.preferences;

  // If allChanges is true, notify on any change
  if (prefs.allChanges) {
    return newStatus !== previousStatus;
  }

  // If majorOutagesOnly, only notify on major_outage
  if (prefs.majorOutagesOnly) {
    return newStatus === 'major_outage';
  }

  // If outagesOnly (default), notify on any outage type
  if (prefs.outagesOnly) {
    const outageStatuses: ServiceStatus[] = ['partial_outage', 'major_outage'];
    return outageStatuses.includes(newStatus);
  }

  // Default: notify on all changes
  return newStatus !== previousStatus;
}

/**
 * Send a push notification to a single subscription
 */
async function sendToSubscription(
  subscription: PushSubscription,
  notification: StatusNotification
): Promise<{ success: boolean; error?: string }> {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webPush.sendNotification(
      pushSubscription,
      JSON.stringify(notification),
      {
        TTL: 60 * 60, // 1 hour
        urgency: 'high',
      }
    );
    return { success: true };
  } catch (error: any) {
    // Handle expired/invalid subscriptions
    if (error.statusCode === 404 || error.statusCode === 410) {
      // Subscription is no longer valid, should be removed
      return { success: false, error: 'subscription_expired' };
    }
    console.error('Push send error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notifications to all subscribers for a status change
 */
export async function sendStatusPush(
  newStatus: ServiceStatus,
  previousStatus?: ServiceStatus,
  affectedServices?: string[]
): Promise<{
  sent: number;
  failed: number;
  expired: number;
}> {
  // Initialize web-push if not already done
  if (!validateVapidConfig()) {
    console.error('VAPID not configured, skipping push notifications');
    return { sent: 0, failed: 0, expired: 0 };
  }

  try {
    initializeWebPush();
  } catch (error) {
    console.error('Failed to initialize web-push:', error);
    return { sent: 0, failed: 0, expired: 0 };
  }

  const supabase = createServiceClient();

  // Fetch all active subscriptions
  const { data: subscriptions, error } = await (supabase
    .from('push_subscriptions') as any)
    .select('*');

  if (error) {
    console.error('Failed to fetch push subscriptions:', error);
    return { sent: 0, failed: 0, expired: 0 };
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No push subscriptions found');
    return { sent: 0, failed: 0, expired: 0 };
  }

  // Build notification payload
  const statusInfo = STATUS_MESSAGES[newStatus] || STATUS_MESSAGES.unknown;
  const notification: StatusNotification = {
    title: statusInfo.title,
    body: affectedServices?.length
      ? `${statusInfo.body} Affected: ${affectedServices.join(', ')}`
      : statusInfo.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'status-update',
    url: '/status',
    requireInteraction: statusInfo.severity === 'critical',
  };

  let sent = 0;
  let failed = 0;
  let expired = 0;
  const expiredIds: string[] = [];

  // Send to all eligible subscriptions
  await Promise.all(
    subscriptions.map(async (subscription: PushSubscription) => {
      // Check preferences
      if (!shouldNotify(subscription, newStatus, previousStatus)) {
        return;
      }

      const result = await sendToSubscription(subscription, notification);

      if (result.success) {
        sent++;
      } else if (result.error === 'subscription_expired') {
        expired++;
        expiredIds.push(subscription.id);
      } else {
        failed++;
      }
    })
  );

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    await (supabase
      .from('push_subscriptions') as any)
      .delete()
      .in('id', expiredIds);
    console.log(`Cleaned up ${expiredIds.length} expired push subscriptions`);
  }

  console.log(`Push notifications: ${sent} sent, ${failed} failed, ${expired} expired`);

  return { sent, failed, expired };
}

/**
 * Send a test push notification to a specific subscription
 */
export async function sendTestPush(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  }
): Promise<boolean> {
  if (!validateVapidConfig()) {
    throw new Error('VAPID not configured');
  }

  initializeWebPush();

  const notification: StatusNotification = {
    title: 'Test Notification',
    body: 'Push notifications are working!',
    icon: '/favicon.ico',
    tag: 'test',
    url: '/status',
  };

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webPush.sendNotification(
      pushSubscription,
      JSON.stringify(notification)
    );
    return true;
  } catch (error) {
    console.error('Test push failed:', error);
    return false;
  }
}
