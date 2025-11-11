'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, X } from 'lucide-react';

interface RecentItem {
  id: string;
  type: 'trial' | 'ticket' | 'user' | 'report';
  title: string;
  url: string;
  timestamp: number;
}

const MAX_RECENT_ITEMS = 10;
const STORAGE_KEY = 'myra_recent_items';

export function trackRecentItem(item: Omit<RecentItem, 'timestamp'>) {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const recentItems: RecentItem[] = stored ? JSON.parse(stored) : [];

    // Remove duplicates by id
    const filtered = recentItems.filter(i => i.id !== item.id);

    // Add new item at the beginning
    const updated = [
      { ...item, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch custom event to update UI
    window.dispatchEvent(new CustomEvent('recentItemsUpdated'));
  } catch (err) {
    console.error('Failed to track recent item:', err);
  }
}

export function getRecentItems(): RecentItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Failed to get recent items:', err);
    return [];
  }
}

export function clearRecentItems() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('recentItemsUpdated'));
  } catch (err) {
    console.error('Failed to clear recent items:', err);
  }
}

export function RecentItemsWidget() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setItems(getRecentItems());

    const handleUpdate = () => {
      setItems(getRecentItems());
    };

    window.addEventListener('recentItemsUpdated', handleUpdate);
    return () => window.removeEventListener('recentItemsUpdated', handleUpdate);
  }, []);

  if (items.length === 0) {
    return null;
  }

  const removeItem = (id: string) => {
    const filtered = items.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('recentItemsUpdated'));
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'trial': return 'Trial Org';
      case 'ticket': return 'Ticket';
      case 'user': return 'User';
      case 'report': return 'Report';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'trial': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ticket': return 'bg-green-50 text-green-700 border-green-200';
      case 'user': return 'bg-accent-50 text-accent-700 border-accent-200';
      case 'report': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900">Recent Items</h3>
        </div>
        <button
          onClick={() => clearRecentItems()}
          className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="group flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Link href={item.url} className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getTypeColor(item.type)}`}>
                  {getTypeLabel(item.type)}
                </span>
                <span className="text-sm text-neutral-900 truncate">{item.title}</span>
              </div>
            </Link>
            <button
              onClick={() => removeItem(item.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-200 rounded transition-all"
              title="Remove from recent"
            >
              <X className="w-3 h-3 text-neutral-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentItemsWidget;
