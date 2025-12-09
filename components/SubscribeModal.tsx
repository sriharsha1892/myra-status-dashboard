'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers?: Array<{ name: string; displayName: string }>;
}

interface SubscriptionPreferences {
  type: 'push' | 'email';
  email?: string;
  allChanges: boolean;
  outagesOnly: boolean;
  majorOutagesOnly: boolean;
  selectedProviders: string[];
  pushEndpoint?: string;
}

const STORAGE_KEY = 'statusSubscription';

// Check if push notifications are supported
function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Convert base64 to Uint8Array for push subscription
function urlBase64ToUint8Array(base64String: string): Uint8Array {
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

export default function SubscribeModal({ isOpen, onClose, providers = [] }: SubscribeModalProps) {
  const [subscriptionType, setSubscriptionType] = useState<'push' | 'email'>('push');
  const [email, setEmail] = useState('');
  const [preferences, setPreferences] = useState({
    allChanges: false,
    outagesOnly: true,
    majorOutagesOnly: false,
  });
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Check push support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPushSupported(isPushSupported());
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    }
  }, []);

  // Load existing subscription from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed: SubscriptionPreferences = JSON.parse(stored);
          setSubscriptionType(parsed.type || 'push');
          if (parsed.email) setEmail(parsed.email);
          setPreferences({
            allChanges: parsed.allChanges,
            outagesOnly: parsed.outagesOnly,
            majorOutagesOnly: parsed.majorOutagesOnly,
          });
          setSelectedProviders(parsed.selectedProviders || []);
          setIsSubscribed(true);
        } catch (e) {
          // Invalid stored data
        }
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handlePreferenceChange = (key: keyof typeof preferences) => {
    setPreferences((prev) => {
      // Only one preference can be active at a time
      return {
        allChanges: key === 'allChanges' ? !prev.allChanges : false,
        outagesOnly: key === 'outagesOnly' ? !prev.outagesOnly : false,
        majorOutagesOnly: key === 'majorOutagesOnly' ? !prev.majorOutagesOnly : false,
      };
    });
  };

  const toggleProvider = (providerName: string) => {
    setSelectedProviders((prev) =>
      prev.includes(providerName)
        ? prev.filter((p) => p !== providerName)
        : [...prev, providerName]
    );
  };

  // Subscribe to push notifications
  const subscribeToPush = async () => {
    // Request notification permission
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission !== 'granted') {
      throw new Error('Notification permission denied. Please enable notifications in your browser settings.');
    }

    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Get VAPID public key
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      throw new Error('Push notifications not configured on this server');
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    // Send subscription to server
    const response = await fetch('/api/status/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        preferences: {
          allChanges: preferences.allChanges,
          outagesOnly: preferences.outagesOnly,
          majorOutagesOnly: preferences.majorOutagesOnly,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to subscribe');
    }

    return subscription.endpoint;
  };

  // Subscribe to email notifications
  const subscribeToEmail = async () => {
    const response = await fetch('/api/status/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        preferences: {
          allChanges: preferences.allChanges,
          outagesOnly: preferences.outagesOnly,
          majorOutagesOnly: preferences.majorOutagesOnly,
        },
        providers: selectedProviders.length > 0 ? selectedProviders : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to subscribe');
    }

    return email;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      let endpoint: string;

      if (subscriptionType === 'push') {
        endpoint = await subscribeToPush();
      } else {
        endpoint = await subscribeToEmail();
      }

      // Save to localStorage for UI feedback
      const subscriptionData: SubscriptionPreferences = {
        type: subscriptionType,
        email: subscriptionType === 'email' ? email : undefined,
        pushEndpoint: subscriptionType === 'push' ? endpoint : undefined,
        ...preferences,
        selectedProviders,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptionData));

      setSubmitStatus('success');
      setIsSubscribed(true);

      // Close modal after success
      setTimeout(() => {
        onClose();
        setSubmitStatus('idle');
      }, 2000);
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsSubmitting(true);
    try {
      // Get stored subscription info
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      const storedType = parsed?.type || subscriptionType;

      if (storedType === 'push') {
        // Unsubscribe from push
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          // Unsubscribe from browser
          await subscription.unsubscribe();

          // Remove from server
          await fetch('/api/status/push-subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        }
      } else {
        // Unsubscribe from email
        const response = await fetch('/api/status/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: parsed?.email || email }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to unsubscribe');
        }
      }

      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY);
      setEmail('');
      setPreferences({
        allChanges: false,
        outagesOnly: true,
        majorOutagesOnly: false,
      });
      setSelectedProviders([]);
      setIsSubscribed(false);
      setSubscriptionType('push');
      setSubmitStatus('success');
      setErrorMessage('');

      // Show success briefly then close
      setTimeout(() => {
        onClose();
        setSubmitStatus('idle');
      }, 1500);
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Failed to unsubscribe');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-md',
          'max-h-[calc(100vh-2rem)]',
          'flex flex-col',
          'bg-white/[0.03] backdrop-blur-2xl',
          'border border-white/10 rounded-2xl',
          'shadow-2xl shadow-black/20',
          'animate-fade-in'
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isSubscribed ? 'Manage Subscription' : 'Subscribe to Alerts'}
              </h2>
              <p className="text-sm text-white/50">Get notified about status changes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              'text-white/40 hover:text-white/80',
              'bg-white/5 hover:bg-white/10',
              'transition-all duration-200'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form - scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Subscription Type Selector */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Notification Method
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSubscriptionType('push')}
                disabled={!pushSupported}
                className={cn(
                  'flex-1 px-4 py-3 rounded-xl text-sm font-medium',
                  'border transition-all duration-200',
                  'flex items-center justify-center gap-2',
                  subscriptionType === 'push'
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10',
                  !pushSupported && 'opacity-50 cursor-not-allowed'
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Browser Push
              </button>
              <button
                type="button"
                onClick={() => setSubscriptionType('email')}
                className={cn(
                  'flex-1 px-4 py-3 rounded-xl text-sm font-medium',
                  'border transition-all duration-200',
                  'flex items-center justify-center gap-2',
                  subscriptionType === 'email'
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </button>
            </div>
            {!pushSupported && (
              <p className="text-xs text-amber-400/80 mt-2">
                Push notifications are not supported in this browser
              </p>
            )}
            {subscriptionType === 'push' && notificationPermission === 'denied' && (
              <p className="text-xs text-red-400/80 mt-2">
                Notifications are blocked. Please enable them in browser settings.
              </p>
            )}
          </div>

          {/* Email Input - Only show for email type */}
          {subscriptionType === 'email' && (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className={cn(
                  'w-full px-4 py-3 rounded-xl',
                  'bg-white/5 border border-white/10',
                  'text-white placeholder:text-white/30',
                  'focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20',
                  'transition-all duration-200'
                )}
              />
            </div>
          )}

          {/* Push Info - Only show for push type */}
          {subscriptionType === 'push' && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-300">
                You'll receive desktop notifications when service status changes.
                No email required.
              </p>
            </div>
          )}

          {/* Alert Preferences */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-3">
              Alert Preferences
            </label>
            <div className="space-y-2">
              <PreferenceOption
                label="All Status Changes"
                description="Get notified about any status change"
                checked={preferences.allChanges}
                onChange={() => handlePreferenceChange('allChanges')}
              />
              <PreferenceOption
                label="Outages Only"
                description="Only when services go down"
                checked={preferences.outagesOnly}
                onChange={() => handlePreferenceChange('outagesOnly')}
              />
              <PreferenceOption
                label="Major Outages Only"
                description="Critical incidents affecting multiple services"
                checked={preferences.majorOutagesOnly}
                onChange={() => handlePreferenceChange('majorOutagesOnly')}
              />
            </div>
          </div>

          {/* Provider Selection (if providers are passed) */}
          {providers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-3">
                Watch Specific Services
                <span className="text-white/40 font-normal ml-2">(Optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {providers.map((provider) => (
                  <button
                    key={provider.name}
                    type="button"
                    onClick={() => toggleProvider(provider.name)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium',
                      'border transition-all duration-200',
                      selectedProviders.includes(provider.name)
                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    )}
                  >
                    {provider.displayName}
                  </button>
                ))}
              </div>
              {selectedProviders.length === 0 && (
                <p className="text-xs text-white/40 mt-2">
                  Leave empty to receive alerts for all services
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {submitStatus === 'error' && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Success Message */}
          {submitStatus === 'success' && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {subscriptionType === 'push'
                ? 'Push notifications enabled!'
                : 'Successfully subscribed to status alerts!'}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {isSubscribed && (
              <button
                type="button"
                onClick={handleUnsubscribe}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium',
                  'bg-red-500/10 text-red-400 hover:bg-red-500/20',
                  'border border-red-500/20',
                  'transition-all duration-200'
                )}
              >
                Unsubscribe
              </button>
            )}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                (!preferences.allChanges && !preferences.outagesOnly && !preferences.majorOutagesOnly) ||
                (subscriptionType === 'push' && notificationPermission === 'denied') ||
                (subscriptionType === 'email' && !email)
              }
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold',
                'bg-blue-500 hover:bg-blue-600 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200',
                'flex items-center justify-center gap-2'
              )}
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {subscriptionType === 'push' ? 'Enabling...' : 'Subscribing...'}
                </>
              ) : isSubscribed ? (
                'Update Preferences'
              ) : subscriptionType === 'push' ? (
                'Enable Notifications'
              ) : (
                'Subscribe'
              )}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            You can unsubscribe at any time. We respect your inbox.
          </p>
        </div>
      </div>
    </div>
  );
}

// Preference option component
function PreferenceOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl cursor-pointer',
        'border transition-all duration-200',
        checked
          ? 'bg-blue-500/10 border-blue-500/30'
          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
      )}
    >
      <div className="pt-0.5">
        <div
          className={cn(
            'w-5 h-5 rounded-md border-2 flex items-center justify-center',
            'transition-all duration-200',
            checked
              ? 'bg-blue-500 border-blue-500'
              : 'bg-transparent border-white/30'
          )}
        >
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-white/50">{description}</div>
      </div>
    </label>
  );
}
