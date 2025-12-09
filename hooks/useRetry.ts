'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
  retryCondition?: (error: Error) => boolean;
}

interface RetryState {
  isLoading: boolean;
  isRetrying: boolean;
  error: Error | null;
  retryCount: number;
  nextRetryIn: number | null;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'onMaxRetriesReached' | 'retryCondition'>> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
};

/**
 * Hook for executing async operations with automatic retry and exponential backoff
 *
 * @example
 * ```tsx
 * const { execute, isLoading, isRetrying, error, retryCount, retry } = useRetry({
 *   maxRetries: 3,
 *   onRetry: (attempt) => console.log(`Retry attempt ${attempt}`),
 * });
 *
 * const fetchData = async () => {
 *   const result = await execute(async () => {
 *     const response = await fetch('/api/data');
 *     if (!response.ok) throw new Error('Failed to fetch');
 *     return response.json();
 *   });
 *   setData(result);
 * };
 * ```
 */
export function useRetry(options: RetryOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<RetryState>({
    isLoading: false,
    isRetrying: false,
    error: null,
    retryCount: 0,
    nextRetryIn: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const calculateDelay = useCallback((attempt: number) => {
    const delay = opts.initialDelay * Math.pow(opts.backoffFactor, attempt);
    return Math.min(delay, opts.maxDelay);
  }, [opts.initialDelay, opts.backoffFactor, opts.maxDelay]);

  const shouldRetry = useCallback((error: Error) => {
    if (options.retryCondition) {
      return options.retryCondition(error);
    }
    // Default: retry on network errors and 5xx status codes
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504')
    );
  }, [options.retryCondition]);

  const execute = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | null> => {
    // Store operation for manual retry
    lastOperationRef.current = operation;

    // Cancel any pending operations
    abortControllerRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      isRetrying: false,
      error: null,
      retryCount: 0,
      nextRetryIn: null,
    }));

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= opts.maxRetries) {
      try {
        const result = await operation();
        setState(prev => ({
          ...prev,
          isLoading: false,
          isRetrying: false,
          error: null,
          retryCount: attempt,
          nextRetryIn: null,
        }));
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (abortControllerRef.current?.signal.aborted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isRetrying: false,
            nextRetryIn: null,
          }));
          return null;
        }

        if (attempt < opts.maxRetries && shouldRetry(lastError)) {
          opts.onRetry?.(attempt + 1, lastError);

          const delay = calculateDelay(attempt);

          setState(prev => ({
            ...prev,
            isRetrying: true,
            retryCount: attempt + 1,
            nextRetryIn: Math.ceil(delay / 1000),
          }));

          // Countdown timer
          let remaining = Math.ceil(delay / 1000);
          countdownRef.current = setInterval(() => {
            remaining -= 1;
            if (remaining > 0) {
              setState(prev => ({ ...prev, nextRetryIn: remaining }));
            }
          }, 1000);

          await new Promise(resolve => {
            timeoutRef.current = setTimeout(resolve, delay);
          });

          if (countdownRef.current) clearInterval(countdownRef.current);
          attempt++;
        } else {
          break;
        }
      }
    }

    // Max retries reached
    opts.onMaxRetriesReached?.(lastError!);
    setState(prev => ({
      ...prev,
      isLoading: false,
      isRetrying: false,
      error: lastError,
      retryCount: attempt,
      nextRetryIn: null,
    }));

    return null;
  }, [opts, shouldRetry, calculateDelay]);

  const retry = useCallback(async () => {
    if (lastOperationRef.current) {
      return execute(lastOperationRef.current);
    }
    return null;
  }, [execute]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setState(prev => ({
      ...prev,
      isLoading: false,
      isRetrying: false,
      nextRetryIn: null,
    }));
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState({
      isLoading: false,
      isRetrying: false,
      error: null,
      retryCount: 0,
      nextRetryIn: null,
    });
    lastOperationRef.current = null;
  }, [cancel]);

  return {
    execute,
    retry,
    cancel,
    reset,
    ...state,
  };
}

/**
 * Simple retry utility function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Omit<RetryOptions, 'onRetry' | 'onMaxRetriesReached'> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= opts.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxRetries) {
        const delay = opts.initialDelay * Math.pow(opts.backoffFactor, attempt);
        const clampedDelay = Math.min(delay, opts.maxDelay);
        await new Promise(resolve => setTimeout(resolve, clampedDelay));
        attempt++;
      } else {
        break;
      }
    }
  }

  throw lastError;
}

export default useRetry;
