import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';

interface PresenceUser {
  id: string;
  name: string;
  email?: string;
  currentTab?: string;
  lastSeen: string;
}

interface UseRealtimePresenceOptions {
  channelName: string;
  user: {
    id: string;
    name: string;
    email?: string;
  };
  currentTab?: string;
}

interface UseRealtimePresenceReturn {
  presentUsers: PresenceUser[];
  isConnected: boolean;
  updatePresence: (data: Partial<PresenceUser>) => void;
}

export function useRealtimePresence({
  channelName,
  user,
  currentTab,
}: UseRealtimePresenceOptions): UseRealtimePresenceReturn {
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceUser>();
        const users = parsePresenceState(state);
        setPresentUsers(users.filter((u) => u.id !== user.id));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // User joined - state will be synced
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // User left - state will be synced
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await presenceChannel.track({
            id: user.id,
            name: user.name,
            email: user.email,
            currentTab,
            lastSeen: new Date().toISOString(),
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [channelName, user.id, user.name, user.email, currentTab]);

  // Update presence when tab changes
  useEffect(() => {
    if (channel && isConnected) {
      channel.track({
        id: user.id,
        name: user.name,
        email: user.email,
        currentTab,
        lastSeen: new Date().toISOString(),
      });
    }
  }, [channel, isConnected, user.id, user.name, user.email, currentTab]);

  const updatePresence = useCallback(
    (data: Partial<PresenceUser>) => {
      if (channel && isConnected) {
        channel.track({
          id: user.id,
          name: user.name,
          email: user.email,
          currentTab,
          lastSeen: new Date().toISOString(),
          ...data,
        });
      }
    },
    [channel, isConnected, user.id, user.name, user.email, currentTab]
  );

  return {
    presentUsers,
    isConnected,
    updatePresence,
  };
}

function parsePresenceState(
  state: RealtimePresenceState<PresenceUser>
): PresenceUser[] {
  const users: PresenceUser[] = [];

  Object.values(state).forEach((presences) => {
    presences.forEach((presence) => {
      if (presence.id && presence.name) {
        users.push({
          id: presence.id,
          name: presence.name,
          email: presence.email,
          currentTab: presence.currentTab,
          lastSeen: presence.lastSeen || new Date().toISOString(),
        });
      }
    });
  });

  return users;
}

// Simple presence indicator component
export function PresenceIndicator({
  users,
}: {
  users: PresenceUser[];
}) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 rounded-lg">
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => (
          <div
            key={user.id}
            className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-xs text-white font-medium border-2 border-white"
            title={`${user.name}${user.currentTab ? ` - ${user.currentTab}` : ''}`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {users.length > 3 && (
          <div className="w-6 h-6 rounded-full bg-neutral-300 flex items-center justify-center text-xs text-neutral-600 font-medium border-2 border-white">
            +{users.length - 3}
          </div>
        )}
      </div>
      <span className="text-xs text-neutral-600">
        {users.length} other{users.length !== 1 ? 's' : ''} viewing
      </span>
    </div>
  );
}
