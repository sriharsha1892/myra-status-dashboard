'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import RelativeTime from '@/components/ui/RelativeTime';
import {
  LogIn, MessageSquare, FileText, Star, Video, Play, CheckCircle,
  Clock, AlertCircle, CheckCircle2, AlertTriangle, Lightbulb,
  Phone, PhoneOff, Calendar, ShieldAlert, MessageCircle
} from 'lucide-react';

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  created_by: string | null;
}

interface TrialActivityFeedProps {
  trialOrgId: string;
  refreshTrigger?: number;
}

const ICON_MAP: Record<string, any> = {
  user_login: LogIn,
  questions_asked: MessageSquare,
  report_generated: FileText,
  expert_review_requested: Star,
  demo_completed: Video,
  onboarding_started: Play,
  onboarding_completed: CheckCircle,
  trial_extension_requested: Clock,
  ticket_created: AlertCircle,
  ticket_resolved: CheckCircle2,
  technical_issue: AlertTriangle,
  feature_request: Lightbulb,
  call_scheduled: Phone,
  call_completed: PhoneOff,
  trial_extended: Calendar,
  usage_warning: AlertTriangle,
  policy_violation: ShieldAlert,
  feedback_received: MessageCircle,
};

const COLOR_MAP: Record<string, string> = {
  user_login: 'bg-blue-50 text-blue-600',
  questions_asked: 'bg-purple-50 text-purple-600',
  report_generated: 'bg-green-50 text-green-600',
  expert_review_requested: 'bg-yellow-50 text-yellow-600',
  demo_completed: 'bg-indigo-50 text-indigo-600',
  onboarding_started: 'bg-cyan-50 text-cyan-600',
  onboarding_completed: 'bg-green-50 text-green-600',
  trial_extension_requested: 'bg-orange-50 text-orange-600',
  ticket_created: 'bg-red-50 text-red-600',
  ticket_resolved: 'bg-green-50 text-green-600',
  technical_issue: 'bg-red-50 text-red-600',
  feature_request: 'bg-purple-50 text-purple-600',
  call_scheduled: 'bg-blue-50 text-blue-600',
  call_completed: 'bg-green-50 text-green-600',
  trial_extended: 'bg-orange-50 text-orange-600',
  usage_warning: 'bg-yellow-50 text-yellow-600',
  policy_violation: 'bg-red-50 text-red-600',
  feedback_received: 'bg-blue-50 text-blue-600',
};

export default function TrialActivityFeed({ trialOrgId, refreshTrigger }: TrialActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Record<string, string>>({});

  const supabase = createClient();

  useEffect(() => {
    fetchActivities();
  }, [trialOrgId, refreshTrigger]);

  const fetchActivities = async () => {
    try {
      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('trial_activities')
        .select('*')
        .eq('trial_org_id', trialOrgId)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      setActivities(activitiesData || []);

      // Fetch user names for created_by
      const userIds = [...new Set(activitiesData?.map(a => a.created_by).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const usersMap = (usersData || []).reduce((acc, user) => {
          acc[user.user_id] = user.full_name;
          return acc;
        }, {} as Record<string, string>);

        setUsers(usersMap);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">No activities logged yet</p>
        <p className="text-slate-400 text-xs mt-1">Activity will appear here as you log them</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Activity Timeline</h3>

      <div className="space-y-3">
        {activities.map((activity, index) => {
          const Icon = ICON_MAP[activity.activity_type] || MessageCircle;
          const colorClass = COLOR_MAP[activity.activity_type] || 'bg-slate-50 text-slate-600';

          return (
            <div
              key={activity.id}
              className="relative flex gap-3 group"
            >
              {/* Timeline line */}
              {index < activities.length - 1 && (
                <div className="absolute left-4 top-10 bottom-0 w-px bg-slate-200" />
              )}

              {/* Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${colorClass} relative z-10`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 bg-white rounded-lg border border-slate-200 p-3 group-hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-medium text-slate-900">
                    {activity.title}
                  </h4>
                  <RelativeTime
                    date={activity.created_at}
                    className="text-xs text-slate-500 flex-shrink-0"
                  />
                </div>

                {activity.description && activity.description !== activity.title && (
                  <p className="text-sm text-slate-600 mb-2">
                    {activity.description}
                  </p>
                )}

                {/* Metadata */}
                {Object.keys(activity.metadata || {}).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {activity.metadata.count && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        Count: {activity.metadata.count}
                      </span>
                    )}
                    {activity.metadata.report_title && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {activity.metadata.report_title}
                      </span>
                    )}
                  </div>
                )}

                {/* Created by */}
                {activity.created_by && users[activity.created_by] && (
                  <p className="text-xs text-slate-500 mt-2">
                    Logged by {users[activity.created_by]}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
