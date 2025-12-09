'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

type TrialOrg = Database['public']['Tables']['trial_organizations']['Row'];

export interface OrgWithUsers extends TrialOrg {
  user_count: number;
  active_users: number;
}

export interface TrialOrganizationsFilters {
  searchQuery?: string;
  stageFilter?: string;
  companyFilter?: string;
  accountManagerFilter?: string;
  trialStatusFilter?: string;
  activityFilter?: string;
  expiryFilter?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  // Role-based filters
  is_super_admin?: boolean;
  parent_company?: string | null;
}

const DEFAULT_PAGE_SIZE = 50;

// Query key factory for consistent cache keys
export const trialOrganizationsKeys = {
  all: ['trial-organizations'] as const,
  lists: () => [...trialOrganizationsKeys.all, 'list'] as const,
  list: (filters: TrialOrganizationsFilters) => [...trialOrganizationsKeys.lists(), filters] as const,
  details: () => [...trialOrganizationsKeys.all, 'detail'] as const,
  detail: (id: string) => [...trialOrganizationsKeys.details(), id] as const,
};

// Fetch function for trial organizations
async function fetchTrialOrganizations(filters: TrialOrganizationsFilters): Promise<{
  organizations: OrgWithUsers[];
  totalCount: number;
}> {
  const supabase = createClient();
  const {
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    is_super_admin,
    parent_company,
  } = filters;

  // Calculate range for server-side pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build query with role-based filtering and join trial_users
  let query = supabase
    .from('trial_organizations')
    .select(`
      *,
      trial_users(current_stage)
    `, { count: 'exact' });

  // If not super admin: filter by parent company
  if (!is_super_admin && parent_company) {
    query = query.eq('parent_company', parent_company);
  }

  const { data: orgs, error, count } = await query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to);

  if (error) throw error;

  // Process joined data
  const orgsWithUsers: OrgWithUsers[] = (orgs || []).map((org: any) => {
    const orgUsers = org.trial_users || [];
    return {
      ...org,
      user_count: orgUsers.length,
      active_users: orgUsers.filter((u: any) => u.current_stage === 'active').length,
      trial_users: undefined, // Remove the nested data
    };
  });

  return {
    organizations: orgsWithUsers,
    totalCount: count || 0,
  };
}

// Main hook for fetching trial organizations
export function useTrialOrganizations(filters: TrialOrganizationsFilters) {
  return useQuery({
    queryKey: trialOrganizationsKeys.list(filters),
    queryFn: () => fetchTrialOrganizations(filters),
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep old data while loading new
  });
}

// Hook for prefetching next page
export function usePrefetchTrialOrganizations() {
  const queryClient = useQueryClient();

  return (filters: TrialOrganizationsFilters) => {
    queryClient.prefetchQuery({
      queryKey: trialOrganizationsKeys.list(filters),
      queryFn: () => fetchTrialOrganizations(filters),
      staleTime: 30_000,
    });
  };
}

// Hook for invalidating trial organizations cache
export function useInvalidateTrialOrganizations() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: trialOrganizationsKeys.all });
  };
}

// Hook for updating a single organization with optimistic update
export function useUpdateTrialOrganization() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ orgId, updates }: { orgId: string; updates: Partial<TrialOrg> }) => {
      const { data, error } = await supabase
        .from('trial_organizations')
        .update(updates)
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ orgId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: trialOrganizationsKeys.all });

      // Snapshot the previous value for rollback
      const previousQueries = queryClient.getQueriesData({ queryKey: trialOrganizationsKeys.lists() });

      // Optimistically update all matching queries
      queryClient.setQueriesData(
        { queryKey: trialOrganizationsKeys.lists() },
        (old: { organizations: OrgWithUsers[]; totalCount: number } | undefined) => {
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
      queryClient.invalidateQueries({ queryKey: trialOrganizationsKeys.all });
    },
  });
}

// Hook for bulk updates using batch API endpoint
export function useBulkUpdateTrialOrganizations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgIds,
      updates,
    }: {
      orgIds: string[];
      updates: Partial<TrialOrg>;
    }) => {
      // Use batch API endpoint for efficient bulk updates
      const response = await fetch('/api/trials/bulk-operations/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_ids: orgIds,
          updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk update failed');
      }

      const data = await response.json();
      return {
        successful: data.updated_ids.map((id: string) => ({ orgId: id })),
        failed: [],
        total: orgIds.length,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trialOrganizationsKeys.all });
    },
  });
}
