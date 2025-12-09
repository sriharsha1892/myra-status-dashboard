'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clock, User, MessageSquare, Activity, TrendingUp, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLogEntry {
  activity_id: string;
  activity_type: string;
  description: string;
  created_at: string;
  logged_by: string;
  logged_by_role: string;
  logged_by_name?: string;
}

interface ActivityTimelineProps {
  orgId: string;
}

// Activity type configuration
const ACTIVITY_CONFIG: Record<string, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  usage_observed: {
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    label: 'Usage Observed',
  },
  user_logged_in: {
    icon: <User className="w-4 h-4" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    label: 'User Login',
  },
  follow_up_note: {
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    label: 'Follow-up Note',
  },
  demo_scheduled: {
    icon: <Calendar className="w-4 h-4" />,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    label: 'Demo Scheduled',
  },
  trial_extended: {
    icon: <Clock className="w-4 h-4" />,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    label: 'Trial Extended',
  },
  default: {
    icon: <Activity className="w-4 h-4" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    label: 'Activity',
  },
};

export default function ActivityTimeline({ orgId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [limit, setLimit] = useState(10);

  const supabase = createClient();

  useEffect(() => {
    fetchActivities();
  }, [orgId, filter, limit]);

  const fetchActivities = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('trial_engagement_log')
        .select(`
          activity_id,
          activity_type,
          description,
          created_at,
          logged_by,
          logged_by_role
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      // Apply filter
      if (filter !== 'all') {
        query = query.eq('activity_type', filter);
      }

      // Apply limit
      query = query.limit(limit);

      const { data, error } = await query;

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityConfig = (type: string) => {
    return ACTIVITY_CONFIG[type] || ACTIVITY_CONFIG.default;
  };

  const getUniqueActivityTypes = () => {
    const types = new Set(activities.map(a => a.activity_type));
    return Array.from(types);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">No activity logged yet</p>
        <p className="text-gray-500 text-xs mt-1">Activity will appear here as it's logged</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>

        <div className="flex items-center gap-3">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <option value="all">All Activities</option>
            {getUniqueActivityTypes().map((type) => {
              const config = getActivityConfig(type);
              return (
                <option key={type} value={type}>
                  {config.label}
                </option>
              );
            })}
          </select>

          {/* Load more */}
          {activities.length >= limit && (
            <button
              onClick={() => setLimit(limit + 10)}
              className="text-sm text-accent-600 hover:text-accent-700 font-medium"
            >
              Load More
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Activities */}
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const config = getActivityConfig(activity.activity_type);
            const isLast = index === activities.length - 1;

            return (
              <div key={activity.activity_id} className="relative flex gap-4">
                {/* Icon */}
                <div className={`relative z-10 flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full ${config.bgColor} ${config.color}`}>
                  {config.icon}
                </div>

                {/* Content */}
                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {activity.description && (
                        <p className="text-sm text-gray-700 mb-2">{activity.description}</p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>
                          Logged by {activity.logged_by_role}
                        </span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(activity.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{activities.length}</div>
          <div className="text-xs text-gray-600">Total Activities</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {new Set(activities.map(a => a.activity_type)).size}
          </div>
          <div className="text-xs text-gray-600">Activity Types</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {activities.length > 0
              ? Math.ceil(
                  (new Date().getTime() - new Date(activities[activities.length - 1].created_at).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0}
          </div>
          <div className="text-xs text-gray-600">Days Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {activities.length > 0
              ? formatDistanceToNow(new Date(activities[0].created_at), { addSuffix: true }).replace('about ', '')
              : 'N/A'}
          </div>
          <div className="text-xs text-gray-600">Last Activity</div>
        </div>
      </div>
    </div>
  );
}
