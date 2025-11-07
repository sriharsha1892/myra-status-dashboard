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
      {/* Bell Button - Compact and professional */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          unreadCount > 0
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg'
            : 'bg-white/80 hover:bg-white backdrop-blur-sm border border-slate-200 hover:border-slate-300'
        } group`}
      >
        <svg
          className={`w-4 h-4 transition-all duration-200 ${
            unreadCount > 0
              ? 'text-white'
              : 'text-slate-700 group-hover:text-slate-900'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-gradient-to-br from-red-500 to-red-600 rounded-full ring-2 ring-white shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel - Compact dropdown positioned near bell */}
      {showDropdown && (
        <>
          {/* Subtle backdrop for mobile only */}
          <div className="md:hidden fixed inset-0 bg-black/5 z-40" onClick={() => setShowDropdown(false)} />

          <div className="absolute right-0 mt-2 w-96 max-h-[600px] bg-white rounded-xl shadow-xl z-50 overflow-hidden flex flex-col animate-in slide-in-from-top-2 duration-200 border border-slate-200">
            {/* Header - Compact */}
            <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <p className="text-xs text-blue-100 font-medium">{unreadCount} new</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    title="Close"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowPreferences(true);
                    }}
                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-all"
                    title="Settings"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="px-3 py-1.5 text-xs text-blue-600 bg-white hover:bg-blue-50 font-semibold rounded-lg transition-all"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications List - Compact */}
            <div className="overflow-y-auto max-h-[400px]">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm text-slate-700 font-semibold">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-slate-900 mb-1">All Clear!</p>
                  <p className="text-sm text-slate-600">You have no notifications at this time</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {notifications.map((notification) => (
                    <button
                      key={notification.notification_id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full px-4 py-3 text-left transition-all duration-200 ${
                        !notification.read
                          ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-600'
                          : 'bg-white hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon indicator */}
                        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                          !notification.read
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                            : 'bg-gradient-to-br from-slate-300 to-slate-400'
                        }`}>
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Organization name badge */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                              {notification.org_activity_notes.trial_organizations.org_name}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              notification.notification_type === 'mention'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : notification.notification_type === 'issue'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-green-100 text-green-700 border border-green-200'
                            }`}>
                              {notification.notification_type === 'mention' ? '@ Mention' :
                               notification.notification_type === 'issue' ? 'Issue' : 'New Note'}
                            </span>
                          </div>

                          {/* Main notification text - FULLY VISIBLE */}
                          <p className={`text-base leading-relaxed ${
                            !notification.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                          }`}>
                            {getNotificationText(notification)}
                          </p>

                          {/* Note content - NO TRUNCATION */}
                          <div className={`text-sm leading-relaxed p-4 rounded-lg border ${
                            !notification.read
                              ? 'bg-white border-blue-200 text-slate-800'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            <p className="whitespace-pre-wrap break-words">
                              {notification.org_activity_notes.note_text}
                            </p>
                          </div>

                          {/* Metadata row */}
                          <div className="flex items-center gap-4 pt-1">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-xs font-medium">{notification.org_activity_notes.logged_by}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs font-medium">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="flex-shrink-0 pt-1">
                            <div className="w-3 h-3 bg-blue-600 rounded-full ring-4 ring-blue-200 animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Enhanced footer */}
            {notifications.length > 0 && (
              <div className="px-4 md:px-6 lg:px-8 py-3 md:py-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                <p className="text-xs md:text-sm text-center text-slate-700 font-medium">
                  {notifications.length === 1 ? '1 notification' : `${notifications.length} notifications`} total
                </p>
              </div>
            )}
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
