'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="mr-card w-full max-w-[400px] p-7" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2.5 mb-6">
          <Image src="/logo-myra.svg" alt="myRA" width={94} height={28} className="h-[28px] w-auto" priority unoptimized />
        </div>

        <h1 className="text-[20px] font-bold tracking-[-0.02em] leading-tight">Quotes register</h1>
        <p className="mt-2 text-[13.5px] font-normal text-[var(--fg-dim)] leading-relaxed">
          Every quote the team has sent, grouped by account. This view uses a separate admin password.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="mr-input"
            autoFocus
            disabled={isLoading}
          />

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[9px] bg-[var(--danger-bg)] border border-[var(--danger-border)]">
              <AlertCircle className="w-4 h-4 text-[var(--danger-ink)] flex-shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-[var(--danger-ink)]">{error}</p>
            </div>
          )}

          <button type="submit" disabled={!password || isLoading} className="mr-btn mr-btn-solid w-full h-10">
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Unlock'
            )}
          </button>
        </form>

        <p className="mt-6 pt-5 border-t border-[var(--hairline)] text-[12px] font-normal text-[var(--fg-faint)]">
          Different from the regular quote password. Ask Adi if you don&apos;t have it.
        </p>
      </div>
    </div>
  );
}
