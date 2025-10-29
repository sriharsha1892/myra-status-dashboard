'use client';

import { useEffect, useRef } from 'react';
import { ProviderStatus } from '@/lib/types';

export function useStatusNotifications(providers: ProviderStatus[]) {
  const previousStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    // Check each provider for status changes
    providers.forEach((provider) => {
      const serviceName = provider.provider.displayName;
      const currentStatus = provider.status;
      const previousStatus = previousStatusRef.current[serviceName];

      // Check if user is subscribed to this service
      const key = `notify-${serviceName}`;
      const stored = localStorage.getItem(key);

      if (stored && previousStatus && previousStatus !== currentStatus) {
        try {
          const data = JSON.parse(stored);

          // Service is now operational and was not before
          if (currentStatus === 'operational' && data.subscribed) {
            // Send notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`${serviceName} is back online`, {
                body: `Service has been restored and is now operational`,
                icon: '/favicon.ico',
                tag: `resolved-${serviceName}`,
              });
            }

            // Remove subscription after notifying
            localStorage.removeItem(key);
          }
        } catch (e) {
          // Invalid data, ignore
        }
      }

      // Update previous status
      previousStatusRef.current[serviceName] = currentStatus;
    });
  }, [providers]);
}
