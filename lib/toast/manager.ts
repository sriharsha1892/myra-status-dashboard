/**
 * Enhanced Toast Manager
 * Handles deduplication, grouping, and advanced toast operations
 */

import toast from 'react-hot-toast';
import {
  Toast,
  EnhancedToastOptions,
  ToastManagerConfig,
  ToastGroup,
} from './types';
import {
  saveToHistory,
  savePersistentToast,
  removePersistentToast,
  getPersistentToasts,
} from './persistence';

class ToastManager {
  private activeToasts: Map<string, Toast> = new Map();
  private toastGroups: Map<string, ToastGroup> = new Map();

  private config: ToastManagerConfig = {
    maxToasts: 5,
    defaultDuration: 5000,
    persistence: {
      enabled: true,
      storageKey: 'toast_persistent',
      maxItems: 20,
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    deduplication: {
      enabled: true,
      window: 5000, // 5 seconds
      strategy: 'increment',
    },
    grouping: {
      enabled: true,
      maxGroupSize: 10,
      collapseThreshold: 3,
    },
  };

  constructor(config?: Partial<ToastManagerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Restore persistent toasts on initialization (only in browser)
    if (typeof window !== 'undefined') {
      this.restorePersistentToasts();
    }
  }

  /**
   * Generate unique toast ID
   */
  private generateId(): string {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if toast is duplicate
   */
  private findDuplicate(options: EnhancedToastOptions): Toast | null {
    if (!this.config.deduplication.enabled || !options.metadata?.dedupeKey) {
      return null;
    }

    const now = Date.now();
    const window = this.config.deduplication.window;

    for (const [_, toast] of this.activeToasts) {
      if (
        toast.metadata?.dedupeKey === options.metadata.dedupeKey &&
        now - toast.createdAt < window
      ) {
        return toast;
      }
    }

    return null;
  }

  /**
   * Handle duplicate toast
   */
  private handleDuplicate(existing: Toast, options: EnhancedToastOptions): string {
    const strategy = this.config.deduplication.strategy;

    switch (strategy) {
      case 'ignore':
        // Return existing toast ID without any changes
        return existing.id;

      case 'update':
        // Update existing toast with new data
        existing.message = options.message;
        existing.description = options.description;
        existing.updatedAt = Date.now();
        this.activeToasts.set(existing.id, existing);
        toast.dismiss(existing.id);
        return this.showToast(existing);

      case 'increment':
        // Increment count
        existing.count = (existing.count || 1) + 1;
        existing.updatedAt = Date.now();
        existing.message = `${options.message} (${existing.count})`;
        this.activeToasts.set(existing.id, existing);
        toast.dismiss(existing.id);
        return this.showToast(existing);

      default:
        return existing.id;
    }
  }

  /**
   * Show toast using react-hot-toast with custom rendering
   */
  private showToast(toastData: Toast): string {
    const duration = toastData.duration ?? this.config.defaultDuration;

    // Use react-hot-toast's custom method to render our EnhancedToast component
    // The actual component rendering will be handled by the Toaster's custom renderer
    let toastId: string;

    // Store toast data for access by the renderer
    if (typeof window !== 'undefined') {
      const toastDataMap = (window as any).__ENHANCED_TOAST_DATA__ || new Map();
      toastDataMap.set(toastData.id, toastData);
      (window as any).__ENHANCED_TOAST_DATA__ = toastDataMap;
    }

    // Use react-hot-toast's type-specific methods with custom data
    switch (toastData.type) {
      case 'success':
        toastId = toast.success(toastData.message, {
          duration,
          id: toastData.id,
        });
        break;
      case 'error':
        toastId = toast.error(toastData.message, {
          duration: toastData.duration ?? 0, // Errors don't auto-dismiss by default
          id: toastData.id,
        });
        break;
      case 'loading':
        toastId = toast.loading(toastData.message, {
          duration: 0,
          id: toastData.id,
        });
        break;
      default:
        toastId = toast(toastData.message, {
          duration,
          id: toastData.id,
          icon: toastData.type === 'warning' ? '⚠️' : 'ℹ️',
        });
    }

    return toastId;
  }

  /**
   * Show enhanced toast
   */
  public show(options: EnhancedToastOptions): string {
    // Check for duplicate
    const duplicate = this.findDuplicate(options);
    if (duplicate) {
      return this.handleDuplicate(duplicate, options);
    }

    // Create new toast
    const toastData: Toast = {
      ...options,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      count: 1,
    };

    // Add to active toasts
    this.activeToasts.set(toastData.id, toastData);

    // Handle grouping
    if (this.config.grouping.enabled && options.metadata?.groupKey) {
      this.addToGroup(toastData);
    }

    // Save persistent toasts
    if (options.metadata?.persist) {
      savePersistentToast(toastData);
    }

    // Show toast
    const toastId = this.showToast(toastData);

    // Auto-dismiss handling
    if (toastData.autoDismiss !== false && toastData.duration !== 0) {
      const duration = toastData.duration ?? this.config.defaultDuration;
      setTimeout(() => this.dismiss(toastId, 'auto'), duration);
    }

    return toastId;
  }

  /**
   * Dismiss toast
   */
  public dismiss(id: string, dismissedBy: 'user' | 'auto' | 'system' = 'user'): void {
    const toastData = this.activeToasts.get(id);

    if (toastData) {
      // Save to history
      saveToHistory(toastData, dismissedBy);

      // Remove from persistent storage
      if (toastData.metadata?.persistKey) {
        removePersistentToast(toastData.metadata.persistKey);
      }

      // Remove from active toasts
      this.activeToasts.delete(id);

      // Remove from groups
      if (toastData.metadata?.groupKey) {
        this.removeFromGroup(toastData);
      }

      // Call onDismiss callback
      toastData.onDismiss?.();
    }

    // Dismiss using react-hot-toast
    toast.dismiss(id);
  }

  /**
   * Dismiss all toasts
   */
  public dismissAll(): void {
    for (const [id, _] of this.activeToasts) {
      this.dismiss(id, 'system');
    }
    toast.dismiss();
  }

  /**
   * Add toast to group
   */
  private addToGroup(toastData: Toast): void {
    const groupKey = toastData.metadata?.groupKey;
    if (!groupKey) return;

    const group = this.toastGroups.get(groupKey) || {
      groupKey,
      toasts: [],
      count: 0,
      latestToast: toastData,
    };

    group.toasts.push(toastData);
    group.count = group.toasts.length;
    group.latestToast = toastData;

    this.toastGroups.set(groupKey, group);

    // Auto-collapse if threshold reached
    if (group.count >= this.config.grouping.collapseThreshold) {
      this.collapseGroup(groupKey);
    }
  }

  /**
   * Remove toast from group
   */
  private removeFromGroup(toastData: Toast): void {
    const groupKey = toastData.metadata?.groupKey;
    if (!groupKey) return;

    const group = this.toastGroups.get(groupKey);
    if (!group) return;

    group.toasts = group.toasts.filter((t) => t.id !== toastData.id);
    group.count = group.toasts.length;

    if (group.count === 0) {
      this.toastGroups.delete(groupKey);
    } else {
      group.latestToast = group.toasts[group.toasts.length - 1];
      this.toastGroups.set(groupKey, group);
    }
  }

  /**
   * Collapse toast group into single toast
   */
  private collapseGroup(groupKey: string): void {
    const group = this.toastGroups.get(groupKey);
    if (!group) return;

    // Dismiss all individual toasts in group
    group.toasts.forEach((t) => toast.dismiss(t.id));

    // Show collapsed toast
    const collapsedToast: Toast = {
      ...group.latestToast,
      id: this.generateId(),
      message: `${group.count} ${group.latestToast.type} notifications`,
      description: group.latestToast.message,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.activeToasts.set(collapsedToast.id, collapsedToast);
    this.showToast(collapsedToast);
  }

  /**
   * Restore persistent toasts from localStorage
   */
  private restorePersistentToasts(): void {
    if (!this.config.persistence.enabled) return;

    const persistent = getPersistentToasts();

    Object.values(persistent).forEach((toastData) => {
      // Check if still within TTL
      const age = Date.now() - toastData.createdAt;
      if (age > this.config.persistence.ttl) {
        if (toastData.metadata?.persistKey) {
          removePersistentToast(toastData.metadata.persistKey);
        }
        return;
      }

      // Re-show persistent toast
      this.activeToasts.set(toastData.id, toastData);
      this.showToast(toastData);
    });
  }

  /**
   * Update toast loading state
   */
  public updateLoading(id: string, message: string): void {
    const toastData = this.activeToasts.get(id);
    if (!toastData) return;

    toastData.message = message;
    toastData.updatedAt = Date.now();

    toast.loading(message, { id });
  }

  /**
   * Resolve loading toast to success
   */
  public resolveLoading(id: string, message: string): void {
    const toastData = this.activeToasts.get(id);
    if (!toastData) return;

    toastData.type = 'success';
    toastData.message = message;
    toastData.updatedAt = Date.now();

    toast.success(message, { id });

    // Auto-dismiss after default duration
    setTimeout(() => this.dismiss(id, 'auto'), this.config.defaultDuration);
  }

  /**
   * Reject loading toast to error
   */
  public rejectLoading(id: string, message: string): void {
    const toastData = this.activeToasts.get(id);
    if (!toastData) return;

    toastData.type = 'error';
    toastData.message = message;
    toastData.updatedAt = Date.now();

    toast.error(message, { id });
  }

  /**
   * Get all active toasts
   */
  public getActiveToasts(): Toast[] {
    return Array.from(this.activeToasts.values());
  }

  /**
   * Get all toast groups
   */
  public getGroups(): ToastGroup[] {
    return Array.from(this.toastGroups.values());
  }
}

// Singleton instance
export const toastManager = new ToastManager();

// Convenience methods
export const enhancedToast = {
  show: (options: EnhancedToastOptions) => toastManager.show(options),
  success: (message: string, options?: Partial<EnhancedToastOptions>) =>
    toastManager.show({ type: 'success', message, ...options }),
  error: (message: string, options?: Partial<EnhancedToastOptions>) =>
    toastManager.show({ type: 'error', message, autoDismiss: false, ...options }),
  warning: (message: string, options?: Partial<EnhancedToastOptions>) =>
    toastManager.show({ type: 'warning', message, ...options }),
  info: (message: string, options?: Partial<EnhancedToastOptions>) =>
    toastManager.show({ type: 'info', message, ...options }),
  loading: (message: string, options?: Partial<EnhancedToastOptions>) =>
    toastManager.show({ type: 'loading', message, duration: 0, ...options }),
  dismiss: (id: string) => toastManager.dismiss(id, 'user'),
  dismissAll: () => toastManager.dismissAll(),
  updateLoading: (id: string, message: string) => toastManager.updateLoading(id, message),
  resolveLoading: (id: string, message: string) => toastManager.resolveLoading(id, message),
  rejectLoading: (id: string, message: string) => toastManager.rejectLoading(id, message),
};
