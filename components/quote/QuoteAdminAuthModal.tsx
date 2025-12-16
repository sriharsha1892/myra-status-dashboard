'use client';

import React, { useState } from 'react';
import { Shield, Lock, AlertCircle } from 'lucide-react';

interface QuoteAdminAuthModalProps {
  onSuccess: () => void;
}

export function QuoteAdminAuthModal({ onSuccess }: QuoteAdminAuthModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/quote/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else if (data.error === 'Server configuration error') {
        setError('Server not configured. Contact admin to set QUOTE_ADMIN_PASSWORD.');
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                Quote Admin
              </h1>
              <p className="text-sm text-amber-200">Protected Access</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-neutral-500" />
            <h2 className="text-sm font-medium text-neutral-700">
              Admin Access Required
            </h2>
          </div>

          <p className="text-sm text-neutral-600 mb-6">
            This area contains sensitive business data. Enter the admin password to continue.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="admin-password" className="sr-only">
                Admin Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500 transition-colors"
                autoFocus
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!password || isLoading}
              className="w-full py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Access Admin Dashboard'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-neutral-50 border-t border-neutral-100">
          <p className="text-xs text-neutral-500 text-center">
            For authorized administrators only. All access is logged.
          </p>
        </div>
      </div>
    </div>
  );
}
