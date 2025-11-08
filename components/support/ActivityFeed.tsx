'use client';

import React, { useState } from 'react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import {
  Calendar,
  MessageSquare,
  Lightbulb,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Plus,
  Filter,
  Users,
} from 'lucide-react';
import Avatar from '../Avatar';

interface Activity {
  id: string;
  type: 'meeting' | 'ticket' | 'note' | 'user_event';
  title: string;
  content?: string;
  created_at: string;
  created_by?: string;
  created_by_name?: string;

  // Type-specific fields
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
  user_name?: string;
  old_stage?: string;
  new_stage?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  users?: any[];
  organization?: any;
  onAddActivity?: (type: 'meeting' | 'note') => void;
}

const ACTIVITY_ICONS = {
  meeting: { icon: Calendar, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  ticket: { icon: MessageSquare, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  note: { icon: Lightbulb, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  user_event: { icon: User, color: 'from-green-500 to-green-600', bg: 'bg-green-50', border: 'border-green-200' },
};

const PRIORITY_BADGES = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-amber-100 text-amber-700 border-amber-200',
  critical: 'bg-red-100 text-red-700 border-red-200 animate-pulse',
};

export default function ActivityFeed({ activities, users = [], organization, onAddActivity }: ActivityFeedProps) {
  const [filter, setFilter] = useState<'all' | 'meeting' | 'ticket' | 'note' | 'user_event'>('all');

  // Auto-generate user creation events if users exist but no activities
  const enrichedActivities = React.useMemo(() => {
    const allActivities = [...activities];

    // Add user creation events for context
    if (users.length > 0 && activities.length === 0) {
      users.forEach((user: any) => {
        allActivities.push({
          id: `user-created-${user.user_id}`,
          type: 'user_event' as const,
          title: `${user.name} joined the trial`,
          user_name: user.name,
          new_stage: user.current_stage,
          created_at: user.created_at,
        });
      });
    }

    return allActivities.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [activities, users]);

  const filteredActivities = filter === 'all'
    ? enrichedActivities
    : enrichedActivities.filter(a => a.type === filter);

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-900">Activity Feed</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex gap-1">
              {(['all', 'meeting', 'ticket', 'note', 'user_event'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`
                    px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200
                    ${filter === type
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white/60 text-gray-600 hover:bg-white border border-gray-200/60'
                    }
                  `}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Add Buttons */}
        {onAddActivity && (
          <div className="flex gap-2">
            <button
              onClick={() => onAddActivity('meeting')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <Calendar className="w-4 h-4" />
              Log Meeting
            </button>
            <button
              onClick={() => onAddActivity('note')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm text-gray-700 text-sm font-medium border border-gray-200/60 hover:bg-white hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Add Note
            </button>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <SmartEmptyState users={users} organization={organization} onAddActivity={onAddActivity} />
        ) : (
          filteredActivities.map((activity, index) => (
            <ActivityCard key={activity.id} activity={activity} isLast={index === filteredActivities.length - 1} />
          ))
        )}
      </div>
    </div>
  );
}

// Smart Empty State Component
function SmartEmptyState({ users, organization, onAddActivity }: { users?: any[]; organization?: any; onAddActivity?: (type: 'meeting' | 'note') => void }) {
  const hasUsers = users && users.length > 0;
  const trialDaysLeft = organization?.trial_end_date
    ? differenceInDays(new Date(organization.trial_end_date), new Date())
    : null;

  return (
    <div className="space-y-6">
      {/* Main Empty State Card */}
      <div className="text-center py-16 px-8 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 border border-white/60 shadow-xl">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Calendar className="w-10 h-10 text-white" />
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {hasUsers ? 'Start tracking activity' : 'Getting started'}
        </h3>

        <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
          {hasUsers
            ? `You have ${users.length} user${users.length > 1 ? 's' : ''} in this trial. Log your first meeting or add notes to track engagement.`
            : 'Add users to this trial organization, then log meetings and track their journey.'
          }
        </p>

        {/* Action Buttons */}
        {onAddActivity && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => onAddActivity('meeting')}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <Calendar className="w-5 h-5" />
              Log First Meeting
            </button>
            <button
              onClick={() => onAddActivity('note')}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/90 backdrop-blur-sm text-gray-700 font-medium border border-gray-200/60 hover:bg-white hover:shadow-lg transition-all duration-200"
            >
              <MessageSquare className="w-5 h-5" />
              Add Note
            </button>
          </div>
        )}
      </div>

      {/* Contextual Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/80 border border-white/40">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Track Users</h4>
          <p className="text-sm text-gray-600">
            {hasUsers
              ? `${users.length} user${users.length > 1 ? 's' : ''} added. Update their stages as they progress.`
              : 'Add users to start tracking their trial journey.'
            }
          </p>
        </div>

        <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/80 border border-white/40">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Log Meetings</h4>
          <p className="text-sm text-gray-600">
            Document demo calls, check-ins, and important conversations.
          </p>
        </div>

        <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/80 border border-white/40">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-4">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Capture Insights</h4>
          <p className="text-sm text-gray-600">
            Note feature requests, feedback, and key decisions inline.
          </p>
        </div>
      </div>

      {/* Trial Timeline Hint */}
      {trialDaysLeft !== null && trialDaysLeft >= 0 && (
        <div className="p-4 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-amber-50/80 to-orange-50/80 border border-amber-200/60 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {trialDaysLeft} days left in trial
            </p>
            <p className="text-xs text-gray-600">
              Start logging activity to track engagement and conversion potential
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity, isLast }: { activity: Activity; isLast: boolean }) {
  const config = ACTIVITY_ICONS[activity.type];
  const Icon = config.icon;

  return (
    <div className="relative group">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-6 top-12 bottom-0 w-px bg-gradient-to-b from-gray-300 to-transparent" />
      )}

      {/* Card */}
      <div className="relative flex gap-4 p-6 rounded-2xl backdrop-blur-xl bg-white/80 border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900">{activity.title}</h4>
                {activity.priority && (
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${PRIORITY_BADGES[activity.priority]}`}>
                    {activity.priority}
                  </span>
                )}
                {activity.status && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    {activity.status}
                  </span>
                )}
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
                {activity.created_by_name && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Avatar name={activity.created_by_name} size="sm" />
                      {activity.created_by_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {activity.content && (
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-3">
              {activity.content}
            </div>
          )}

          {/* User Event Details */}
          {activity.type === 'user_event' && activity.user_name && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/60">
              <Avatar name={activity.user_name} size="sm" stage={activity.new_stage as any} />
              <div className="text-sm">
                <span className="font-medium text-gray-900">{activity.user_name}</span>
                {activity.old_stage && activity.new_stage && (
                  <span className="text-gray-600">
                    {' '}moved from <span className="font-medium">{activity.old_stage}</span> to <span className="font-medium text-green-600">{activity.new_stage}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200/60">
            <button className="text-xs text-gray-600 hover:text-blue-600 font-medium transition-colors">
              💬 Add comment
            </button>
            <span className="text-gray-300">•</span>
            <button className="text-xs text-gray-600 hover:text-blue-600 font-medium transition-colors">
              ✅ Create todo
            </button>
            {activity.type === 'ticket' && (
              <>
                <span className="text-gray-300">•</span>
                <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  View ticket
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Glassmorphism shine effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}
