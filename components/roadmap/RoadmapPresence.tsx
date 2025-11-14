'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Eye, MousePointer, Circle } from 'lucide-react';

interface PresenceUser {
  id: string;
  name: string;
  email: string;
  color: string;
  cursor?: { x: number; y: number };
  lastSeen: number;
  status: 'active' | 'idle' | 'away';
  currentView?: string;
}

interface RoadmapPresenceProps {
  roadmapId: string;
  currentView?: string;
  showCursors?: boolean;
  showAvatars?: boolean;
}

const PRESENCE_COLORS = [
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export default function RoadmapPresence({
  roadmapId,
  currentView = 'roadmap',
  showCursors = true,
  showAvatars = true
}: RoadmapPresenceProps) {
  const [presenceUsers, setPresenceUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [currentUser, setCurrentUser] = useState<PresenceUser | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<any>(null);
  const cursorTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializePresence();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [roadmapId]);

  const initializePresence = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const userColor = PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)];

    const newCurrentUser: PresenceUser = {
      id: user.id,
      name: userData?.full_name || 'Anonymous',
      email: userData?.email || user.email || '',
      color: userColor,
      lastSeen: Date.now(),
      status: 'active',
      currentView
    };

    setCurrentUser(newCurrentUser);

    // Create presence channel
    const channel = supabase.channel(`roadmap-presence-${roadmapId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track presence state
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = new Map<string, PresenceUser>();

        Object.entries(state).forEach(([userId, data]: [string, any]) => {
          if (Array.isArray(data) && data.length > 0) {
            const userData = data[0] as PresenceUser;
            if (userData.id !== user.id) {
              users.set(userId, userData);
            }
          }
        });

        setPresenceUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== user.id) {
          const userData = newPresences[0] as PresenceUser;
          setPresenceUsers(prev => new Map(prev).set(key, userData));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setPresenceUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
      });

    // Subscribe to channel
    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(newCurrentUser);
      }
    });

    channelRef.current = channel;

    // Track mouse movement for live cursors
    if (showCursors && containerRef.current) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!channelRef.current) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Throttle cursor updates
        if (cursorTimeoutRef.current) {
          clearTimeout(cursorTimeoutRef.current);
        }

        cursorTimeoutRef.current = setTimeout(() => {
          channelRef.current?.track({
            ...newCurrentUser,
            cursor: { x, y },
            lastSeen: Date.now()
          });
        }, 50);
      };

      document.addEventListener('mousemove', handleMouseMove);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }

    // Update status based on activity
    let idleTimeout: NodeJS.Timeout;
    let awayTimeout: NodeJS.Timeout;

    const resetTimers = () => {
      clearTimeout(idleTimeout);
      clearTimeout(awayTimeout);

      idleTimeout = setTimeout(() => {
        channelRef.current?.track({
          ...newCurrentUser,
          status: 'idle'
        });
      }, 60000); // 1 minute

      awayTimeout = setTimeout(() => {
        channelRef.current?.track({
          ...newCurrentUser,
          status: 'away'
        });
      }, 300000); // 5 minutes
    };

    const handleActivity = () => {
      if (newCurrentUser.status !== 'active') {
        channelRef.current?.track({
          ...newCurrentUser,
          status: 'active',
          lastSeen: Date.now()
        });
      }
      resetTimers();
    };

    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keydown', handleActivity);
    resetTimers();

    return () => {
      clearTimeout(idleTimeout);
      clearTimeout(awayTimeout);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keydown', handleActivity);
    };
  };

  const activeUsers = Array.from(presenceUsers.values()).filter(
    user => user.status === 'active'
  );

  const idleUsers = Array.from(presenceUsers.values()).filter(
    user => user.status === 'idle'
  );

  return (
    <>
      {/* Presence Avatars */}
      {showAvatars && (
        <div className="fixed top-24 right-6 z-40">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`bg-white rounded-xl shadow-lg border border-gray-200 ${
              isCollapsed ? 'w-auto' : 'w-64'
            } transition-all`}
          >
            {/* Header */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 rounded-t-xl transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  {activeUsers.length + (currentUser ? 1 : 0)} viewing
                </span>
              </div>
              {activeUsers.length > 0 && (
                <motion.div
                  animate={{ rotate: isCollapsed ? -90 : 0 }}
                  className="text-gray-400"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              )}
            </button>

            {/* User List */}
            <AnimatePresence>
              {!isCollapsed && (activeUsers.length > 0 || idleUsers.length > 0) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-100"
                >
                  <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                    {/* Current User */}
                    {currentUser && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: currentUser.color }}
                        >
                          {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {currentUser.name} (You)
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                            Active
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Active Users */}
                    {activeUsers.map(user => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                            Active · {user.currentView}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Idle Users */}
                    {idleUsers.map(user => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 p-2 rounded-lg opacity-60"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Circle className="w-2 h-2 fill-yellow-500 text-yellow-500" />
                            Idle
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Live Cursors */}
      {showCursors && (
        <div
          ref={containerRef}
          className="pointer-events-none fixed inset-0 z-50"
        >
          <AnimatePresence>
            {Array.from(presenceUsers.values()).map(user => {
              if (!user.cursor || user.status !== 'active') return null;

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute"
                  style={{
                    left: `${user.cursor.x}%`,
                    top: `${user.cursor.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MousePointer
                      className="w-5 h-5"
                      style={{ color: user.color }}
                      fill={user.color}
                    />
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}