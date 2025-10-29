'use client';

import { useState, useEffect } from 'react';

interface NotificationButtonProps {
  serviceName: string;
  currentStatus: string;
  onSubscribe?: (message: string) => void;
}

export default function NotificationButton({ serviceName, currentStatus, onSubscribe }: NotificationButtonProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === 'granted') {
        subscribeToService();
      }
    }
  };

  const subscribeToService = () => {
    setIsSubscribed(true);

    // Store in localStorage for this session
    const key = `notify-${serviceName}`;
    localStorage.setItem(key, JSON.stringify({
      subscribed: true,
      status: currentStatus,
      timestamp: Date.now(),
    }));

    // Show visual feedback toast
    if (onSubscribe) {
      onSubscribe(`Watching ${serviceName} for resolution`);
    }

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Subscribed to updates', {
        body: `You'll be notified when ${serviceName} status changes`,
        icon: '/favicon.ico',
        tag: 'subscription-confirm',
      });
    }
  };

  const unsubscribe = () => {
    setIsSubscribed(false);
    const key = `notify-${serviceName}`;
    localStorage.removeItem(key);
  };

  // Check if already subscribed
  useEffect(() => {
    const key = `notify-${serviceName}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setIsSubscribed(data.subscribed);
      } catch (e) {
        // Invalid data, ignore
      }
    }
  }, [serviceName]);

  if (currentStatus === 'operational') {
    return null; // Don't show button for operational services
  }

  if (permission === 'denied') {
    return null; // Can't show notifications
  }

  return (
    <div style={{ marginTop: '8px' }}>
      {!isSubscribed ? (
        <button
          onClick={requestNotificationPermission}
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            color: '#60a5fa',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
          }}
        >
          Notify when resolved
        </button>
      ) : (
        <button
          onClick={unsubscribe}
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '6px',
            color: '#34d399',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
          }}
        >
          Watching for resolution
        </button>
      )}
    </div>
  );
}
