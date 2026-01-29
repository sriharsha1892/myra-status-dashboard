'use client';

import { useState, useEffect } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { GtmAccessRequired } from '@/components/gtm/GtmAccessRequired';
import { GtmDashboard } from '@/components/gtm';

export default function GtmDashboardPage() {
  const [gtmEmail, setGtmEmail] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check cookie-based auth on mount
  useEffect(() => {
    fetch('/api/gtm/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setGtmEmail(data.email);
        }
      })
      .catch(() => {})
      .finally(() => setIsCheckingAuth(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/gtm/auth', { method: 'DELETE' });
    setGtmEmail(null);
  };

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Show access required if not authenticated
  if (!gtmEmail) {
    return <GtmAccessRequired />;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header with logout */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-neutral-900">GTM Dashboard</h1>
            <span className="text-sm text-neutral-400">{gtmEmail}</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/quote/admin/pipeline"
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Pipeline Manager
            </a>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <GtmDashboard />
    </div>
  );
}
