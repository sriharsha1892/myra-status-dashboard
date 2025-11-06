/**
 * useActionItemNotifications Hook
 * Shows notifications for overdue and upcoming action items
 */

import { useEffect, useRef } from 'react';
import { isPast, isToday, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

interface ActionItem {
  description: string;
  assigned_to: string;
  due_date: string;
  status: 'pending' | 'completed';
}

interface ActionItemWithContext extends ActionItem {
  meeting_id: string;
  org_name: string;
  meeting_date: string;
}

interface NotificationOptions {
  enabled?: boolean;
  showOnMount?: boolean;
  checkInterval?: number; // in milliseconds
}

export function useActionItemNotifications(
  items: ActionItemWithContext[],
  options: NotificationOptions = {}
) {
  const {
    enabled = true,
    showOnMount = true,
    checkInterval = 300000 // 5 minutes default
  } = options;

  const notifiedItemsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkAndNotify = () => {
    if (!enabled || !items.length) return;

    const pendingItems = items.filter(item => item.status === 'pending');

    pendingItems.forEach(item => {
      const dueDate = new Date(item.due_date);
      const itemKey = `${item.meeting_id}-${item.description}`;

      // Skip if already notified
      if (notifiedItemsRef.current.has(itemKey)) return;

      // Overdue items
      if (isPast(dueDate) && !isToday(dueDate)) {
        const daysOverdue = Math.abs(differenceInDays(dueDate, new Date()));
        toast.error(
          `Overdue: "${item.description}" for ${item.org_name} (${daysOverdue} days overdue)`,
          { duration: 6000 }
        );
        notifiedItemsRef.current.add(itemKey);
      }
      // Items due today
      else if (isToday(dueDate)) {
        toast(
          `Due Today: "${item.description}" for ${item.org_name}`,
          {
            icon: '⏰',
            duration: 5000,
            style: {
              background: '#fef3c7',
              color: '#92400e'
            }
          }
        );
        notifiedItemsRef.current.add(itemKey);
      }
      // Items due soon (within 3 days)
      else {
        const daysUntilDue = differenceInDays(dueDate, new Date());
        if (daysUntilDue <= 3 && daysUntilDue > 0) {
          toast(
            `Due in ${daysUntilDue} days: "${item.description}" for ${item.org_name}`,
            {
              icon: '📅',
              duration: 4000
            }
          );
          notifiedItemsRef.current.add(itemKey);
        }
      }
    });
  };

  useEffect(() => {
    if (!enabled) return;

    // Show notifications on mount if enabled
    if (showOnMount) {
      checkAndNotify();
    }

    // Set up periodic checking
    if (checkInterval > 0) {
      intervalRef.current = setInterval(checkAndNotify, checkInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [items, enabled, showOnMount, checkInterval]);

  // Clean up notified items when items change
  useEffect(() => {
    const currentItemKeys = new Set(
      items.map(item => `${item.meeting_id}-${item.description}`)
    );

    // Remove notified items that are no longer in the list
    notifiedItemsRef.current.forEach(key => {
      if (!currentItemKeys.has(key)) {
        notifiedItemsRef.current.delete(key);
      }
    });
  }, [items]);

  return {
    checkAndNotify,
    clearNotifications: () => notifiedItemsRef.current.clear()
  };
}
