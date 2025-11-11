'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import AddEngagementLogModal from './AddEngagementLogModal';
import { format, formatDistanceToNow } from 'date-fns';

interface EngagementLog {
  id: string;
  org_id: string;
  user_id: string;
  activity_type: string;
  description: string;
  observations?: string;
  logged_by: string;
  logged_by_role: string;
  created_at: string;
}

interface TrialUser {
  user_id: string;
  full_name: string;
}

interface EngagementTimelineTabProps {
  orgId: string;
}

const ACTIVITY_ICONS: { [key: string]: { icon: string; color: string; label: string } } = {
  user_logged_in: { icon: '🔓', color: 'blue', label: 'User Logged In' },
  usage_observed: { icon: '📊', color: 'purple', label: 'Usage Observed' },
  feedback_received: { icon: '💬', color: 'green', label: 'Feedback Received' },
  learning_captured: { icon: '📚', color: 'orange', label: 'Learning Captured' },
  follow_up_note: { icon: '📝', color: 'gray', label: 'Follow-up Note' },
  trial_access_provided: { icon: '✅', color: 'emerald', label: 'Trial Access Provided' },
  trial_access_requested: { icon: '📋', color: 'cyan', label: 'Trial Access Requested' },
  trial_extended: { icon: '⏱️', color: 'amber', label: 'Trial Extended' },
};

export default function EngagementTimelineTab({ orgId }: EngagementTimelineTabProps) {
  const [logs, setLogs] = useState<EngagementLog[]>([]);
  const [trialUsers, setTrialUsers] = useState<TrialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch engagement logs
      const { data: logsData, error: logsError } = await supabase
        .from('trial_engagement_log')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      setLogs(logsData || []);

      // Fetch trial users for reference
      const { data: usersData, error: usersError } = await supabase
        .from('trial_users')
        .select('user_id, full_name')
        .eq('org_id', orgId);

      if (usersError) throw usersError;
      setTrialUsers(usersData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load engagement logs');
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string) => {
    return trialUsers.find((u) => u.user_id === userId)?.full_name || userId;
  };

  // Filter logs
  let filteredLogs = logs;
  if (typeFilter !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.activity_type === typeFilter);
  }
  if (userFilter !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.user_id === userFilter);
  }

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      purple: 'text-accent-600 bg-accent-50 border-accent-200',
      green: 'text-green-600 bg-green-50 border-green-200',
      orange: 'text-orange-600 bg-orange-50 border-orange-200',
      gray: 'text-gray-600 bg-gray-50 border-gray-200',
      emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      cyan: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      amber: 'text-amber-600 bg-amber-50 border-amber-200',
    };
    return colorMap[color] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading activity timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Engagement Timeline ({filteredLogs.length})</h3>
          <p className="text-sm text-gray-600 mt-1">Track all user activities and interactions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 h-9 px-4 bg-accent-500 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Log Activity</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Activity:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Activities</option>
            {Object.entries(ACTIVITY_ICONS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">User:</label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="h-8 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Users</option>
            {trialUsers.map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/50 rounded-lg border border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 font-medium">No activities logged</p>
          <p className="text-sm text-gray-500 mt-1">Start logging user activities to build an engagement timeline</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log, index) => {
            const activityInfo = ACTIVITY_ICONS[log.activity_type] || ACTIVITY_ICONS.follow_up_note;
            const colorClasses = getColorClasses(activityInfo.color);

            return (
              <div
                key={log.id}
                className="relative"
              >
                {/* Timeline connector */}
                {index < filteredLogs.length - 1 && (
                  <div className="absolute left-5 top-12 w-0.5 h-8 bg-gray-200" />
                )}

                {/* Timeline item */}
                <div className="flex gap-4">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 ${colorClasses}`}>
                      {activityInfo.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="bg-white/80 rounded-xl border border-gray-200/60 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{activityInfo.label}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            <span className="font-medium">{getUserName(log.user_id)}</span>
                          </p>
                        </div>
                        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Description */}
                      <div className="mb-2">
                        <p className="text-sm text-gray-700 leading-relaxed">{log.description}</p>
                      </div>

                      {/* Observations */}
                      {log.observations && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Additional Notes:</p>
                          <p className="text-xs text-gray-700">{log.observations}</p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                        <span>Logged by {log.logged_by_role}</span>
                        <span>{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Activity Modal */}
      <AddEngagementLogModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
