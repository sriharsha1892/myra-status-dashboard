'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { useAuth } from './useAuth';

type TicketWatcher = Database['public']['Tables']['ticket_watchers']['Row'];

interface Watcher {
  id: string;
  user_id: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface UseWatchersReturn {
  watchers: Watcher[];
  isWatching: boolean;
  watch: () => Promise<void>;
  unwatch: () => Promise<void>;
  loading: boolean;
  watcherCount: number;
}

export function useWatchers(ticketId: string | undefined): UseWatchersReturn {
  const { user } = useAuth();
  const [watchers, setWatchers] = useState<Watcher[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!ticketId) {
      setWatchers([]);
      setIsWatching(false);
      setLoading(false);
      return;
    }

    fetchWatchers();

    // Set up real-time subscription for watcher changes
    const channel = supabase
      .channel(`ticket-watchers-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_watchers',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          fetchWatchers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, user]);

  const fetchWatchers = async () => {
    if (!ticketId) return;

    try {
      setLoading(true);

      // Fetch watchers with user details from auth.users
      const { data, error } = await supabase
        .from('ticket_watchers')
        .select('*')
        .eq('ticket_id', ticketId);

      if (error) throw error;

      // Fetch user emails from auth metadata
      const watchersWithDetails = await Promise.all(
        (data || []).map(async (watcher) => {
          try {
            // Try to get user from auth admin (if available)
            // For now, we'll use user_id as a placeholder
            return {
              ...watcher,
              user_email: watcher.user_id, // In production, fetch from auth.users
              user_name: watcher.user_id.split('-')[0], // Placeholder
            };
          } catch {
            return {
              ...watcher,
              user_email: watcher.user_id,
              user_name: 'User',
            };
          }
        })
      );

      setWatchers(watchersWithDetails);

      // Check if current user is watching
      if (user) {
        const watching = data?.some((w) => w.user_id === user.id) || false;
        setIsWatching(watching);
      }
    } catch (error) {
      console.error('Error fetching watchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const watch = async () => {
    if (!ticketId || !user) return;

    try {
      // Optimistic update
      setIsWatching(true);
      setWatchers((prev) => [
        ...prev,
        {
          id: 'temp',
          user_id: user.id,
          created_at: new Date().toISOString(),
          user_email: user.email,
          user_name: user.email?.split('@')[0] || 'You',
        },
      ]);

      const { error } = await supabase.from('ticket_watchers').insert({
        ticket_id: ticketId,
        user_id: user.id,
      });

      if (error) throw error;

      // Refresh to get the real data
      await fetchWatchers();
    } catch (error: any) {
      console.error('Error adding watcher:', error);
      // Revert optimistic update
      setIsWatching(false);
      setWatchers((prev) => prev.filter((w) => w.id !== 'temp'));
      throw error;
    }
  };

  const unwatch = async () => {
    if (!ticketId || !user) return;

    try {
      // Optimistic update
      const previousWatchers = [...watchers];
      setIsWatching(false);
      setWatchers((prev) => prev.filter((w) => w.user_id !== user.id));

      const { error } = await supabase
        .from('ticket_watchers')
        .delete()
        .eq('ticket_id', ticketId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh to get the real data
      await fetchWatchers();
    } catch (error: any) {
      console.error('Error removing watcher:', error);
      // Revert optimistic update
      setIsWatching(true);
      await fetchWatchers();
      throw error;
    }
  };

  return {
    watchers,
    isWatching,
    watch,
    unwatch,
    loading,
    watcherCount: watchers.length,
  };
}
