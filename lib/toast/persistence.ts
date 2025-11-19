/**
 * Toast Persistence Layer
 * Handles localStorage operations for toast history
 */

import { Toast, ToastHistoryItem } from './types';

const STORAGE_KEYS = {
  HISTORY: 'toast_history',
  PERSISTENT_TOASTS: 'toast_persistent',
} as const;

const DEFAULT_MAX_HISTORY = 50;
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Save toast to history
 */
export function saveToHistory(
  toast: Toast,
  dismissedBy: 'user' | 'auto' | 'system' = 'user'
): void {
  try {
    const history = getHistory();
    const item: ToastHistoryItem = {
      toast,
      dismissedAt: Date.now(),
      dismissedBy,
    };

    history.unshift(item);

    // Keep only recent items
    const trimmedHistory = history
      .slice(0, DEFAULT_MAX_HISTORY)
      .filter((item) => Date.now() - item.dismissedAt < DEFAULT_TTL);

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.warn('Failed to save toast to history:', error);
  }
}

/**
 * Get toast history
 */
export function getHistory(): ToastHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!stored) return [];

    const history: ToastHistoryItem[] = JSON.parse(stored);

    // Filter out expired items
    return history.filter((item) => Date.now() - item.dismissedAt < DEFAULT_TTL);
  } catch (error) {
    console.warn('Failed to load toast history:', error);
    return [];
  }
}

/**
 * Clear toast history
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  } catch (error) {
    console.warn('Failed to clear toast history:', error);
  }
}

/**
 * Save persistent toast
 */
export function savePersistentToast(toast: Toast): void {
  if (!toast.metadata?.persist || !toast.metadata?.persistKey) {
    return;
  }

  try {
    const persistent = getPersistentToasts();
    persistent[toast.metadata.persistKey] = toast;

    localStorage.setItem(
      STORAGE_KEYS.PERSISTENT_TOASTS,
      JSON.stringify(persistent)
    );
  } catch (error) {
    console.warn('Failed to save persistent toast:', error);
  }
}

/**
 * Get all persistent toasts
 */
export function getPersistentToasts(): Record<string, Toast> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PERSISTENT_TOASTS);
    if (!stored) return {};

    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to load persistent toasts:', error);
    return {};
  }
}

/**
 * Remove persistent toast
 */
export function removePersistentToast(persistKey: string): void {
  try {
    const persistent = getPersistentToasts();
    delete persistent[persistKey];

    localStorage.setItem(
      STORAGE_KEYS.PERSISTENT_TOASTS,
      JSON.stringify(persistent)
    );
  } catch (error) {
    console.warn('Failed to remove persistent toast:', error);
  }
}

/**
 * Clear all persistent toasts
 */
export function clearPersistentToasts(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PERSISTENT_TOASTS);
  } catch (error) {
    console.warn('Failed to clear persistent toasts:', error);
  }
}

/**
 * Get toast statistics
 */
export function getToastStats(): {
  totalDismissed: number;
  byType: Record<string, number>;
  byDismissedBy: Record<string, number>;
  last24h: number;
} {
  const history = getHistory();
  const last24h = Date.now() - 24 * 60 * 60 * 1000;

  const stats = {
    totalDismissed: history.length,
    byType: {} as Record<string, number>,
    byDismissedBy: {} as Record<string, number>,
    last24h: 0,
  };

  history.forEach((item) => {
    // Count by type
    const type = item.toast.type;
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // Count by dismissed by
    stats.byDismissedBy[item.dismissedBy] =
      (stats.byDismissedBy[item.dismissedBy] || 0) + 1;

    // Count last 24h
    if (item.dismissedAt > last24h) {
      stats.last24h++;
    }
  });

  return stats;
}
