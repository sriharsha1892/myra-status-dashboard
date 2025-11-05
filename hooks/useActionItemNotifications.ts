'use client';

import { useEffect, useRef } from 'react';
import { isPast, isToday, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

interface ActionItem {
  description: string;
  assigned_to: string;
  due_date: string;
  status: 'pending' | 'completed';
  org_name?: string;
  meeting_id?: string;
}

interface UseActionItemNotificationsOptions {
  enabled?: boolean;
  checkInterval?: number; // in milliseconds
  showOnMount?: boolean;
}

/**
 * Custom hook to monitor action items and show notifications for overdue items
 * @param actionItems Array of action items to monitor
 * @param options Configuration options
 */
export function useActionItemNotifications(
  actionItems: ActionItem[],
  options: UseActionItemNotificationsOptions = {}
) {
  const {
    enabled = true,
    checkInterval = 60000, // Check every minute
    showOnMount = true,
  } = options;

  const hasShownInitial = useRef(false);
  const notifiedItems = useRef(new Set<string>());

  // Get overdue items
  const getOverdueItems = () => {
    return actionItems.filter((item) => {
      if (item.status === 'completed' || !item.due_date) return false;
      const dueDate = new Date(item.due_date);
      return isPast(dueDate) && !isToday(dueDate);
    });
  };

  // Get items due today
  const getDueTodayItems = () => {
    return actionItems.filter((item) => {
      if (item.status === 'completed' || !item.due_date) return false;
      return isToday(new Date(item.due_date));
    });
  };

  // Get critically overdue items (more than 7 days overdue)
  const getCriticallyOverdueItems = () => {
    return actionItems.filter((item) => {
      if (item.status === 'completed' || !item.due_date) return false;
      const dueDate = new Date(item.due_date);
      if (!isPast(dueDate)) return false;
      return differenceInDays(new Date(), dueDate) > 7;
    });
  };

  // Show notification for overdue items
  const showOverdueNotification = (items: ActionItem[]) => {
    if (items.length === 0) return;

    const criticallyOverdue = items.filter((item) => {
      const dueDate = new Date(item.due_date);
      return differenceInDays(new Date(), dueDate) > 7;
    });

    if (criticallyOverdue.length > 0) {
      toast.error(
        `${criticallyOverdue.length} action item${criticallyOverdue.length > 1 ? 's' : ''} critically overdue (>7 days)!`,
        {
          duration: 8000,
          icon: '🔴',
        }
      );
    } else if (items.length > 0) {
      toast(
        `${items.length} action item${items.length > 1 ? 's' : ''} overdue`,
        {
          duration: 5000,
          icon: '⚠️',
          style: {
            background: '#fef3c7',
            color: '#92400e',
          },
        }
      );
    }
  };

  // Show notification for items due today
  const showDueTodayNotification = (items: ActionItem[]) => {
    if (items.length === 0) return;

    toast(
      `${items.length} action item${items.length > 1 ? 's' : ''} due today`,
      {
        duration: 4000,
        icon: '⏰',
        style: {
          background: '#dbeafe',
          color: '#1e3a8a',
        },
      }
    );
  };

  // Check and notify
  const checkAndNotify = () => {
    if (!enabled) return;

    const overdueItems = getOverdueItems();
    const dueTodayItems = getDueTodayItems();

    // Only notify about items we haven't notified about yet
    const newOverdueItems = overdueItems.filter(
      (item) => !notifiedItems.current.has(item.description + item.due_date)
    );

    const newDueTodayItems = dueTodayItems.filter(
      (item) => !notifiedItems.current.has(item.description + item.due_date)
    );

    if (newOverdueItems.length > 0) {
      showOverdueNotification(newOverdueItems);
      newOverdueItems.forEach((item) => {
        notifiedItems.current.add(item.description + item.due_date);
      });
    }

    if (newDueTodayItems.length > 0) {
      showDueTodayNotification(newDueTodayItems);
      newDueTodayItems.forEach((item) => {
        notifiedItems.current.add(item.description + item.due_date);
      });
    }
  };

  // Initial check on mount
  useEffect(() => {
    if (enabled && showOnMount && !hasShownInitial.current) {
      // Delay to avoid showing notifications before the page fully loads
      const timeout = setTimeout(() => {
        checkAndNotify();
        hasShownInitial.current = true;
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [enabled, showOnMount]);

  // Periodic checks
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      checkAndNotify();
    }, checkInterval);

    return () => clearInterval(interval);
  }, [enabled, checkInterval, actionItems]);

  // Return utility functions
  return {
    overdueCount: getOverdueItems().length,
    dueTodayCount: getDueTodayItems().length,
    criticallyOverdueCount: getCriticallyOverdueItems().length,
    getOverdueItems,
    getDueTodayItems,
    getCriticallyOverdueItems,
    checkAndNotify,
  };
}
