import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  GtmDashboardResponse,
  OrgSummary,
  TrendData,
} from '@/app/api/gtm/dashboard/route';
import type { GtmCostsResponse } from '@/app/api/gtm/costs/route';

export type { GtmDashboardResponse, OrgSummary, TrendData };

/**
 * Fetch GTM dashboard data
 */
async function fetchGtmDashboard(days: number = 30): Promise<GtmDashboardResponse> {
  const response = await fetch(`/api/gtm/dashboard?days=${days}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch GTM dashboard');
  }

  return response.json();
}

/**
 * Fetch GTM costs data
 */
async function fetchGtmCosts(days: number): Promise<GtmCostsResponse> {
  const response = await fetch(`/api/gtm/costs?days=${days}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch GTM costs');
  }

  return response.json();
}

/**
 * Update organization stage
 */
async function updateOrgStage(data: {
  orgId: string;
  newStage: string;
  notes?: string;
}): Promise<{ success: boolean; org: Record<string, unknown> }> {
  const response = await fetch('/api/gtm/dashboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update organization stage');
  }

  return response.json();
}

/**
 * Hook for fetching GTM dashboard data
 */
export function useGtmDashboard(days: number = 30) {
  return useQuery({
    queryKey: ['gtm-dashboard', days],
    queryFn: () => fetchGtmDashboard(days),
    staleTime: 60_000, // 1 minute - manual refresh model
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching GTM costs
 */
export function useGtmCosts(days: number = 30) {
  return useQuery({
    queryKey: ['gtm-costs', days],
    queryFn: () => fetchGtmCosts(days),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for updating organization stage (drag-drop, keyboard shortcuts)
 */
export function useUpdateOrgStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrgStage,
    onSuccess: () => {
      // Invalidate dashboard to refresh pipeline
      queryClient.invalidateQueries({ queryKey: ['gtm-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['gtm-costs'] });
    },
  });
}

/**
 * Refresh dashboard data manually
 */
export function useRefreshDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['gtm-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['gtm-costs'] });
    queryClient.invalidateQueries({ queryKey: ['gtm-campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['gtm-team'] });
  };
}
