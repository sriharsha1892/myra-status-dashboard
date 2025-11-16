'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import NotificationPreferencesModal from './NotificationPreferencesModal';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationsBell() {
  // Use real-time notifications hook
  const { notifications: allNotifications, unreadCount, markAsRead, loading } = useNotifications();

  // Filter for note-related notifications only (backward compatibility)
  const notifications = allNotifications.filter(n => n.entity_type === 'note');

  const [showDropdown, setShowDropdown] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Draggable widget state
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('notificationWidgetPosition');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    }
  }, []);

  useEffect(() => {
    fetchUserEmail();
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

  // Dragging handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // Keep within viewport bounds
        const maxX = window.innerWidth - (widgetRef.current?.offsetWidth || 300);
        const maxY = window.innerHeight - (widgetRef.current?.offsetHeight || 60);

        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));

        setPosition({ x: boundedX, y: boundedY });
      }
    },
    [isDragging, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('notificationWidgetPosition', JSON.stringify(position));
    }
  }, [isDragging, position]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate using action_url from notification
    if (notification.action_url) {
      router.push(notification.action_url);
    }
    setShowDropdown(false);
  };

  const handleMarkAllAsRead = () => {
    // Mark all note notifications as read
    notifications.forEach((n) => {
      if (!n.is_read) {
        markAsRead(n.id);
      }
    });
  };

  const getNotificationIcon = (type: string) => {
    // Return empty string - no icons
    return '';
  };

  return (
    <>
      {/* Floating Draggable Widget */}
      <div
        ref={widgetRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 1000,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        className="select-none"
      >
        <div ref={dropdownRef} className="relative">
          {/* Compact Floating Button */}
          <button
            onMouseDown={handleMouseDown}
            onClick={(e) => {
              if (!isDragging) {
                setShowDropdown(!showDropdown);
              }
              e.stopPropagation();
            }}
            className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 ${
              unreadCount > 0
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-white hover:bg-neutral-50 border-2 border-neutral-200'
            }`}
            title="Drag to move • Click to open"
          >
            <svg
              className={`w-6 h-6 ${unreadCount > 0 ? 'text-white' : 'text-neutral-600'}`}
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
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[22px] h-[22px] text-[11px] font-bold text-white bg-red-500 rounded-full shadow-md border-2 border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Panel - Positioned relative to widget */}
          {showDropdown && (
            <div
              className="absolute top-16 right-0 w-[340px] bg-white rounded-lg shadow-2xl border border-neutral-200 overflow-hidden"
              style={{ maxHeight: 'calc(100vh - 100px)' }}
            >
              {/* Minimal Top Border - No Header */}
              <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

              {/* Compact Action Bar */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-neutral-700">
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
                    className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded transition-all"
                    title="Settings"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Notifications List - Scrollable */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-[11px] text-neutral-500">Loading...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[11px] text-neutral-500">No new notifications</p>
                    <p className="text-[10px] text-neutral-400 mt-1">Maximum productivity mode activated</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`relative group border-b border-slate-50 transition-all ${
                          notification.is_read
                            ? 'bg-white hover:bg-neutral-50'
                            : 'bg-blue-50/50 hover:bg-blue-50'
                        }`}
                      >
                        <button
                          onClick={() => handleNotificationClick(notification)}
                          className="w-full text-left px-3 py-2 pr-8"
                        >
                          <div className="flex items-start gap-2">
                            {!notification.is_read && (
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-neutral-900 font-medium leading-tight mb-1">
                                {notification.entity_title || 'Notification'}
                              </p>
                              <p className="text-[10px] text-neutral-600 leading-tight line-clamp-2">
                                {notification.title}
                              </p>
                              {notification.message && (
                                <p className="text-[9px] text-neutral-500 leading-tight line-clamp-1 mt-0.5">
                                  {notification.message}
                                </p>
                              )}
                              <p className="text-[9px] text-neutral-400 mt-1">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Dismiss Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 rounded opacity-0 group-hover:opacity-100 transition-all"
                          title="Dismiss"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        userEmail={userEmail}
      />
    </>
  );
}
