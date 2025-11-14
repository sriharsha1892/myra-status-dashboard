'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Bell,
  Archive,
  Trash2,
  Check,
  ExternalLink,
  MessageCircle,
  UserPlus,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Settings
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import NotificationPreferencesModal from '@/components/NotificationPreferencesModal';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  notification_type: string;
  priority_score: number;
  category: 'priority' | 'recent' | 'archived';
  status: 'unread' | 'read' | 'archived';
  action_url: string;
  created_at: string;
  entity_type: string;
  entity_title: string | null;
}

// Notification type configuration with icons and colors
const NOTIFICATION_TYPES: Record<string, {
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}> = {
  mention: {
    icon: MessageCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    glowColor: 'shadow-blue-500/20'
  },
  assignment: {
    icon: UserPlus,
    color: 'text-accent-600',
    bgColor: 'bg-accent-500/10',
    borderColor: 'border-purple-500/20',
    glowColor: 'shadow-purple-500/20'
  },
  comment: {
    icon: MessageCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    glowColor: 'shadow-green-500/20'
  },
  update: {
    icon: Bell,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    glowColor: 'shadow-indigo-500/20'
  },
  document: {
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    glowColor: 'shadow-orange-500/20'
  },
  alert: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    glowColor: 'shadow-red-500/20'
  },
  success: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    glowColor: 'shadow-emerald-500/20'
  },
  reminder: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    glowColor: 'shadow-amber-500/20'
  },
  feature_proposal: {
    icon: Sparkles,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    glowColor: 'shadow-indigo-500/20'
  },
  default: {
    icon: Bell,
    color: 'text-neutral-600',
    bgColor: 'bg-neutral-500/10',
    borderColor: 'border-slate-500/20',
    glowColor: 'shadow-slate-500/20'
  }
};

// Helper function to group notifications by date
function groupNotificationsByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: []
  };

  notifications.forEach(notification => {
    const date = parseISO(notification.created_at);
    if (isToday(date)) {
      groups.Today.push(notification);
    } else if (isYesterday(date)) {
      groups.Yesterday.push(notification);
    } else if (isThisWeek(date)) {
      groups['This Week'].push(notification);
    } else {
      groups.Earlier.push(notification);
    }
  });

  // Filter out empty groups
  return Object.entries(groups).filter(([_, notifs]) => notifs.length > 0);
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'priority' | 'recent' | 'archived'>('priority');
  const [loading, setLoading] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showPreferences, setShowPreferences] = useState(false);
  const supabase = createClient();

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, activeTab]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('category', activeTab)
        .order('priority_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('category', activeTab)
        .eq('status', 'unread');

      if (error) throw error;
      toast.success('All notifications marked as read');
      loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          status: 'archived',
          category: 'archived',
          archived_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
      toast.success('Notification archived');
      loadNotifications();
    } catch (error) {
      console.error('Error archiving notification:', error);
      toast.error('Failed to archive notification');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      toast.success('Notification deleted');
      loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;
  const groupedNotifications = groupNotificationsByDate(notifications);

  // Get notification type config
  const getNotificationConfig = (type: string) => {
    const normalizedType = type.toLowerCase().replace('_', '');
    return NOTIFICATION_TYPES[normalizedType] || NOTIFICATION_TYPES.default;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Glassmorphism */}
        <div className="mb-8">
          <div className="relative">
            {/* Gradient accent line */}
            <div className="absolute -top-4 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full opacity-60 blur-sm"></div>

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative">
                    <Bell className="w-8 h-8 text-neutral-700" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-white/95 backdrop-blur-xl border-2 border-accent-500/30 rounded-full flex items-center justify-center shadow-lg shadow-accent-500/20 animate-pulse">
                        <span className="text-[10px] font-bold text-accent-600">{unreadCount}</span>
                      </div>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-neutral-900">Notifications</h1>
                </div>
                <p className="text-sm text-neutral-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Stay in sync with your team's activity
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPreferences(true)}
                  className="group relative flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-accent-700 bg-white/95 backdrop-blur-xl border-2 border-accent-200 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-accent-500/20 hover:scale-105 hover:border-accent-300 hover:bg-accent-50/50"
                >
                  <Settings className="w-4 h-4" />
                  <span>Preferences</span>
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-500 rounded-full animate-pulse"></span>
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="group relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-accent-500 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-accent-500/30 hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Check className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Mark all read</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Tab Pills */}
        <div className="mb-8">
          <div className="relative inline-flex p-1 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('priority')}
                className={`relative px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === 'priority'
                    ? 'text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {activeTab === 'priority' && (
                  <div className="absolute inset-0 bg-accent-500 rounded-xl shadow-lg"></div>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Priority
                </span>
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`relative px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === 'recent'
                    ? 'text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {activeTab === 'recent' && (
                  <div className="absolute inset-0 bg-accent-500 rounded-xl shadow-lg"></div>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent
                </span>
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`relative px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === 'archived'
                    ? 'text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {activeTab === 'archived' && (
                  <div className="absolute inset-0 bg-accent-500 rounded-xl shadow-lg"></div>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Archived
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-0 border-4 border-t-blue-600 border-r-purple-600 border-b-pink-600 border-l-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-neutral-500 font-medium">Loading your notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>

            {/* Glass card */}
            <div className="relative backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl p-20 text-center shadow-xl">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-20 blur-2xl"></div>
                <Bell className="relative w-20 h-20 text-slate-300" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">All caught up!</h3>
              <p className="text-neutral-500 mb-1">No {activeTab} notifications</p>
              <p className="text-sm text-neutral-400">
                {activeTab === 'priority' && "High priority items will appear here when they need your attention"}
                {activeTab === 'recent' && "Recent updates from your team will show up here"}
                {activeTab === 'archived' && "Your archived notifications will be stored here"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedNotifications.map(([groupName, groupNotifications]) => (
              <div key={groupName} className="space-y-3">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="group flex items-center gap-3 w-full text-left px-2 py-1 rounded-lg hover:bg-white/50 transition-colors"
                >
                  {collapsedGroups.has(groupName) ? (
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                  )}
                  <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">{groupName}</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                  <span className="text-xs font-medium text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {groupNotifications.length}
                  </span>
                </button>

                {/* Group Content */}
                {!collapsedGroups.has(groupName) && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    {groupNotifications.map((notification) => {
                      const config = getNotificationConfig(notification.notification_type);
                      const Icon = config.icon;
                      const isUnread = notification.status === 'unread';
                      const isHighPriority = notification.priority_score >= 65;

                      return (
                        <div
                          key={notification.id}
                          className="group/card relative"
                        >
                          {/* Glassmorphism Card */}
                          <div className="relative overflow-hidden rounded-2xl">
                            {/* Animated gradient border for unread */}
                            {isUnread && (
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/40 via-purple-400/40 to-pink-400/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 blur-sm"></div>
                            )}

                            {/* Main glass card */}
                            <div className={`relative backdrop-blur-xl border rounded-2xl p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 ${
                              isUnread
                                ? 'bg-gradient-to-br from-blue-50/90 to-purple-50/70 border-blue-200/50 shadow-lg shadow-blue-500/10'
                                : 'bg-white/80 border-white/20 shadow-md'
                            }`}>
                              {/* Gradient overlay on hover */}
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                              <div className="relative z-10 flex items-start gap-4">
                                {/* Icon */}
                                <div className={`shrink-0 w-10 h-10 rounded-xl ${config.bgColor} ${config.borderColor} border flex items-center justify-center ${config.glowColor} shadow-lg transition-transform duration-300 group-hover/card:scale-110`}>
                                  <Icon className={`w-5 h-5 ${config.color}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <h3 className="font-semibold text-neutral-900 leading-tight">
                                      {notification.title}
                                    </h3>
                                    {isHighPriority && (
                                      <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 shadow-lg shadow-orange-500/20">
                                        <Star className="w-3 h-3 text-orange-600 fill-orange-600" />
                                        <span className="text-xs font-semibold text-orange-700">Priority</span>
                                      </div>
                                    )}
                                  </div>

                                  {notification.message && (
                                    <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                                      {notification.message}
                                    </p>
                                  )}

                                  {/* Metadata */}
                                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-100/80 backdrop-blur-sm font-medium">
                                      <Clock className="w-3 h-3" />
                                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </span>
                                    {notification.entity_title && (
                                      <span className="px-2 py-1 rounded-md bg-neutral-100/80 backdrop-blur-sm truncate max-w-[200px]">
                                        {notification.entity_title}
                                      </span>
                                    )}
                                    {isUnread && (
                                      <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100/80 text-blue-700 font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                                        New
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions - Show on hover */}
                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                                  <a
                                    href={notification.action_url}
                                    onClick={() => markAsRead(notification.id)}
                                    className="p-2.5 rounded-xl backdrop-blur-sm bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 transition-all hover:scale-110"
                                    title="View"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                  {isUnread && (
                                    <button
                                      onClick={() => markAsRead(notification.id)}
                                      className="p-2.5 rounded-xl backdrop-blur-sm bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 transition-all hover:scale-110"
                                      title="Mark as read"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                  )}
                                  {activeTab !== 'archived' && (
                                    <button
                                      onClick={() => archiveNotification(notification.id)}
                                      className="p-2.5 rounded-xl backdrop-blur-sm bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 transition-all hover:scale-110"
                                      title="Archive"
                                    >
                                      <Archive className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteNotification(notification.id)}
                                    className="p-2.5 rounded-xl backdrop-blur-sm bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all hover:scale-110"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Floating particles effect on hover */}
                              {isUnread && (
                                <div className="absolute top-4 right-20 w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover/card:opacity-75 group-hover/card:animate-ping pointer-events-none"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        userEmail={user?.email || ''}
      />
    </div>
  );
}
