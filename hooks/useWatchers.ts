/**
 * useWatchers Hook
 * Manages ticket watchers and watch status
 */

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useWatchers(ticketId: string) {
  const [isWatching, setIsWatching] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Lazy initialize Supabase client
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  };

  // Fetch initial watch status
  useEffect(() => {
    if (!user || !ticketId) {
      setLoading(false);
      return;
    }

    fetchWatchStatus();
  }, [ticketId, user]);

  const fetchWatchStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const supabase = getSupabase();

      // Check if current user is watching
      const { data: watchData } = await supabase
        .from('ticket_watchers')
        .select('id')
        .eq('ticket_id', ticketId)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsWatching(!!watchData);

      // Get total watcher count
      const { count } = await supabase
        .from('ticket_watchers')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_id', ticketId);

      setWatcherCount(count || 0);
    } catch (error) {
      console.error('Error fetching watch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const watch = async () => {
    if (!user) throw new Error('User not authenticated');
    const supabase = getSupabase();

    const { error } = await supabase
      .from('ticket_watchers')
      .insert({
        ticket_id: ticketId,
        user_id: user.id
      });

    if (error) throw error;

    setIsWatching(true);
    setWatcherCount(prev => prev + 1);
  };

  const unwatch = async () => {
    if (!user) throw new Error('User not authenticated');
    const supabase = getSupabase();

    const { error } = await supabase
      .from('ticket_watchers')
      .delete()
      .eq('ticket_id', ticketId)
      .eq('user_id', user.id);

    if (error) throw error;

    setIsWatching(false);
    setWatcherCount(prev => Math.max(0, prev - 1));
  };

  return {
    isWatching,
    watch,
    unwatch,
    watcherCount,
    loading
  };
}
