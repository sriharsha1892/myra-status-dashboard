import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  GTMMetricsResponse,
  HubSpotMetrics,
  ApolloMetrics,
  InboundMetrics,
} from '@/app/api/quote/reporting/route';

export type { GTMMetricsResponse, HubSpotMetrics, ApolloMetrics, InboundMetrics };

// Query key factory
export const gtmMetricsKeys = {
  all: ['gtm-metrics'] as const,
  byDays: (days: number) => ['gtm-metrics', days] as const,
};

/**
 * Fetch GTM metrics from API
 */
async function fetchGTMMetrics(days: number = 30): Promise<GTMMetricsResponse> {
  const response = await fetch(`/api/quote/reporting?days=${days}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch GTM metrics');
  }

  return response.json();
}

/**
 * Save GTM metrics to API
 */
interface SaveMetricsParams {
  entry_date: string;
  metrics: {
    hubspot?: HubSpotMetrics;
    apollo?: ApolloMetrics;
    inbound?: InboundMetrics;
  };
  created_by?: string;
}

async function saveGTMMetrics(params: SaveMetricsParams): Promise<{ success: boolean; saved: number }> {
  const response = await fetch('/api/quote/reporting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save GTM metrics');
  }

  return response.json();
}

/**
 * Hook for fetching GTM metrics
 */
export function useGTMMetrics(days: number = 30) {
  return useQuery({
    queryKey: gtmMetricsKeys.byDays(days),
    queryFn: () => fetchGTMMetrics(days),
    staleTime: 60_000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for saving GTM metrics
 */
export function useSaveGTMMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveGTMMetrics,
    onSuccess: () => {
      // Invalidate all GTM metrics queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: gtmMetricsKeys.all });
    },
  });
}

/**
 * Hook to refresh GTM metrics
 */
export function useRefreshGTMMetrics() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: gtmMetricsKeys.all });
  };
}
