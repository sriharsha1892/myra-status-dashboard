'use client';

import { useState, useEffect } from 'react';
import {
  Bell, BellOff, Star, Clock, Archive, Check, X, ExternalLink,
  MessageSquare, UserPlus, GitBranch, AlertCircle, Link as LinkIcon
} from 'lucide-react';
import RelativeTime from './ui/RelativeTime';
import { toast } from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/api-client';

interface Notification {
  id: string;
  user_id: string;
  entity_type: 'note' | 'ticket' | 'roadmap_item' | 'meeting' | 'trial_org';
  entity_id: string;
  entity_title: string | null;
  notification_type: 'mention' | 'assigned' | 'comment' | 'status_change' | 'issue_linked' | 'watching_update';
  actor_id: string | null;
  title: string;
  message: string | null;
  action_url: string;
  priority_score: number;
  category: 'priority' | 'recent' | 'archived';
  thread_key: string;
  status: 'unread' | 'read' | 'archived';
  read_at: string | null;
  archived_at: string | null;
  archived_reason: string | null;
  created_at: string;
}

interface ActivitySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivitySidebar({ isOpen, onClose }: ActivitySidebarProps) {
  const [activeTab, setActiveTab] = useState<'priority' | 'recent' | 'archived'>('priority');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, activeTab]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(`/api/unified-notifications?category=${activeTab}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data.notifications || []);

      // Count unread
      const unread = data.notifications.filter((n: Notification) => n.status === 'unread').length;
      setUnreadCount(unread);

    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await authenticatedFetch(`/api/unified-notifications/${notificationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'read' })
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'read' as const } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const archiveNotification = async (notificationId: string, reason?: string) => {
    try {
      const response = await authenticatedFetch(`/api/unified-notifications/${notificationId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'archived',
          archived_reason: reason
        })
      });

      if (!response.ok) throw new Error('Failed to archive');

      // Remove from current view
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification archived');

    } catch (error) {
      console.error('Error archiving:', error);
      toast.error('Failed to archive');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await authenticatedFetch(`/api/unified-notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete');

      // Remove from list
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');

    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    }
  };

  const getNotificationIcon = (type: Notification['notification_type']) => {
    const icons = {
      mention: MessageSquare,
      assigned: UserPlus,
      comment: MessageSquare,
      status_change: GitBranch,
      issue_linked: LinkIcon,
      watching_update: Bell
    };
    const Icon = icons[type];
    return <Icon className="w-4 h-4" />;
  };

  const getNotificationColor = (type: Notification['notification_type']) => {
    const colors = {
      mention: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
      assigned: 'text-green-600 bg-green-50 dark:bg-green-900/20',
      comment: 'text-accent-600 bg-accent-50 dark:bg-purple-900/20',
      status_change: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
      issue_linked: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20',
      watching_update: 'text-neutral-600 bg-neutral-50 dark:bg-slate-900/20'
    };
    return colors[type];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-700 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-neutral-700 dark:text-slate-300" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Activity
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('priority')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'priority'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-200 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Star className="w-4 h-4" />
              <span>Priority</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'recent'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-200 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Recent</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('archived')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'archived'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-200 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Archive className="w-4 h-4" />
              <span>Archived</span>
            </div>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-neutral-500">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <BellOff className="w-12 h-12 text-slate-300 dark:text-neutral-700 mx-auto mb-3" />
            <p className="text-sm text-neutral-500">
              {activeTab === 'priority' && 'No priority notifications'}
              {activeTab === 'recent' && 'No recent notifications'}
              {activeTab === 'archived' && 'No archived notifications'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors ${
                  notification.status === 'unread' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
              >
                {/* Notification Header */}
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${getNotificationColor(notification.notification_type)}`}>
                    {getNotificationIcon(notification.notification_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
                      {notification.title}
                    </h4>

                    {notification.message && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                    )}

                    {notification.entity_title && (
                      <div className="text-xs text-neutral-500 mb-2">
                        in {notification.entity_title}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <RelativeTime date={notification.created_at} />
                      {notification.priority_score >= 65 && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <Star className="w-3 h-3 fill-current" />
                          High Priority
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <a
                        href={notification.action_url}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </a>

                      {notification.status === 'unread' && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs px-2 py-1 bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Mark Read
                        </button>
                      )}

                      {activeTab !== 'archived' && (
                        <button
                          onClick={() => archiveNotification(notification.id)}
                          className="text-xs px-2 py-1 bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center gap-1"
                        >
                          <Archive className="w-3 h-3" />
                          Archive
                        </button>
                      )}

                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
