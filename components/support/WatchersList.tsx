'use client';

import { useState } from 'react';
import { useWatchers } from '@/hooks/useWatchers';
import { X } from 'lucide-react';

interface WatchersListProps {
  ticketId: string;
}

export function WatchersList({ ticketId }: WatchersListProps) {
  const { watchers, loading } = useWatchers(ticketId);
  const [showModal, setShowModal] = useState(false);

  const maxVisible = 5;
  const visibleWatchers = watchers.slice(0, maxVisible);
  const remainingCount = Math.max(0, watchers.length - maxVisible);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm text-gray-500">Loading watchers...</div>
      </div>
    );
  }

  if (watchers.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No one is watching this ticket yet
      </div>
    );
  }

  const getInitials = (email: string) => {
    return email
      ?.split('@')[0]
      .split('.')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-red-500',
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            Watchers ({watchers.length})
          </span>
        </div>

        <div className="flex items-center -space-x-2">
          {visibleWatchers.map((watcher, index) => (
            <div
              key={watcher.id}
              className="relative group"
              style={{ zIndex: visibleWatchers.length - index }}
            >
              <div
                className={`w-6 h-6 rounded-full ${getAvatarColor(
                  watcher.user_id
                )} flex items-center justify-center text-xs font-semibold text-white ring-2 ring-white cursor-pointer hover:ring-blue-200 transition-all`}
                title={watcher.user_email || watcher.user_name || 'User'}
              >
                {getInitials(watcher.user_email || watcher.user_id)}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {watcher.user_email || watcher.user_name || 'User'}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          ))}

          {remainingCount > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600 ring-2 ring-white transition-colors"
              title={`+${remainingCount} more`}
            >
              +{remainingCount}
            </button>
          )}
        </div>

        {watchers.length > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-blue-600 hover:text-blue-700 text-left"
          >
            View all watchers
          </button>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Watchers ({watchers.length})
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[60vh]">
              {watchers.map((watcher) => (
                <div
                  key={watcher.id}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-full ${getAvatarColor(
                      watcher.user_id
                    )} flex items-center justify-center text-sm font-semibold text-white flex-shrink-0`}
                  >
                    {getInitials(watcher.user_email || watcher.user_id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {watcher.user_name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {watcher.user_email || watcher.user_id}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="w-full h-9 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
