'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers?: Array<{ name: string; displayName: string }>;
}

interface SubscriptionPreferences {
  email: string;
  allChanges: boolean;
  outagesOnly: boolean;
  majorOutagesOnly: boolean;
  selectedProviders: string[];
}

const STORAGE_KEY = 'statusSubscription';

export default function SubscribeModal({ isOpen, onClose, providers = [] }: SubscribeModalProps) {
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

  // Load existing subscription from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed: SubscriptionPreferences = JSON.parse(stored);
          setEmail(parsed.email);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
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

      // Save to localStorage for UI feedback
      const subscriptionData: SubscriptionPreferences = {
        email,
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
      // Call API to unsubscribe
      const response = await fetch('/api/status/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to unsubscribe');
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
          'bg-white/[0.03] backdrop-blur-2xl',
          'border border-white/10 rounded-2xl',
          'shadow-2xl shadow-black/20',
          'animate-fade-in'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Email Input */}
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
              Successfully subscribed to status alerts!
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
              disabled={isSubmitting || !preferences.allChanges && !preferences.outagesOnly && !preferences.majorOutagesOnly}
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
                  Subscribing...
                </>
              ) : isSubscribed ? (
                'Update Preferences'
              ) : (
                'Subscribe'
              )}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="px-5 pb-5">
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
