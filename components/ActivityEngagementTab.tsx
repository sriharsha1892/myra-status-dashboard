'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  Filter,
  Plus,
  Calendar,
  FileText,
  LogIn,
  BarChart,
  MessageCircle,
  BookOpen,
  CheckCircle,
  ClipboardList,
  Clock,
  Headphones,
  Pin
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ActivityEngagementTabProps {
  orgId: string;
  activities: any[];
  users: any[];
  organization: any;
  onAddActivity: (type: 'meeting' | 'note') => void;
}

export default function ActivityEngagementTab({
  orgId,
  activities,
  users,
  organization,
  onAddActivity,
}: ActivityEngagementTabProps) {
  const supabase = createClient();
  const [engagementLogs, setEngagementLogs] = useState<any[]>([]);
  const [supportQueries, setSupportQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch engagement logs
      const { data: logs, error: logsError } = await supabase
        .from('trial_engagement_log')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      setEngagementLogs(logs || []);

      // Fetch support queries for timeline
      const { data: queries, error: queriesError } = await supabase
        .from('trial_support_queries')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (queriesError) throw queriesError;
      setSupportQueries(queries || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  };

  // Combine all events into unified timeline
  const unifiedTimeline = [
    ...activities.map(a => ({ ...a, type: 'activity', timestamp: a.created_at })),
    ...engagementLogs.map(e => ({ ...e, type: 'engagement', timestamp: e.created_at })),
    ...supportQueries.map(s => ({ ...s, type: 'support', timestamp: s.created_at })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Filter timeline
  const filteredTimeline = filter === 'all'
    ? unifiedTimeline
    : unifiedTimeline.filter(item => item.type === filter);

  const getActivityIcon = (item: any) => {
    const iconClass = "w-4 h-4";

    if (item.type === 'activity') {
      return item.activity_type === 'meeting' ? <Calendar className={iconClass} /> : <FileText className={iconClass} />;
    } else if (item.type === 'engagement') {
      const iconMap: Record<string, any> = {
        user_logged_in: LogIn,
        usage_observed: BarChart,
        feedback_received: MessageCircle,
        learning_captured: BookOpen,
        follow_up_note: FileText,
        trial_access_provided: CheckCircle,
        trial_access_requested: ClipboardList,
        trial_extended: Clock,
      };
      const IconComponent = iconMap[item.activity_type] || Pin;
      return <IconComponent className={iconClass} />;
    } else {
      return <Headphones className={iconClass} />;
    }
  };

  const getActivityColor = (item: any) => {
    if (item.type === 'activity') return 'blue';
    if (item.type === 'engagement') return 'purple';
    return 'orange';
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
    };
    return colors[color] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Activity & Engagement Timeline</h3>
          <p className="text-sm text-gray-600 mt-1">Complete history of all interactions and events</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddActivity('meeting')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            Log Activity
          </button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />
        {[
          { id: 'all', label: 'All Events' },
          { id: 'activity', label: 'Meetings & Notes' },
          { id: 'engagement', label: 'User Events' },
          { id: 'support', label: 'Support' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs opacity-75">
              ({id === 'all' ? unifiedTimeline.length : unifiedTimeline.filter(i => i.type === id).length})
            </span>
          </button>
        ))}
      </div>

      {/* Unified Timeline */}
      {filteredTimeline.length === 0 ? (
        <div className="bg-white/50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No activity yet</p>
          <p className="text-sm text-gray-500 mt-1">Log meetings and track engagement to build the timeline</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTimeline.map((item, index) => {
            const color = getActivityColor(item);
            const colorClasses = getColorClasses(color);
            const icon = getActivityIcon(item);

            return (
              <div key={`${item.type}-${item.id}`} className="relative">
                {/* Timeline connector */}
                {index < filteredTimeline.length - 1 && (
                  <div className="absolute left-5 top-14 w-0.5 h-8 bg-gray-200" />
                )}

                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 ${colorClasses} flex-shrink-0`}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white/80 rounded-xl border border-gray-200/60 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {item.type === 'activity' && (item.title || item.activity_type)}
                            {item.type === 'engagement' && (item.description || item.activity_type)}
                            {item.type === 'support' && item.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClasses}`}>
                            {item.type === 'activity' && 'Meeting/Note'}
                            {item.type === 'engagement' && 'User Event'}
                            {item.type === 'support' && 'Support'}
                          </span>
                        </div>
                        {item.content && (
                          <p className="text-sm text-gray-700 line-clamp-2">{item.content}</p>
                        )}
                        {item.description && item.type !== 'engagement' && (
                          <p className="text-sm text-gray-700 line-clamp-2">{item.description}</p>
                        )}
                        {item.observations && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                            <strong>Notes:</strong> {item.observations}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Footer metadata */}
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                      {format(new Date(item.timestamp), 'MMM dd, yyyy HH:mm')}
                      {item.logged_by_role && ` • Logged by ${item.logged_by_role}`}
                      {item.created_by_role && ` • Created by ${item.created_by_role}`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
