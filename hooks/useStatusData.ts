import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';

export interface ProviderInfo {
  id: string;
  displayName: string;
  category: string;
  icon?: string;
}

export interface ProviderStatus {
  provider: ProviderInfo;
  status: string;
  lastChecked: string;
  responseTime?: number;
  message?: string;
}

export interface StatusResponse {
  providers: ProviderStatus[];
  lastUpdated: string;
  isStale?: boolean;
  isColdStart?: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'critical';
  active: boolean;
  created_at: string;
}

// Query keys
export const statusKeys = {
  all: ['status'] as const,
  current: () => [...statusKeys.all, 'current'] as const,
  announcements: () => [...statusKeys.all, 'announcements'] as const,
};

// Fetch current status
async function fetchCurrentStatus(): Promise<StatusResponse> {
  const timestamp = Date.now();
  const response = await fetch(`/api/status/current?_t=${timestamp}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch status');
  }

  return response.json();
}

// Fetch announcements
async function fetchAnnouncements(): Promise<Announcement[]> {
  const timestamp = Date.now();
  const response = await fetch(`/api/announcements?_t=${timestamp}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });

  const data = await response.json();
  if (data.success && data.announcements) {
    return data.announcements;
  }
  return [];
}

/**
 * Hook to fetch current status data with polling
 */
export function useStatusData(options?: { refetchInterval?: number; enabled?: boolean }) {
  const queryClient = useQueryClient();
  const previousProviders = useRef<ProviderStatus[]>([]);

  const query = useQuery({
    queryKey: statusKeys.current(),
    queryFn: fetchCurrentStatus,
    staleTime: 10_000, // 10 seconds
    refetchInterval: options?.refetchInterval ?? 60_000, // Default 60 seconds
    enabled: options?.enabled ?? true,
  });

  // Track provider changes for notifications
  const changedProviders = useCallback(() => {
    if (!query.data?.providers || previousProviders.current.length === 0) {
      return [];
    }

    const changes: Array<{ provider: ProviderStatus; oldStatus: string }> = [];

    query.data.providers.forEach((newProvider) => {
      const oldProvider = previousProviders.current.find(
        (p) => p.provider.id === newProvider.provider.id
      );
      if (oldProvider && oldProvider.status !== newProvider.status) {
        changes.push({ provider: newProvider, oldStatus: oldProvider.status });
      }
    });

    return changes;
  }, [query.data?.providers]);

  // Update previous providers after successful fetch
  useEffect(() => {
    if (query.data?.providers) {
      previousProviders.current = query.data.providers;
    }
  }, [query.data?.providers]);

  // Auto-refetch if data is stale or cold start
  useEffect(() => {
    if (!query.data) return;

    const needsRefresh =
      query.data.isStale ||
      query.data.isColdStart ||
      query.data.providers.some((p) => p.status === 'unknown');

    if (needsRefresh) {
      const fastRetry = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: statusKeys.current() });
      }, 1500);
      return () => clearTimeout(fastRetry);
    }
  }, [query.data, queryClient]);

  return {
    ...query,
    changedProviders,
  };
}

/**
 * Hook to fetch announcements with polling
 */
export function useAnnouncements(options?: { refetchInterval?: number; enabled?: boolean }) {
  return useQuery({
    queryKey: statusKeys.announcements(),
    queryFn: fetchAnnouncements,
    staleTime: 30_000, // 30 seconds
    refetchInterval: options?.refetchInterval ?? 120_000, // Default 2 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to manually refresh status data
 */
export function useRefreshStatus() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: statusKeys.current() });
  }, [queryClient]);
}
