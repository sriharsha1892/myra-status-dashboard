'use client';

/**
 * Enhanced Toast Component
 * Custom toast with progressive disclosure, actions, and rich UI
 */

import { useState } from 'react';
import { Toast as ToastType } from '@/lib/toast/types';
import { ToastActions } from './ToastActions';

interface EnhancedToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export function EnhancedToast({ toast, onDismiss }: EnhancedToastProps) {
  const [isExpanded, setIsExpanded] = useState(toast.expanded || false);

  const handleDismiss = () => {
    onDismiss(toast.id);
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Type-based styling
  const getTypeStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-900 dark:text-green-100',
          icon: '✓',
          iconBg: 'bg-green-100 dark:bg-green-800',
          iconText: 'text-green-600 dark:text-green-300',
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-900 dark:text-red-100',
          icon: '✕',
          iconBg: 'bg-red-100 dark:bg-red-800',
          iconText: 'text-red-600 dark:text-red-300',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-900 dark:text-amber-100',
          icon: '⚠',
          iconBg: 'bg-amber-100 dark:bg-amber-800',
          iconText: 'text-amber-600 dark:text-amber-300',
        };
      case 'loading':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-900 dark:text-blue-100',
          icon: '⟳',
          iconBg: 'bg-blue-100 dark:bg-blue-800',
          iconText: 'text-blue-600 dark:text-blue-300',
        };
      default: // info
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-900 dark:text-gray-100',
          icon: 'ℹ',
          iconBg: 'bg-gray-100 dark:bg-gray-800',
          iconText: 'text-gray-600 dark:text-gray-300',
        };
    }
  };

  // Priority-based border styling
  const getPriorityBorder = () => {
    switch (toast.priority) {
      case 'critical':
        return 'border-l-4 border-l-red-600 dark:border-l-red-400';
      case 'high':
        return 'border-l-4 border-l-amber-600 dark:border-l-amber-400';
      case 'low':
        return 'border-l-2 border-l-gray-300 dark:border-l-gray-600';
      default:
        return '';
    }
  };

  const styles = getTypeStyles();
  const priorityBorder = getPriorityBorder();

  const hasExpandableContent =
    toast.expandable &&
    (toast.description || toast.metadata?.technicalDetails);

  return (
    <div
      data-testid="enhanced-toast-container"
      className={`
        ${styles.bg} ${styles.border} ${styles.text}
        ${priorityBorder}
        border rounded-lg shadow-lg p-4 min-w-[320px] max-w-[500px]
        animate-in slide-in-from-top-5 duration-300
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
            ${styles.iconBg} ${styles.iconText}
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
            text-lg font-semibold
            ${toast.type === 'loading' ? 'animate-spin' : ''}
          `}
        >
          {toast.icon || styles.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Message and count */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-sm leading-5">
              {toast.message}
              {toast.count && toast.count > 1 && (
                <span className="ml-2 text-xs opacity-75">
                  ({toast.count})
                </span>
              )}
            </p>

            {/* Dismiss button */}
            {toast.type !== 'loading' && (
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Dismiss"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Description (if not expandable or always shown) */}
          {toast.description && !hasExpandableContent && (
            <p className="text-xs opacity-90 mb-2">{toast.description}</p>
          )}

          {/* Expandable content */}
          {hasExpandableContent && (
            <div className="mb-2">
              {!isExpanded && toast.description && (
                <p className="text-xs opacity-90 mb-2">{toast.description}</p>
              )}

              {isExpanded && (
                <div className="mt-2 space-y-2">
                  {toast.description && (
                    <p className="text-xs opacity-90">{toast.description}</p>
                  )}

                  {toast.metadata?.technicalDetails && (
                    <div className="bg-black/5 dark:bg-white/5 rounded p-2 mt-2">
                      <p className="text-xs font-mono opacity-75 break-all">
                        {toast.metadata.technicalDetails}
                      </p>
                    </div>
                  )}

                  {toast.metadata?.errorCode && (
                    <p className="text-xs font-mono opacity-75">
                      Error Code: {toast.metadata.errorCode}
                    </p>
                  )}

                  {toast.metadata?.context && (
                    <p className="text-xs opacity-75">
                      Context: {toast.metadata.context}
                    </p>
                  )}
                </div>
              )}

              {/* Expand/Collapse button */}
              <button
                onClick={handleToggleExpand}
                className="text-xs font-medium opacity-75 hover:opacity-100 transition-opacity mt-1"
              >
                {isExpanded ? 'Show less' : 'Show details'}
              </button>
            </div>
          )}

          {/* Actions */}
          {(toast.actions || toast.onRetry || toast.onUndo || toast.onViewDetails) && (
            <ToastActions
              toast={toast}
              onDismiss={handleDismiss}
            />
          )}
        </div>
      </div>
    </div>
  );
}
