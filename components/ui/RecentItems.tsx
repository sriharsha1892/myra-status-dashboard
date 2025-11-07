'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Pin, X } from 'lucide-react';
import RelativeTime from './RelativeTime';

export interface RecentItem {
  id: string;
  label: string;
  type: 'organization' | 'user' | 'ticket' | 'meeting';
  path: string;
  viewedAt: string;
  metadata?: {
    domain?: string;
    status?: string;
    [key: string]: any;
  };
}

const STORAGE_KEY = 'myra_recent_items';
const PINNED_KEY = 'myra_pinned_items';
const MAX_RECENT = 10;
const MAX_PINNED = 5;

/**
 * Recent Items Sidebar
 *
 * Features:
 * - Tracks recently viewed items across session
 * - Pin important items
 * - Quick navigation
 * - Local storage persistence
 *
 * Usage:
 * // Add to layout or dashboard
 * <RecentItems />
 *
 * // Track viewed item from any page
 * import { trackRecentItem } from '@/components/ui/RecentItems';
 * trackRecentItem({
 *   id: org.id,
 *   label: org.name,
 *   type: 'organization',
 *   path: `/support/trials/${org.id}`,
 *   metadata: { domain: org.domain }
 * });
 */
export default function RecentItems() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [pinnedItems, setPinnedItems] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const pinned = localStorage.getItem(PINNED_KEY);

    if (stored) {
      try {
        setRecentItems(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent items:', e);
      }
    }

    if (pinned) {
      try {
        setPinnedItems(JSON.parse(pinned));
      } catch (e) {
        console.error('Failed to parse pinned items:', e);
      }
    }
  }, []);

  // Listen for custom events to update recent items
  useEffect(() => {
    const handleRecentItemAdded = (event: CustomEvent<RecentItem>) => {
      const newItem = event.detail;

      setRecentItems(prev => {
        // Remove if already exists
        const filtered = prev.filter(item => item.id !== newItem.id);

        // Add to front
        const updated = [newItem, ...filtered].slice(0, MAX_RECENT);

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        return updated;
      });
    };

    window.addEventListener('recentItemAdded', handleRecentItemAdded as EventListener);
    return () => {
      window.removeEventListener('recentItemAdded', handleRecentItemAdded as EventListener);
    };
  }, []);

  const handlePin = (id: string) => {
    setPinnedItems(prev => {
      const updated = prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id].slice(0, MAX_PINNED);

      localStorage.setItem(PINNED_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemove = (id: string) => {
    setRecentItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsExpanded(false);
  };

  const pinnedItemsData = recentItems.filter(item => pinnedItems.includes(item.id));
  const unpinnedItems = recentItems.filter(item => !pinnedItems.includes(item.id));

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="fixed right-6 bottom-6 z-40 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="Recent items"
        aria-label="Toggle recent items"
      >
        <Clock size={20} />
        {recentItems.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {recentItems.length}
          </span>
        )}
      </button>

      {/* Sidebar Panel */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsExpanded(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Items</h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {recentItems.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Clock size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No recent items yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Visit organizations, users, or tickets to see them here
                  </p>
                </div>
              ) : (
                <>
                  {/* Pinned Items */}
                  {pinnedItemsData.length > 0 && (
                    <div className="border-b border-gray-200">
                      <div className="px-4 py-2 bg-gray-50">
                        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                          <Pin size={12} />
                          Pinned
                        </h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {pinnedItemsData.map(item => (
                          <RecentItemRow
                            key={item.id}
                            item={item}
                            isPinned
                            onPin={() => handlePin(item.id)}
                            onRemove={() => handleRemove(item.id)}
                            onNavigate={() => handleNavigate(item.path)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Items */}
                  {unpinnedItems.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-gray-50">
                        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Recent
                        </h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {unpinnedItems.map(item => (
                          <RecentItemRow
                            key={item.id}
                            item={item}
                            isPinned={false}
                            onPin={() => handlePin(item.id)}
                            onRemove={() => handleRemove(item.id)}
                            onNavigate={() => handleNavigate(item.path)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {recentItems.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setRecentItems([]);
                    setPinnedItems([]);
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(PINNED_KEY);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function RecentItemRow({
  item,
  isPinned,
  onPin,
  onRemove,
  onNavigate
}: {
  item: RecentItem;
  isPinned: boolean;
  onPin: () => void;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  const typeColors = {
    organization: 'bg-blue-100 text-blue-700',
    user: 'bg-green-100 text-green-700',
    ticket: 'bg-orange-100 text-orange-700',
    meeting: 'bg-purple-100 text-purple-700'
  };

  return (
    <div
      onClick={onNavigate}
      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[item.type]}`}>
              {item.type}
            </span>
            {item.metadata?.domain && (
              <span className="text-xs text-gray-500">{item.metadata.domain}</span>
            )}
          </div>
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {item.label}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            <RelativeTime date={item.viewedAt} />
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={`p-1 rounded hover:bg-gray-200 transition-colors ${
              isPinned ? 'text-blue-600' : 'text-gray-400'
            }`}
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={14} fill={isPinned ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-600 transition-colors"
            title="Remove"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Track a recently viewed item
 * Call this function when user views an organization, ticket, etc.
 */
export function trackRecentItem(item: RecentItem) {
  const event = new CustomEvent('recentItemAdded', {
    detail: { ...item, viewedAt: new Date().toISOString() }
  });
  window.dispatchEvent(event);
}
