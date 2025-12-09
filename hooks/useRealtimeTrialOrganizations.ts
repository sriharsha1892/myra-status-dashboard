'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { trialOrganizationsKeys } from './useTrialOrganizations';

/**
 * Hook to subscribe to real-time updates for trial organizations
 * Automatically invalidates React Query cache when data changes
 */
export function useRealtimeTrialOrganizations(enabled: boolean = true) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('trial_organizations_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'trial_organizations',
        },
        (payload) => {
          console.log('Realtime update received:', payload.eventType);

          // Invalidate queries to refetch data
          queryClient.invalidateQueries({
            queryKey: trialOrganizationsKeys.all,
          });

          // For more granular updates, you could update the cache directly:
          // if (payload.eventType === 'UPDATE') {
          //   queryClient.setQueriesData(...)
          // }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, supabase]);
}

/**
 * Hook to subscribe to real-time updates for trial users
 * Useful for tracking user activity changes
 */
export function useRealtimeTrialUsers(enabled: boolean = true) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('trial_users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trial_users',
        },
        (payload) => {
          console.log('Trial user update received:', payload.eventType);

          // Invalidate organization queries since user counts may have changed
          queryClient.invalidateQueries({
            queryKey: trialOrganizationsKeys.all,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, supabase]);
}
