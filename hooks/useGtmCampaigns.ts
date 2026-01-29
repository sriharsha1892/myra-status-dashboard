import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Campaign, CampaignsResponse } from '@/app/api/gtm/campaigns/route';

export type { Campaign, CampaignsResponse };

/**
 * Fetch campaigns
 */
async function fetchCampaigns(type?: string): Promise<CampaignsResponse> {
  const url = type
    ? `/api/gtm/campaigns?type=${type}`
    : '/api/gtm/campaigns';

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch campaigns');
  }

  return response.json();
}

/**
 * Create a campaign
 */
async function createCampaign(data: {
  name: string;
  description?: string;
  campaignType: 'hubspot' | 'apollo' | 'inbound' | 'other';
  totalOutreach?: number;
  totalResponses?: number;
  totalLeads?: number;
  qualifiedLeads?: number;
  ongoingCases?: number;
  status?: 'draft' | 'active' | 'paused' | 'completed';
  startDate?: string;
  endDate?: string;
  externalId?: string;
  externalUrl?: string;
}): Promise<{ success: boolean; campaign: Campaign }> {
  const response = await fetch('/api/gtm/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create campaign');
  }

  return response.json();
}

/**
 * Update campaign
 */
async function updateCampaign(data: {
  campaignId: string;
  updates?: Partial<Omit<Campaign, 'id' | 'createdAt'>>;
  linkOrgs?: string[];
  unlinkOrgs?: string[];
}): Promise<{ success: boolean }> {
  const response = await fetch('/api/gtm/campaigns', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update campaign');
  }

  return response.json();
}

/**
 * Delete campaign
 */
async function deleteCampaign(campaignId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/gtm/campaigns?id=${campaignId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete campaign');
  }

  return response.json();
}

/**
 * Hook for fetching all campaigns
 */
export function useGtmCampaigns(type?: 'hubspot' | 'apollo' | 'inbound' | 'other') {
  return useQuery({
    queryKey: ['gtm-campaigns', type],
    queryFn: () => fetchCampaigns(type),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching outbound campaigns (HubSpot + Apollo)
 */
export function useOutboundCampaigns() {
  const hubspot = useQuery({
    queryKey: ['gtm-campaigns', 'hubspot'],
    queryFn: () => fetchCampaigns('hubspot'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const apollo = useQuery({
    queryKey: ['gtm-campaigns', 'apollo'],
    queryFn: () => fetchCampaigns('apollo'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    hubspot: hubspot.data?.campaigns || [],
    apollo: apollo.data?.campaigns || [],
    isLoading: hubspot.isLoading || apollo.isLoading,
    error: hubspot.error || apollo.error,
    refetch: () => {
      hubspot.refetch();
      apollo.refetch();
    },
  };
}

/**
 * Hook for fetching inbound campaigns
 */
export function useInboundCampaigns() {
  return useQuery({
    queryKey: ['gtm-campaigns', 'inbound'],
    queryFn: () => fetchCampaigns('inbound'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for creating a campaign
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gtm-campaigns'] });
    },
  });
}

/**
 * Hook for updating a campaign
 */
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gtm-campaigns'] });
    },
  });
}

/**
 * Hook for deleting a campaign
 */
export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gtm-campaigns'] });
    },
  });
}

/**
 * Hook for linking/unlinking orgs to campaigns
 */
export function useLinkOrgsToCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { campaignId: string; linkOrgs?: string[]; unlinkOrgs?: string[] }) =>
      updateCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gtm-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['gtm-dashboard'] });
    },
  });
}
