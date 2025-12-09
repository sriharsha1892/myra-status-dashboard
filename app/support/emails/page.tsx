'use client';

import { useState, useEffect } from 'react';
import { EmailPasteModal } from '@/components/email/EmailPasteModal';
import { EmailCard } from '@/components/email/EmailCard';
import type { ParsedEmailWithRelations, ParsedEmail } from '@/lib/email/types';

interface EmailStats {
  total: number;
  this_week: number;
  by_sentiment: Record<string, number>;
  by_urgency: Record<string, number>;
  action_items_pending: number;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<ParsedEmailWithRelations[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = async () => {
    try {
      const response = await fetch('/api/email');
      if (!response.ok) throw new Error('Failed to fetch emails');
      const data = await response.json();

      // Fetch full details for each email
      const fullEmails = await Promise.all(
        data.emails.map(async (email: ParsedEmail) => {
          const detailRes = await fetch(`/api/email/${email.id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            return detailData.email;
          }
          return email;
        })
      );

      setEmails(fullEmails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/email/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchEmails(), fetchStats()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleEmailParsed = (email: ParsedEmailWithRelations) => {
    setEmails((prev) => [email, ...prev]);
    fetchStats();
  };

  const handleActionUpdate = async (itemId: string, status: string) => {
    try {
      const response = await fetch(`/api/email/action-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Refresh emails to get updated data
        await fetchEmails();
        await fetchStats();
      }
    } catch (err) {
      console.error('Failed to update action item:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Email Intelligence
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Parse and analyze customer emails for insights and action items
          </p>
        </div>
        <button
          onClick={() => setShowPasteModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Parse Email
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Emails</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">This Week</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{stats.this_week}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Actions</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{stats.action_items_pending}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Positive</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{stats.by_sentiment.positive || 0}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Negative</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{stats.by_sentiment.negative || 0}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : emails.length === 0 ? (
        /* Empty State */
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No emails parsed yet</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Get started by pasting an email to extract insights and action items.
          </p>
          <button
            onClick={() => setShowPasteModal(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Parse Your First Email
          </button>
        </div>
      ) : (
        /* Email List */
        <div className="space-y-6">
          {emails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              onActionUpdate={handleActionUpdate}
            />
          ))}
        </div>
      )}

      {/* Paste Modal */}
      <EmailPasteModal
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        onSuccess={handleEmailParsed}
      />
    </div>
  );
}
