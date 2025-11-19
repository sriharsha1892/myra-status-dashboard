/**
 * useLoadingState Hook
 *
 * Manages loading, error, and success states for async operations.
 * Provides consistent error handling and toast notifications.
 *
 * Features:
 * - Automatic loading state management
 * - Error handling with optional toast notifications
 * - Success callbacks with optional toast notifications
 * - Race condition prevention
 * - TypeScript typed
 *
 * @example
 * ```tsx
 * const { isLoading, error, execute } = useLoadingState();
 *
 * const handleSubmit = async (data: FormData) => {
 *   await execute(
 *     async () => {
 *       const response = await api.createTrial(data);
 *       return response;
 *     },
 *     {
 *       successMessage: 'Trial created successfully!',
 *       errorMessage: 'Failed to create trial',
 *       onSuccess: (data) => {
 *         router.push(`/trials/${data.id}`);
 *       },
 *     }
 *   );
 * };
 * ```
 */

import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export interface UseLoadingStateOptions<T> {
  /**
   * Success message to show in toast
   */
  successMessage?: string;

  /**
   * Error message to show in toast
   * If a function, it receives the error object
   */
  errorMessage?: string | ((error: Error) => string);

  /**
   * Callback to run on success
   */
  onSuccess?: (data: T) => void | Promise<void>;

  /**
   * Callback to run on error
   */
  onError?: (error: Error) => void | Promise<void>;

  /**
   * Show loading toast during operation
   * Useful for long-running operations
   */
  showLoadingToast?: boolean;

  /**
   * Loading toast message
   */
  loadingMessage?: string;
}

export interface UseLoadingStateReturn<T> {
  /**
   * Whether an operation is currently in progress
   */
  isLoading: boolean;

  /**
   * The most recent error, if any
   */
  error: Error | null;

  /**
   * Execute an async operation with automatic state management
   */
  execute: (
    operation: () => Promise<T>,
    options?: UseLoadingStateOptions<T>
  ) => Promise<T | null>;

  /**
   * Clear the current error
   */
  clearError: () => void;

  /**
   * Reset all state
   */
  reset: () => void;
}

/**
 * Hook for managing async operation state
 */
export function useLoadingState<T = void>(): UseLoadingStateReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track the most recent operation to prevent race conditions
  const operationIdRef = useRef(0);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const execute = useCallback(
    async (
      operation: () => Promise<T>,
      options: UseLoadingStateOptions<T> = {}
    ): Promise<T | null> => {
      const {
        successMessage,
        errorMessage,
        onSuccess,
        onError,
        showLoadingToast = false,
        loadingMessage = 'Processing...',
      } = options;

      // Increment operation ID for race condition prevention
      operationIdRef.current += 1;
      const currentOperationId = operationIdRef.current;

      setIsLoading(true);
      setError(null);

      let loadingToastId: string | undefined;
      if (showLoadingToast) {
        loadingToastId = toast.loading(loadingMessage);
      }

      try {
        const result = await operation();

        // Only update state if this is still the current operation
        if (currentOperationId === operationIdRef.current) {
          setIsLoading(false);

          // Dismiss loading toast
          if (loadingToastId) {
            toast.dismiss(loadingToastId);
          }

          // Show success toast
          if (successMessage) {
            toast.success(successMessage);
          }

          // Run success callback
          if (onSuccess) {
            await onSuccess(result);
          }

          return result;
        }

        // Operation was superseded, just dismiss loading toast
        if (loadingToastId) {
          toast.dismiss(loadingToastId);
        }

        return null;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Only update state if this is still the current operation
        if (currentOperationId === operationIdRef.current) {
          setIsLoading(false);
          setError(error);

          // Dismiss loading toast
          if (loadingToastId) {
            toast.dismiss(loadingToastId);
          }

          // Show error toast
          if (errorMessage) {
            const message =
              typeof errorMessage === 'function'
                ? errorMessage(error)
                : errorMessage;
            toast.error(message);
          }

          // Run error callback
          if (onError) {
            await onError(error);
          }
        } else {
          // Operation was superseded, just dismiss loading toast
          if (loadingToastId) {
            toast.dismiss(loadingToastId);
          }
        }

        return null;
      }
    },
    []
  );

  return {
    isLoading,
    error,
    execute,
    clearError,
    reset,
  };
}

/**
 * Type-safe variant for operations that don't return data
 */
export function useLoadingStateVoid(): UseLoadingStateReturn<void> {
  return useLoadingState<void>();
}
