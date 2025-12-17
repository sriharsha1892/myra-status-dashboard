'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Lock, ArrowRight } from 'lucide-react';

interface PasswordReminderBannerProps {
  userEmail: string;
}

export default function PasswordReminderBanner({ userEmail }: PasswordReminderBannerProps) {
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner before
    const dismissed = localStorage.getItem(`password-reminder-dismissed-${userEmail}`);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, [userEmail]);

  const handleDismiss = () => {
    localStorage.setItem(`password-reminder-dismissed-${userEmail}`, 'true');
    setIsDismissed(true);
  };

  const handleChangePassword = () => {
    // Profile page no longer exists - this banner can be dismissed
    handleDismiss();
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-neutral-200 p-4 mb-6 rounded-lg shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-700" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 mb-1">
            Welcome! Consider changing your password
          </h3>
          <p className="text-sm text-amber-800 mb-3">
            For security, we recommend changing your temporary password to something memorable and secure.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleChangePassword}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-all"
            >
              Change Password
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDismiss}
              className="text-sm text-amber-700 hover:text-amber-900 font-medium transition-colors"
            >
              Remind me later
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-amber-100 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5 text-amber-700" />
        </button>
      </div>
    </div>
  );
}
