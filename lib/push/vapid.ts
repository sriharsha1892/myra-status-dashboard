/**
 * VAPID Key Management for Web Push Notifications
 *
 * VAPID (Voluntary Application Server Identification) keys are used to:
 * 1. Identify the server sending push notifications
 * 2. Allow browsers to verify the notification source
 * 3. Prevent unauthorized push message sending
 */

import webPush from 'web-push';

// Environment variables for VAPID configuration
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:status@myra-ai.com';

/**
 * Validate that all required VAPID keys are configured
 */
export function validateVapidConfig(): boolean {
  if (!VAPID_PUBLIC_KEY) {
    console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured');
    return false;
  }
  if (!VAPID_PRIVATE_KEY) {
    console.error('VAPID_PRIVATE_KEY is not configured');
    return false;
  }
  return true;
}

/**
 * Initialize web-push with VAPID credentials
 * Must be called before sending any push notifications
 */
export function initializeWebPush(): void {
  if (!validateVapidConfig()) {
    throw new Error('VAPID keys not configured. Cannot initialize web-push.');
  }

  webPush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  console.log('Web Push initialized with VAPID credentials');
}

/**
 * Get the public VAPID key for client-side subscription
 * This is safe to expose to the client
 */
export function getPublicVapidKey(): string {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured');
  }
  return VAPID_PUBLIC_KEY;
}

/**
 * Convert the base64 VAPID key to Uint8Array for the Push API
 * Used client-side when subscribing
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Export the configured webPush instance
export { webPush };
