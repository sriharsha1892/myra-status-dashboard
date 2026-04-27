'use client';

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

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
      setError('Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-2">
          Sales operations
        </p>
        <h1 className="font-serif text-4xl leading-[1] text-neutral-900 mb-6">
          Sales documents
          <span className="font-serif italic text-neutral-400 ml-2">archive</span>
        </h1>

        <p className="text-sm text-neutral-600 mb-8 leading-relaxed">
          This view shows every quote and MSA across the team — status updates and stale tracking included. It's gated by a separate admin password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-300 placeholder:text-neutral-400 transition-colors"
            autoFocus
            disabled={isLoading}
          />

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
              <AlertCircle className="w-4 h-4 text-[#dc2626] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#991b1b]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!password || isLoading}
            className="w-full py-3 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Unlock'
            )}
          </button>
        </form>

        <p className="mt-8 pt-6 border-t border-neutral-200 text-[11px] text-neutral-400">
          Different from the regular quote password. Ask Adi if you don't have it.
        </p>
      </div>
    </div>
  );
}
