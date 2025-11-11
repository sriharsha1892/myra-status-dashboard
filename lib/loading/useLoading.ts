import { useCallback, useEffect, useRef, useState } from 'react';
import { LoadingContext, LoadingSubContext, UseLoadingReturn } from './types';
import { useLoadingContext } from './LoadingContext';
import { getLoadingMessage } from './loadingMessages';

/**
 * Custom hook for managing loading states in components
 *
 * @param context - The loading context (page, chart, data, etc.)
 * @param subContext - Optional sub-context for more specific messaging
 * @returns Object with loading state and control methods
 *
 * @example
 * ```tsx
 * const { isLoading, message, startLoading, stopLoading } = useLoading('page', 'reports');
 *
 * useEffect(() => {
 *   startLoading();
 *   fetchData().finally(() => stopLoading());
 * }, []);
 *
 * if (isLoading) return <LoadingOverlay message={message} />;
 * ```
 */
export function useLoading(
  context: LoadingContext,
  subContext?: LoadingSubContext
): UseLoadingReturn {
  const { showLoading, hideLoading, isLoading: globalIsLoading, currentMessage } = useLoadingContext();
  const loadingIdRef = useRef<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string>('');

  // Start loading
  const startLoading = useCallback((): string => {
    // Only start if not already loading
    if (loadingIdRef.current) {
      return loadingIdRef.current;
    }

    const id = showLoading(context, subContext);
    loadingIdRef.current = id;

    // Set initial local message
    const message = getLoadingMessage(context, subContext);
    setLocalMessage(message);

    return id;
  }, [context, subContext, showLoading]);

  // Stop loading
  const stopLoading = useCallback(() => {
    if (loadingIdRef.current) {
      hideLoading(loadingIdRef.current);
      loadingIdRef.current = null;
      setLocalMessage('');
    }
  }, [hideLoading]);

  // Check if this specific loading state is active
  const isLoading = loadingIdRef.current !== null;

  // Sync local message with global message when loading
  useEffect(() => {
    if (isLoading) {
      setLocalMessage(currentMessage);
    }
  }, [isLoading, currentMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingIdRef.current) {
        hideLoading(loadingIdRef.current);
      }
    };
  }, [hideLoading]);

  return {
    isLoading,
    message: localMessage,
    startLoading,
    stopLoading,
  };
}

/**
 * Simpler hook that just checks if any loading is active for a given context
 * Useful for read-only loading state checks
 *
 * @example
 * ```tsx
 * const isPageLoading = useIsLoading('page');
 * const isAnyLoading = useIsLoading();
 * ```
 */
export function useIsLoading(context?: LoadingContext): boolean {
  const { isLoading } = useLoadingContext();
  return isLoading(context);
}
