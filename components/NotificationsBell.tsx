/**
 * NotificationsBell Component
 * Displays notification bell with unread count
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationsBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setUnreadCount(count || 0);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {unreadCount === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No new notifications
              </div>
            ) : (
              <div className="p-2 text-sm text-slate-600">
                You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
