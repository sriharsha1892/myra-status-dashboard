'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

// Organization type for pipeline manager
export interface PipelineOrg {
  org_id: string;
  org_name: string;
  org_lifecycle_stage: string | null;
  deal_value: number | null;
  deal_momentum: string | null;
  sales_poc: string | null;
  domain: string | null;
  region: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  demo_date: string | null;
  notes: string | null;
  prospect_source: string | null;
  created_at: string;
  updated_at: string;
}

// Filter interface
export interface PipelineFilters {
  search?: string;
  stage?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// API response types
interface PipelineOrgResponse {
  organizations: PipelineOrg[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stageCounts: Record<string, number>;
  stageLabels: Record<string, string>;
  validStages: string[];
}

// Query key factory
export const pipelineManagerKeys = {
  all: ['pipeline-manager'] as const,
  lists: () => [...pipelineManagerKeys.all, 'list'] as const,
  list: (filters: PipelineFilters) => [...pipelineManagerKeys.lists(), filters] as const,
  detail: (id: string) => [...pipelineManagerKeys.all, 'detail', id] as const,
};

// Fetch function
async function fetchPipelineOrgs(filters: PipelineFilters): Promise<PipelineOrgResponse> {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.limit) params.set('limit', filters.limit.toString());

  const response = await fetch(`/api/leadership/orgs?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch organizations');
  }

  return response.json();
}

// Main hook for fetching pipeline organizations
export function usePipelineOrgs(filters: PipelineFilters = {}) {
  return useQuery({
    queryKey: pipelineManagerKeys.list(filters),
    queryFn: () => fetchPipelineOrgs(filters),
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
}

// Hook for updating a single organization
export function useUpdatePipelineOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, updates }: { orgId: string; updates: Partial<PipelineOrg> }) => {
      const response = await fetch(`/api/leadership/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update organization');
      }

      return response.json();
    },
    onMutate: async ({ orgId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: pipelineManagerKeys.lists() });

      // Snapshot previous value for rollback
      const previousQueries = queryClient.getQueriesData<PipelineOrgResponse>({
        queryKey: pipelineManagerKeys.lists(),
      });

      // Optimistically update
      queryClient.setQueriesData<PipelineOrgResponse>(
        { queryKey: pipelineManagerKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            organizations: old.organizations.map((org) =>
              org.org_id === orgId ? { ...org, ...updates } : org
            ),
          };
        }
      );

      return { previousQueries };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: pipelineManagerKeys.all });
    },
  });
}

// Hook for invalidating pipeline cache
export function useInvalidatePipelineOrgs() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: pipelineManagerKeys.all });
  };
}

// Stage display configuration
export const LIFECYCLE_STAGES = [
  { id: 'customer', label: 'Paying Customer', color: '#10B981' },
  { id: 'negotiation', label: 'Negotiation', color: '#8B5CF6' },
  { id: 'demo_done', label: 'Demo Done', color: '#3B82F6' },
  { id: 'trial_active', label: 'Trial Active', color: '#F59E0B' },
  { id: 'prospect', label: 'Prospect', color: '#6B7280' },
  { id: 'trial_pending', label: 'Trial Pending', color: '#06B6D4' },
  { id: 'trial_expired', label: 'Dormant', color: '#F97316' },
  { id: 'lost', label: 'Lost', color: '#EF4444' },
];

// Momentum display configuration
export const MOMENTUM_OPTIONS = [
  { id: 'positive', label: 'Positive', color: '#10B981' },
  { id: 'neutral', label: 'Neutral', color: '#6B7280' },
  { id: 'stalled', label: 'Stalled', color: '#F59E0B' },
  { id: 'at_risk', label: 'At Risk', color: '#EF4444' },
];

// Bulk update request type
interface BulkUpdateRequest {
  orgIds: string[];
  updates: {
    org_lifecycle_stage?: string;
    deal_momentum?: string | null;
    sales_poc?: string | null;
  };
}

// Hook for bulk updating organizations
export function useBulkUpdatePipelineOrgs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgIds, updates }: BulkUpdateRequest) => {
      const response = await fetch('/api/leadership/orgs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_ids: orgIds, updates }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bulk update organizations');
      }

      return response.json();
    },
    onMutate: async ({ orgIds, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: pipelineManagerKeys.lists() });

      // Snapshot previous value for rollback
      const previousQueries = queryClient.getQueriesData<PipelineOrgResponse>({
        queryKey: pipelineManagerKeys.lists(),
      });

      // Optimistically update all matching orgs
      queryClient.setQueriesData<PipelineOrgResponse>(
        { queryKey: pipelineManagerKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            organizations: old.organizations.map((org) =>
              orgIds.includes(org.org_id) ? { ...org, ...updates } : org
            ),
          };
        }
      );

      return { previousQueries };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: pipelineManagerKeys.all });
    },
  });
}
