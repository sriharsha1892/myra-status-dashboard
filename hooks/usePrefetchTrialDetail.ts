'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to prefetch trial organization detail data on hover
 * This makes navigation to detail pages feel instant
 */
export function usePrefetchTrialDetail() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const prefetchedIds = useRef(new Set<string>());

  const prefetch = useCallback(async (orgId: string) => {
    // Skip if already prefetched this session
    if (prefetchedIds.current.has(orgId)) return;
    prefetchedIds.current.add(orgId);

    // Prefetch organization details
    queryClient.prefetchQuery({
      queryKey: ['trial-organization', orgId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('trial_organizations')
          .select('*')
          .eq('org_id', orgId)
          .single();
        if (error) throw error;
        return data;
      },
      staleTime: 60_000, // 1 minute
    });

    // Prefetch users for this org
    queryClient.prefetchQuery({
      queryKey: ['trial-users', orgId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('trial_users')
          .select('*')
          .eq('org_id', orgId);
        if (error) throw error;
        return data;
      },
      staleTime: 60_000,
    });

    // Prefetch activity timeline
    queryClient.prefetchQuery({
      queryKey: ['trial-timeline', orgId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('timeline_events')
          .select('*')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        return data;
      },
      staleTime: 60_000,
    });
  }, [queryClient, supabase]);

  return prefetch;
}
