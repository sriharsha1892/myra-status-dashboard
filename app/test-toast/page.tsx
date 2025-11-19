'use client';

/**
 * Toast System Test Page
 * Comprehensive testing interface for the Enhanced Toast System
 */

import { useState } from 'react';
import { enhancedToast } from '@/lib/toast/manager';
import { showEnhancedError } from '@/lib/errorHandler';

export default function ToastTestPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Enhanced Toast System - Test Page
        </h1>

        <div className="space-y-8">
          {/* Basic Toasts */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Basic Toasts
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => enhancedToast.success('Operation completed successfully')}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                data-testid="toast-success"
              >
                Success Toast
              </button>

              <button
                onClick={() => enhancedToast.error('Something went wrong')}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                data-testid="toast-error"
              >
                Error Toast
              </button>

              <button
                onClick={() => enhancedToast.warning('Please review this carefully')}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                data-testid="toast-warning"
              >
                Warning Toast
              </button>

              <button
                onClick={() => enhancedToast.info('Here is some information')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                data-testid="toast-info"
              >
                Info Toast
              </button>
            </div>
          </section>

          {/* Toast with Description */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Toast with Description
            </h2>
            <button
              onClick={() =>
                enhancedToast.success('User account created', {
                  description: 'Welcome email has been sent to the user',
                })
              }
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              data-testid="toast-with-description"
            >
              Show Toast with Description
            </button>
          </section>

          {/* Loading States */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Loading States
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const id = enhancedToast.loading('Processing your request...');
                  setLoadingId(id);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                data-testid="toast-loading"
              >
                Show Loading
              </button>

              <button
                onClick={() => {
                  if (loadingId) {
                    enhancedToast.resolveLoading(loadingId, 'Request completed successfully');
                    setLoadingId(null);
                  }
                }}
                disabled={!loadingId}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="toast-resolve"
              >
                Resolve Loading
              </button>

              <button
                onClick={() => {
                  if (loadingId) {
                    enhancedToast.rejectLoading(loadingId, 'Request failed');
                    setLoadingId(null);
                  }
                }}
                disabled={!loadingId}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="toast-reject"
              >
                Reject Loading
              </button>
            </div>
          </section>

          {/* Toast with Retry */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Toast with Retry Action
            </h2>
            <button
              onClick={() => {
                let attempts = 0;
                const attemptOperation = () => {
                  attempts++;
                  if (attempts < 3) {
                    enhancedToast.error(`Operation failed (attempt ${attempts})`, {
                      description: 'Click retry to try again',
                      onRetry: attemptOperation,
                    });
                  } else {
                    enhancedToast.success('Operation succeeded on retry!');
                  }
                };
                attemptOperation();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              data-testid="toast-with-retry"
            >
              Show Error with Retry
            </button>
          </section>

          {/* Toast with Custom Actions */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Toast with Custom Actions
            </h2>
            <button
              onClick={() => {
                enhancedToast.show({
                  type: 'info',
                  message: 'New feature available',
                  description: 'Check out our new analytics dashboard',
                  actions: [
                    {
                      label: 'View Now',
                      variant: 'primary',
                      onClick: () => {
                        enhancedToast.success('Navigating to analytics...');
                      },
                    },
                    {
                      label: 'Remind Later',
                      variant: 'secondary',
                      onClick: () => {
                        enhancedToast.info('We will remind you later');
                      },
                    },
                  ],
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              data-testid="toast-with-actions"
            >
              Show Toast with Actions
            </button>
          </section>

          {/* Progressive Disclosure */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Progressive Disclosure
            </h2>
            <button
              onClick={() => {
                enhancedToast.show({
                  type: 'error',
                  message: 'Database connection failed',
                  description: 'Unable to connect to the database server',
                  expandable: true,
                  metadata: {
                    technicalDetails:
                      'Connection timeout after 30s.\nHost: db.example.com:5432\nError: ECONNREFUSED',
                    errorCode: 'DB_CONN_001',
                    context: 'database_connection',
                  },
                });
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              data-testid="toast-expandable"
            >
              Show Expandable Error
            </button>
          </section>

          {/* Deduplication */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Deduplication
            </h2>
            <button
              onClick={() => {
                // Show same toast multiple times
                for (let i = 0; i < 5; i++) {
                  enhancedToast.success('User saved successfully', {
                    metadata: {
                      dedupeKey: 'user_save_success',
                    },
                  });
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              data-testid="toast-deduplicate"
            >
              Trigger 5x Duplicate Toasts
            </button>
          </section>

          {/* Priority Levels */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Priority Levels
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  enhancedToast.error('Critical system failure', {
                    priority: 'critical',
                  })
                }
                className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900"
                data-testid="toast-priority-critical"
              >
                Critical Priority
              </button>

              <button
                onClick={() =>
                  enhancedToast.error('High priority alert', {
                    priority: 'high',
                  })
                }
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                data-testid="toast-priority-high"
              >
                High Priority
              </button>

              <button
                onClick={() =>
                  enhancedToast.info('Normal notification', {
                    priority: 'normal',
                  })
                }
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                data-testid="toast-priority-normal"
              >
                Normal Priority
              </button>
            </div>
          </section>

          {/* Integration with Error Handler */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Error Handler Integration
            </h2>
            <button
              onClick={() => {
                const error = new Error('Network request timeout');
                showEnhancedError(error, 'api_call', {
                  onRetry: async () => {
                    enhancedToast.success('Retry successful!');
                  },
                  priority: 'high',
                });
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              data-testid="toast-error-handler"
            >
              Trigger Error Handler Toast
            </button>
          </section>

          {/* Dismiss All */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Dismiss All Toasts
            </h2>
            <button
              onClick={() => enhancedToast.dismissAll()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              data-testid="toast-dismiss-all"
            >
              Dismiss All Toasts
            </button>
          </section>
        </div>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> This page demonstrates all features of the Enhanced Toast
            System. Use the buttons above to trigger different toast types and behaviors. Toasts
            appear in the top-right corner of the screen.
          </p>
        </div>
      </div>
    </div>
  );
}
