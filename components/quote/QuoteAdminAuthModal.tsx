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
        setError('Server not configured. Set QUOTE_ADMIN_PASSWORD in env.');
      } else {
        setError('Incorrect password.');
        setPassword('');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Sales Document Admin</h1>
              <p className="text-sm text-neutral-300">Restricted view</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-neutral-500" />
            <h2 className="text-sm font-medium text-neutral-700">Admin password required</h2>
          </div>

          <p className="text-sm text-neutral-600 mb-6">
            This view shows every quote and MSA across the team, including status updates and stale tracking.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full px-4 py-3 mb-4 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-neutral-500 transition-colors"
              autoFocus
              disabled={isLoading}
            />

            {error && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!password || isLoading}
              className="w-full py-3 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Unlock admin view'
              )}
            </button>
          </form>
        </div>

        <div className="px-8 py-4 bg-neutral-50 border-t border-neutral-100">
          <p className="text-xs text-neutral-500 text-center">
            Separate from the regular quote password. Ask Adi if you don't have it.
          </p>
        </div>
      </div>
    </div>
  );
}
