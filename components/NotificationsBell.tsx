'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import NotificationPreferencesModal from './NotificationPreferencesModal';

interface Notification {
  notification_id: string;
  user_email: string;
  note_id: string;
  notification_type: string;
  read: boolean;
  created_at: string;
  org_activity_notes: {
    note_id: string;
    org_id: string;
    note_category: string;
    note_text: string;
    logged_by: string;
    created_at: string;
    trial_organizations: {
      org_id: string;
      org_name: string;
    };
  };
}

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
    fetchUserEmail();

    // Poll for new notifications every 60 seconds (reduced from 30s for better performance)
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
    }
  };

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();

      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds }),
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          notificationIds.includes(n.notification_id) ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - notificationIds.length));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead([notification.notification_id]);
    }

    // Navigate to the org detail page with activity log tab
    const orgId = notification.org_activity_notes.trial_organizations.org_id;
    router.push(`/support/trials/${orgId}?tab=activitylog`);
    setShowDropdown(false);
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.notification_id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  const getNotificationIcon = (type: string) => {
    // Return empty string - no icons
    return '';
  };

  const getNotificationText = (notification: Notification) => {
    const note = notification.org_activity_notes;
    const orgName = note.trial_organizations.org_name;

    switch (notification.notification_type) {
      case 'mention':
        return `${note.logged_by} mentioned you in a note about ${orgName}`;
      case 'issue':
        return `New issue reported for ${orgName}`;
      case 'new_note':
        return `${note.logged_by} added a note to ${orgName}`;
      default:
        return `New activity for ${orgName}`;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button - Sidebar style */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative flex items-center gap-3 h-10 px-3 text-sm font-medium rounded-lg transition-all duration-150 w-full cursor-pointer ${
          unreadCount > 0
            ? 'text-slate-900 bg-blue-50 hover:bg-blue-100'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <svg
          className={`w-5 h-5 shrink-0 ${unreadCount > 0 ? 'text-blue-600' : 'text-slate-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span className="ml-auto flex items-center justify-center min-w-[20px] h-[20px] text-[10px] font-bold text-white bg-blue-600 rounded-full shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out Panel - Fixed position from right side */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-[45]" onClick={() => setShowDropdown(false)} />

          <div className="fixed right-0 top-0 bottom-0 w-[320px] bg-white shadow-2xl z-50 overflow-hidden flex flex-col border-l border-slate-200">
            {/* Minimal Top Border - No Header */}
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

            {/* Compact Action Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-700">
                {unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}
              </span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 font-semibold rounded transition-all"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    setShowPreferences(true);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-all"
                  title="Settings"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notifications List - Full height scrollable */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-[11px] text-slate-500">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[11px] text-slate-500">No new notifications</p>
                  <p className="text-[10px] text-slate-400 mt-1">Maximum productivity mode activated</p>
                </div>
              ) : (
                <div className="py-1">
                  {notifications.map((notification) => (
                    <button
                      key={notification.notification_id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left px-3 py-2 border-b border-slate-50 transition-all ${
                        notification.read
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-blue-50/50 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!notification.read && (
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-900 font-medium leading-tight mb-1">
                            {notification.org_activity_notes.trial_organizations.org_name}
                          </p>
                          <p className="text-[10px] text-slate-600 leading-tight line-clamp-2">
                            {getNotificationText(notification)}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        userEmail={userEmail}
      />
    </div>
  );
}
