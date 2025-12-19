'use client';

import { useState, useEffect } from 'react';
import { X, Clock, ArrowRight, User, AlertCircle, Loader2 } from 'lucide-react';
import type { PipelineActivityLog } from '@/lib/quote/pipeline-types';
import { STAGE_LABELS } from '@/lib/quote/pipeline-types';

interface ActivityLogProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineId: string;
  companyName: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

function formatFieldName(field: string): string {
  return field
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatValue(field: string, value: string | null): string {
  if (!value || value === '' || value === 'null') return '-';

  // Handle stage values
  if (field === 'stage') {
    return STAGE_LABELS[value as keyof typeof STAGE_LABELS] || value;
  }

  return value;
}

function getActionIcon(action: string): React.ReactNode {
  switch (action) {
    case 'created':
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <span className="text-green-600 text-sm font-bold">+</span>
        </div>
      );
    case 'stage_changed':
      return (
        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
          <ArrowRight className="w-4 h-4 text-violet-600" />
        </div>
      );
    case 'updated':
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <Clock className="w-4 h-4 text-blue-600" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
          <Clock className="w-4 h-4 text-neutral-600" />
        </div>
      );
  }
}

function getActionDescription(activity: PipelineActivityLog): React.ReactNode {
  switch (activity.action) {
    case 'created':
      return <span className="text-green-700">Entry created</span>;
    case 'stage_changed':
      return (
        <span className="text-violet-700">
          Stage changed from{' '}
          <span className="font-medium">
            {formatValue('stage', activity.old_value)}
          </span>{' '}
          to{' '}
          <span className="font-medium">
            {formatValue('stage', activity.new_value)}
          </span>
        </span>
      );
    case 'updated':
      if (activity.field_changed) {
        return (
          <span className="text-blue-700">
            <span className="font-medium">
              {formatFieldName(activity.field_changed)}
            </span>{' '}
            changed
            {activity.old_value && activity.new_value && (
              <>
                {' '}
                from{' '}
                <span className="text-neutral-500">
                  &quot;{formatValue(activity.field_changed, activity.old_value)}&quot;
                </span>{' '}
                to{' '}
                <span className="text-neutral-700">
                  &quot;{formatValue(activity.field_changed, activity.new_value)}&quot;
                </span>
              </>
            )}
          </span>
        );
      }
      return <span className="text-blue-700">Entry updated</span>;
    default:
      return <span className="text-neutral-600">{activity.action}</span>;
  }
}

export default function ActivityLog({
  isOpen,
  onClose,
  pipelineId,
  companyName,
}: ActivityLogProps) {
  const [activities, setActivities] = useState<PipelineActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pipelineId) {
      fetchActivities();
    }
  }, [isOpen, pipelineId]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/quote/pipeline/activity?pipelineId=${pipelineId}`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setActivities(data.data || []);
      }
    } catch (err) {
      setError('Failed to load activity history');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Activity History</h2>
            <p className="text-violet-100 text-sm truncate">{companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-10 h-10 text-red-300 mb-3" />
              <p className="text-neutral-600">{error}</p>
              <button
                onClick={fetchActivities}
                className="mt-4 text-sm text-violet-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="w-10 h-10 text-neutral-300 mb-3" />
              <p className="text-neutral-500">No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex gap-4"
                >
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    {getActionIcon(activity.action)}
                    {index < activities.length - 1 && (
                      <div className="w-0.5 flex-1 bg-neutral-200 my-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="text-sm">
                      {getActionDescription(activity)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                      <span>{formatDate(activity.changed_at)}</span>
                      {activity.changed_by && (
                        <>
                          <span className="text-neutral-300">|</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {activity.changed_by}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
