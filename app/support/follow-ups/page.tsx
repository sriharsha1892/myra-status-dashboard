'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FollowUp {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  follow_up_type: string;
  due_date: string;
  due_time: string | null;
  priority: string;
  status: string;
  notes: string | null;
  outcome: string | null;
  completed_at: string | null;
  snoozed_until: string | null;
  snooze_count: number;
  trial_organizations?: {
    org_name: string;
    current_stage: string;
  };
  trial_users?: {
    name: string;
    email: string;
  };
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
};

const statusColors: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  snoozed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
};

const typeIcons: Record<string, string> = {
  call: '📞',
  email: '📧',
  meeting: '📅',
  proposal: '📄',
  demo: '🎬',
  check_in: '✅',
  general: '📌',
  task: '📋',
};

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchFollowUps();
  }, [statusFilter]);

  const fetchFollowUps = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      params.set('limit', '100');

      const response = await fetch(`/api/follow-ups?${params}`);
      if (!response.ok) throw new Error('Failed to fetch follow-ups');
      const data = await response.json();
      setFollowUps(data.follow_ups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load follow-ups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const response = await fetch(`/api/follow-ups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (response.ok) {
        fetchFollowUps();
      }
    } catch (err) {
      console.error('Failed to complete follow-up:', err);
    }
  };

  const handleSnooze = async (id: string, days: number = 1) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + days);
    const snoozeDateStr = snoozeDate.toISOString().split('T')[0];

    try {
      const response = await fetch(`/api/follow-ups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'snoozed',
          snoozed_until: snoozeDateStr,
        }),
      });
      if (response.ok) {
        fetchFollowUps();
      }
    } catch (err) {
      console.error('Failed to snooze follow-up:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;

    try {
      const response = await fetch(`/api/follow-ups/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchFollowUps();
      }
    } catch (err) {
      console.error('Failed to delete follow-up:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} overdue`, isOverdue: true };
    }
    if (diffDays === 0) {
      return { text: 'Today', isOverdue: false };
    }
    if (diffDays === 1) {
      return { text: 'Tomorrow', isOverdue: false };
    }

    return {
      text: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      isOverdue: false,
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Follow-ups
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your scheduled follow-ups and tasks
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Follow-up
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex rounded-lg bg-white p-1 shadow dark:bg-gray-800">
            {['all', 'pending', 'snoozed', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        ) : followUps.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              No follow-ups found
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {followUps.map((item) => {
              const dateInfo = formatDate(item.due_date);
              return (
                <div
                  key={item.id}
                  className={`rounded-lg bg-white p-4 shadow dark:bg-gray-800 ${
                    dateInfo.isOverdue ? 'border-l-4 border-red-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Complete button */}
                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleComplete(item.id)}
                          className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 text-gray-400 hover:border-green-500 hover:text-green-500 dark:border-gray-600"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      {item.status === 'completed' && (
                        <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{typeIcons[item.follow_up_type] || '📌'}</span>
                          <h3 className={`font-medium ${
                            item.status === 'completed'
                              ? 'text-gray-400 line-through dark:text-gray-500'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {item.title}
                          </h3>
                        </div>

                        {item.description && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          {item.trial_organizations?.org_name && (
                            <Link
                              href={`/support/trials/${item.org_id}`}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {item.trial_organizations.org_name}
                            </Link>
                          )}
                          <span className={`${dateInfo.isOverdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                            {dateInfo.text}
                          </span>
                          {item.due_time && (
                            <span className="text-gray-500">at {item.due_time}</span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[item.priority]}`}>
                            {item.priority}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status]}`}>
                            {item.status}
                          </span>
                          {item.snooze_count > 0 && (
                            <span className="text-xs text-gray-400">
                              (snoozed {item.snooze_count}x)
                            </span>
                          )}
                        </div>

                        {item.outcome && (
                          <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                            Outcome: {item.outcome}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {item.status !== 'completed' && (
                      <div className="flex items-center gap-2">
                        <div className="relative group">
                          <button
                            className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                            title="Snooze"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <div className="absolute right-0 top-full z-10 hidden w-32 rounded-lg bg-white py-1 shadow-lg group-hover:block dark:bg-gray-800">
                            <button
                              onClick={() => handleSnooze(item.id, 1)}
                              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              Tomorrow
                            </button>
                            <button
                              onClick={() => handleSnooze(item.id, 3)}
                              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              In 3 days
                            </button>
                            <button
                              onClick={() => handleSnooze(item.id, 7)}
                              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              Next week
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Create Follow-up
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Use slash commands like <code>/fu Acme call tomorrow</code> to create follow-ups quickly.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
