'use client';

/**
 * Toast Actions Component
 * Handles action buttons for enhanced toasts (retry, undo, custom actions)
 */

import { useState } from 'react';
import { Toast, ToastAction } from '@/lib/toast/types';

interface ToastActionsProps {
  toast: Toast;
  onDismiss: () => void;
}

export function ToastActions({ toast, onDismiss }: ToastActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAction = async (
    action: ToastAction | (() => void | Promise<void>),
    actionId: string
  ) => {
    setLoadingAction(actionId);
    try {
      if (typeof action === 'function') {
        await action();
      } else {
        await action.onClick();
      }
      onDismiss();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const getButtonStyles = (variant?: 'primary' | 'secondary' | 'danger') => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'secondary':
      default:
        return 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {/* Retry action */}
      {toast.onRetry && (
        <button
          onClick={() => handleAction(toast.onRetry!, 'retry')}
          disabled={loadingAction === 'retry'}
          data-testid="toast-retry-button"
          className={`
            ${getButtonStyles('primary')}
            px-3 py-1.5 rounded text-xs font-medium
            transition-colors disabled:opacity-50
            flex items-center gap-1.5
          `}
        >
          {loadingAction === 'retry' ? (
            <>
              <svg
                className="animate-spin h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Retrying...
            </>
          ) : (
            <>
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry
            </>
          )}
        </button>
      )}

      {/* Undo action */}
      {toast.onUndo && (
        <button
          onClick={() => handleAction(toast.onUndo!, 'undo')}
          disabled={loadingAction === 'undo'}
          className={`
            ${getButtonStyles('secondary')}
            px-3 py-1.5 rounded text-xs font-medium
            transition-colors disabled:opacity-50
            flex items-center gap-1.5
          `}
        >
          {loadingAction === 'undo' ? (
            <>
              <svg
                className="animate-spin h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Undoing...
            </>
          ) : (
            <>
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              Undo
            </>
          )}
        </button>
      )}

      {/* View Details action */}
      {toast.onViewDetails && (
        <button
          onClick={() => handleAction(toast.onViewDetails!, 'view-details')}
          disabled={loadingAction === 'view-details'}
          className={`
            ${getButtonStyles('secondary')}
            px-3 py-1.5 rounded text-xs font-medium
            transition-colors disabled:opacity-50
          `}
        >
          {loadingAction === 'view-details' ? 'Loading...' : 'View Details'}
        </button>
      )}

      {/* Custom actions */}
      {toast.actions?.map((action, index) => (
        <button
          key={index}
          onClick={() => handleAction(action, `custom-${index}`)}
          disabled={loadingAction === `custom-${index}` || action.loading}
          className={`
            ${getButtonStyles(action.variant)}
            px-3 py-1.5 rounded text-xs font-medium
            transition-colors disabled:opacity-50
            flex items-center gap-1.5
          `}
        >
          {(loadingAction === `custom-${index}` || action.loading) ? (
            <>
              <svg
                className="animate-spin h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading...
            </>
          ) : (
            action.label
          )}
        </button>
      ))}
    </div>
  );
}
