/**
 * Enhanced Toast System - Type Definitions
 * Comprehensive typing for advanced toast functionality
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export type ToastPriority = 'low' | 'normal' | 'high' | 'critical';

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export interface ToastMetadata {
  // Deduplication
  dedupeKey?: string; // Unique key to identify duplicate toasts
  groupKey?: string; // Key to group similar toasts together

  // Persistence
  persist?: boolean; // Should persist in localStorage
  persistKey?: string; // Unique key for persistence

  // Technical details
  technicalDetails?: string; // Stack trace, error details
  errorCode?: string;
  context?: string;

  // User context
  userId?: string;
  sessionId?: string;

  // Additional data
  data?: Record<string, any>;
}

export interface EnhancedToastOptions {
  // Basic options
  type: ToastType;
  message: string;
  description?: string;

  // Duration
  duration?: number; // ms, 0 = infinite
  autoDismiss?: boolean;

  // Priority
  priority?: ToastPriority;

  // Actions
  actions?: ToastAction[];
  onRetry?: () => void | Promise<void>;
  onUndo?: () => void | Promise<void>;
  onViewDetails?: () => void;
  onDismiss?: () => void;

  // Progressive disclosure
  expandable?: boolean;
  expanded?: boolean;

  // Metadata
  metadata?: ToastMetadata;

  // Styling
  icon?: React.ReactNode;
  className?: string;
}

export interface Toast extends EnhancedToastOptions {
  id: string;
  createdAt: number;
  updatedAt: number;
  dismissedAt?: number;
  count?: number; // For grouped/deduplicated toasts
}

export interface ToastGroup {
  groupKey: string;
  toasts: Toast[];
  count: number;
  latestToast: Toast;
}

export interface ToastHistoryItem {
  toast: Toast;
  dismissedAt: number;
  dismissedBy: 'user' | 'auto' | 'system';
}

export interface ToastPersistenceConfig {
  enabled: boolean;
  storageKey: string;
  maxItems: number;
  ttl: number; // Time to live in ms
}

export interface ToastDeduplicationConfig {
  enabled: boolean;
  window: number; // Time window in ms for deduplication
  strategy: 'ignore' | 'update' | 'increment';
}

export interface ToastGroupingConfig {
  enabled: boolean;
  maxGroupSize: number;
  collapseThreshold: number; // Minimum toasts before collapsing
}

export interface ToastManagerConfig {
  maxToasts: number;
  defaultDuration: number;
  persistence: ToastPersistenceConfig;
  deduplication: ToastDeduplicationConfig;
  grouping: ToastGroupingConfig;
}
