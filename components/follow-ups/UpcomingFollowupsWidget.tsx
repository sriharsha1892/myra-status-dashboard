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
  trial_organizations?: {
    org_name: string;
    current_stage: string;
  };
}

interface UpcomingData {
  overdue: FollowUp[];
  today: FollowUp[];
  upcoming: FollowUp[];
  summary: {
    total_pending: number;
    overdue_count: number;
    today_count: number;
    upcoming_count: number;
  };
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
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

export function UpcomingFollowupsWidget() {
  const [data, setData] = useState<UpcomingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFollowups();
  }, []);

  const fetchFollowups = async () => {
    try {
      const response = await fetch('/api/follow-ups/upcoming');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
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
        fetchFollowups();
      }
    } catch (err) {
      console.error('Failed to complete follow-up:', err);
    }
  };

  const handleSnooze = async (id: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      const response = await fetch(`/api/follow-ups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'snoozed',
          snoozed_until: tomorrowStr,
        }),
      });

      if (response.ok) {
        fetchFollowups();
      }
    } catch (err) {
      console.error('Failed to snooze follow-up:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-center py-8">
          <svg className="h-6 w-6 animate-spin text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { overdue, today, upcoming, summary } = data;

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Follow-ups
          </h3>
          <div className="flex items-center gap-2">
            {summary.overdue_count > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                {summary.overdue_count} overdue
              </span>
            )}
            <span className="text-sm text-gray-500">
              {summary.total_pending} pending
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {/* Overdue Section */}
        {overdue.length > 0 && (
          <div className="border-b border-gray-200 bg-red-50/50 p-3 dark:border-gray-700 dark:bg-red-900/10">
            <p className="mb-2 text-xs font-semibold uppercase text-red-600 dark:text-red-400">
              Overdue
            </p>
            <div className="space-y-2">
              {overdue.map((item) => (
                <FollowupItem
                  key={item.id}
                  item={item}
                  onComplete={handleComplete}
                  onSnooze={handleSnooze}
                  formatDate={formatDate}
                  isOverdue
                />
              ))}
            </div>
          </div>
        )}

        {/* Today Section */}
        {today.length > 0 && (
          <div className="border-b border-gray-200 p-3 dark:border-gray-700">
            <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
              Today
            </p>
            <div className="space-y-2">
              {today.map((item) => (
                <FollowupItem
                  key={item.id}
                  item={item}
                  onComplete={handleComplete}
                  onSnooze={handleSnooze}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {upcoming.length > 0 && (
          <div className="p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
              Upcoming
            </p>
            <div className="space-y-2">
              {upcoming.map((item) => (
                <FollowupItem
                  key={item.id}
                  item={item}
                  onComplete={handleComplete}
                  onSnooze={handleSnooze}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {overdue.length === 0 && today.length === 0 && upcoming.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No pending follow-ups
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
        <Link
          href="/support/follow-ups"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          View all follow-ups →
        </Link>
      </div>
    </div>
  );
}

function FollowupItem({
  item,
  onComplete,
  onSnooze,
  formatDate,
  isOverdue = false,
}: {
  item: FollowUp;
  onComplete: (id: string) => void;
  onSnooze: (id: string) => void;
  formatDate: (date: string) => string;
  isOverdue?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-lg p-2 ${isOverdue ? 'bg-red-100/50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
      <button
        onClick={() => onComplete(item.id)}
        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-gray-300 text-gray-400 hover:border-green-500 hover:text-green-500 dark:border-gray-600"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{typeIcons[item.follow_up_type] || '📌'}</span>
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {item.title}
          </p>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          {item.trial_organizations?.org_name && (
            <Link
              href={`/support/trials/${item.org_id}`}
              className="truncate hover:text-blue-600 hover:underline"
            >
              {item.trial_organizations.org_name}
            </Link>
          )}
          <span>•</span>
          <span className={isOverdue ? 'text-red-600 dark:text-red-400' : ''}>
            {formatDate(item.due_date)}
          </span>
          <span className={`rounded-full px-1.5 py-0.5 ${priorityColors[item.priority]}`}>
            {item.priority}
          </span>
        </div>
      </div>

      <button
        onClick={() => onSnooze(item.id)}
        className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
        title="Snooze to tomorrow"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  );
}
