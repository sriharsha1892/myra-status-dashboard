'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  PlusCircle,
  ArrowRight,
  UserPlus,
  MessageSquare,
  Link2,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TimelineEventProps {
  type: 'created' | 'status_changed' | 'assigned' | 'commented' | 'linked' | 'watched';
  user: {
    name: string;
    avatar?: string;
  };
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, any>;
  timestamp: string;
}

const eventConfig = {
  created: {
    icon: PlusCircle,
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500',
  },
  status_changed: {
    icon: ArrowRight,
    color: 'bg-accent-500',
    textColor: 'text-purple-500',
    borderColor: 'border-purple-500',
  },
  assigned: {
    icon: UserPlus,
    color: 'bg-green-500',
    textColor: 'text-green-500',
    borderColor: 'border-green-500',
  },
  commented: {
    icon: MessageSquare,
    color: 'bg-gray-500',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-500',
  },
  linked: {
    icon: Link2,
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500',
  },
  watched: {
    icon: Eye,
    color: 'bg-teal-500',
    textColor: 'text-teal-500',
    borderColor: 'border-teal-500',
  },
};

export function TimelineEvent({
  type,
  user,
  oldValue,
  newValue,
  metadata,
  timestamp,
}: TimelineEventProps) {
  const [expanded, setExpanded] = useState(false);
  const config = eventConfig[type];
  const Icon = config.icon;

  const getDescription = () => {
    switch (type) {
      case 'created':
        return 'created this ticket';
      case 'status_changed':
        return `changed status from ${oldValue || 'N/A'} to ${newValue || 'N/A'}`;
      case 'assigned':
        return `assigned to ${newValue || 'someone'}`;
      case 'commented':
        return 'added comment';
      case 'linked':
        return `linked ticket ${newValue || ''}`;
      case 'watched':
        return 'started watching this ticket';
      default:
        return 'performed an action';
    }
  };

  const hasDetails = metadata || (type === 'commented' && newValue) || (type === 'linked' && metadata?.linked_ticket);

  return (
    <div className="relative flex gap-3 group">
      {/* Event dot with icon */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center shadow-md flex-shrink-0 ring-4 ring-white dark:ring-gray-900`}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Event content */}
      <div className="flex-1 pb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1">
              {/* User avatar */}
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-6 h-6 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-gray-200 dark:ring-gray-700">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-semibold">{user.name}</span>{' '}
                  <span className="text-gray-600 dark:text-gray-400">{getDescription()}</span>
                </p>
              </div>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {format(new Date(timestamp), 'h:mm a')}
              </span>
              {hasDetails && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={expanded ? 'Collapse details' : 'Expand details'}
                >
                  {expanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Status change badge */}
          {type === 'status_changed' && (
            <div className="flex items-center gap-2 mt-2">
              {oldValue && (
                <span className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                  {oldValue}
                </span>
              )}
              <ArrowRight className="w-3 h-3 text-gray-400" />
              {newValue && (
                <span className="px-2 py-1 text-xs rounded-md bg-accent-50 dark:bg-purple-900/20 text-accent-700 dark:text-purple-300 border border-accent-200 dark:border-purple-700 font-medium">
                  {newValue}
                </span>
              )}
            </div>
          )}

          {/* Expandable details */}
          {expanded && hasDetails && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {type === 'commented' && newValue && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {newValue}
                  </p>
                </div>
              )}

              {type === 'linked' && metadata?.linked_ticket && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Linked Ticket:
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Link2 className="w-4 h-4 text-orange-500" />
                    <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                      {metadata.linked_ticket}
                    </span>
                  </div>
                  {metadata.link_type && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Relationship: {metadata.link_type}
                    </div>
                  )}
                </div>
              )}

              {metadata && type !== 'linked' && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Additional Details:
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-3">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
