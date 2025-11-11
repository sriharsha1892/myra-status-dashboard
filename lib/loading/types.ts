/**
 * Loading context types for contextual message selection
 */
export type LoadingContext =
  | 'page'
  | 'chart'
  | 'data'
  | 'navigation'
  | 'action'
  | 'general';

/**
 * Sub-contexts for more specific messaging
 */
export type LoadingSubContext =
  // Page contexts
  | 'reports'
  | 'dashboard'
  | 'trials'
  | 'roadmap'
  | 'tickets'
  // Chart contexts
  | 'lineChart'
  | 'barChart'
  | 'pieChart'
  | 'areaChart'
  | 'sankey'
  // Data contexts
  | 'organizations'
  | 'users'
  | 'analytics'
  | 'tickets_data'
  // Action contexts
  | 'saving'
  | 'deleting'
  | 'updating'
  // General
  | 'default';

/**
 * Loading state interface
 */
export interface LoadingState {
  id: string;
  context: LoadingContext;
  subContext?: LoadingSubContext;
  startedAt: number;
}

/**
 * Loading context value interface
 */
export interface LoadingContextValue {
  activeLoading: LoadingState[];
  currentMessage: string;
  showLoading: (context: LoadingContext, subContext?: LoadingSubContext) => string;
  hideLoading: (id: string) => void;
  isLoading: (context?: LoadingContext) => boolean;
}

/**
 * useLoading hook return type
 */
export interface UseLoadingReturn {
  isLoading: boolean;
  message: string;
  startLoading: () => string;
  stopLoading: () => void;
}
