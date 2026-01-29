import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TeamMember, TeamPerformanceResponse } from '@/app/api/gtm/team/route';

export type { TeamMember, TeamPerformanceResponse };

/**
 * Fetch team performance data
 */
async function fetchTeamPerformance(
  sortBy: string = 'won_value',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<TeamPerformanceResponse> {
  const response = await fetch(
    `/api/gtm/team?sortBy=${sortBy}&sortOrder=${sortOrder}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch team performance');
  }

  return response.json();
}

/**
 * Fetch detailed data for a specific sales POC
 */
async function fetchSalesPocDetail(salesPoc: string): Promise<{
  success: boolean;
  salesPoc: string;
  totalOrgs: number;
  byStage: Record<string, unknown[]>;
  stageHistory: Array<{
    orgId: string;
    orgName: string;
    currentStage: string;
    stageUpdatedAt: string;
    createdAt: string;
    dealValue: number | null;
  }>;
}> {
  const response = await fetch('/api/gtm/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ salesPoc }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch sales POC details');
  }

  return response.json();
}

/**
 * Hook for fetching team performance
 */
export function useGtmTeam(
  sortBy: string = 'won_value',
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  return useQuery({
    queryKey: ['gtm-team', sortBy, sortOrder],
    queryFn: () => fetchTeamPerformance(sortBy, sortOrder),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching detailed sales POC data
 */
export function useSalesPocDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fetchSalesPocDetail,
    onSuccess: (data) => {
      // Cache the result
      queryClient.setQueryData(['gtm-team-detail', data.salesPoc], data);
    },
  });
}

/**
 * Hook for getting cached sales POC detail
 */
export function useCachedSalesPocDetail(salesPoc: string | null) {
  return useQuery({
    queryKey: ['gtm-team-detail', salesPoc],
    queryFn: () => (salesPoc ? fetchSalesPocDetail(salesPoc) : null),
    enabled: !!salesPoc,
    staleTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Sort options for team performance
 */
export const TEAM_SORT_OPTIONS = [
  { value: 'won_value', label: 'Won Value' },
  { value: 'pipeline_value', label: 'Pipeline Value' },
  { value: 'total_arr', label: 'Total ARR' },
  { value: 'won_deals', label: 'Won Deals' },
  { value: 'total_orgs', label: 'Total Orgs' },
  { value: 'trial_to_won_rate', label: 'Conversion Rate' },
  { value: 'demos', label: 'Demos' },
  { value: 'trials', label: 'Trials' },
] as const;
