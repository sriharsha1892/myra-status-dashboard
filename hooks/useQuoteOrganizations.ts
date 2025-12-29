import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Organization, OrganizationInput } from '@/lib/quote/organization-types';
import type { OrgStatus } from '@/lib/quote/pipeline-types';
import type { OrgStats } from '@/lib/quote/utils';

interface OrganizationsResponse {
  data: Organization[];
  stats: OrgStats | null;
  error?: string;
}

interface OrganizationFilters {
  search?: string;
  status?: OrgStatus | 'all';
  trialStatus?: string;
  employee?: string;
  includeContacts?: boolean;
  includeSubsidiaries?: boolean;
  parentOnly?: boolean;
}

// Query keys factory
export const quoteOrganizationsKeys = {
  all: ['quote-organizations'] as const,
  list: (filters?: OrganizationFilters) => [...quoteOrganizationsKeys.all, 'list', filters] as const,
  detail: (id: string) => [...quoteOrganizationsKeys.all, 'detail', id] as const,
  parents: () => [...quoteOrganizationsKeys.all, 'parents'] as const,
};

// Fetch organizations with filters
async function fetchOrganizations(filters?: OrganizationFilters): Promise<OrganizationsResponse> {
  const params = new URLSearchParams();

  if (filters?.search) params.set('search', filters.search);
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.trialStatus) params.set('trialStatus', filters.trialStatus);
  if (filters?.employee) params.set('employee', filters.employee);
  if (filters?.includeContacts) params.set('includeContacts', 'true');
  if (filters?.includeSubsidiaries) params.set('includeSubsidiaries', 'true');
  if (filters?.parentOnly) params.set('parentOnly', 'true');

  const response = await fetch(`/api/quote/organizations?${params.toString()}`);
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return {
    data: data.data || [],
    stats: data.stats || null,
  };
}

// Fetch parent organizations only (for dropdowns)
async function fetchParentOrganizations(): Promise<Organization[]> {
  const response = await fetch('/api/quote/organizations?parentOnly=true');
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.data || [];
}

// Create organization
async function createOrganization(input: OrganizationInput): Promise<Organization> {
  const response = await fetch('/api/quote/organizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || 'Failed to create organization');
  }

  return data.data;
}

// Update organization
async function updateOrganization({ id, updates }: { id: string; updates: Partial<OrganizationInput> }): Promise<Organization> {
  const response = await fetch('/api/quote/organizations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, updates }),
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || 'Failed to update organization');
  }

  return data.data;
}

// Update organization status
async function updateOrganizationStatus({ id, status }: { id: string; status: OrgStatus }): Promise<Organization> {
  return updateOrganization({ id, updates: { status } });
}

// Bulk update organizations
async function bulkUpdateOrganizations({ ids, updates }: { ids: string[]; updates: Partial<OrganizationInput> }): Promise<{ success: boolean; updated: number }> {
  const response = await fetch('/api/quote/organizations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, updates }),
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || 'Failed to bulk update organizations');
  }

  return { success: true, updated: ids.length };
}

/**
 * Hook to fetch organizations with filters
 */
export function useQuoteOrganizations(filters?: OrganizationFilters) {
  return useQuery({
    queryKey: quoteOrganizationsKeys.list(filters),
    queryFn: () => fetchOrganizations(filters),
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Hook to fetch parent organizations (for dropdowns)
 */
export function useParentOrganizations() {
  return useQuery({
    queryKey: quoteOrganizationsKeys.parents(),
    queryFn: fetchParentOrganizations,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Hook to create an organization
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteOrganizationsKeys.all });
    },
  });
}

/**
 * Hook to update an organization
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteOrganizationsKeys.all });
    },
  });
}

/**
 * Hook to update organization status (with optimistic update)
 */
export function useUpdateOrganizationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrganizationStatus,
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: quoteOrganizationsKeys.all });

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: quoteOrganizationsKeys.all });

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: quoteOrganizationsKeys.all },
        (old: OrganizationsResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map(org =>
              org.id === id
                ? { ...org, status, status_updated_at: new Date().toISOString() }
                : org
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: quoteOrganizationsKeys.all });
    },
  });
}

/**
 * Hook to bulk update organizations (with optimistic update)
 */
export function useBulkUpdateOrganizations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkUpdateOrganizations,
    onMutate: async ({ ids, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: quoteOrganizationsKeys.all });

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: quoteOrganizationsKeys.all });

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: quoteOrganizationsKeys.all },
        (old: OrganizationsResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map(org =>
              ids.includes(org.id)
                ? { ...org, ...updates, status_updated_at: new Date().toISOString() }
                : org
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: quoteOrganizationsKeys.all });
    },
  });
}
