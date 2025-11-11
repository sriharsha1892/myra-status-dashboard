/**
 * Myra Loading Service
 * Central loading management with personality
 */

// Context and Provider
export { LoadingProvider, useLoadingContext } from './LoadingContext';

// Hooks
export { useLoading, useIsLoading } from './useLoading';

// Types
export type {
  LoadingContext,
  LoadingSubContext,
  LoadingState,
  LoadingContextValue,
  UseLoadingReturn,
} from './types';

// Message utilities (for standalone use if needed)
export { getLoadingMessage, getSequentialLoadingMessage } from './loadingMessages';
