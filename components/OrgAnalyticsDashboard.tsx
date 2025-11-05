'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface EngagementLog {
  id: string;
  org_id: string;
  user_id: string;
  activity_type: string;
  created_at: string;
}

interface SupportQuery {
  id: string;
  org_id: string;
  query_type: string;
  status: string;
  created_at: string;
}

interface TrialUser {
  user_id: string;
  full_name: string;
}

interface OrgAnalyticsDashboardProps {
  orgId: string;
}

interface ActivityStats {
  [key: string]: number;
}

interface UserActivityCount {
  user_id: string;
  full_name: string;
  count: number;
}

export default function OrgAnalyticsDashboard({ orgId }: OrgAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<EngagementLog[]>([]);
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [users, setUsers] = useState<TrialUser[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

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
        .select('id, org_id, user_id, activity_type, created_at')
        .eq('org_id', orgId);

      if (logsError) throw logsError;
      setLogs(logsData || []);

      // Fetch support queries
      const { data: queriesData, error: queriesError } = await supabase
        .from('trial_support_queries')
        .select('id, org_id, query_type, status, created_at')
        .eq('org_id', orgId);

      if (queriesError) throw queriesError;
      setQueries(queriesData || []);

      // Fetch trial users
      const { data: usersData, error: usersError } = await supabase
        .from('trial_users')
        .select('user_id, full_name')
        .eq('org_id', orgId);

      if (usersError) throw usersError;
      setUsers(usersData || []);

      setLastUpdateTime(new Date());
    } catch (error: any) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Calculate activity statistics
  const activityStats: ActivityStats = {};
  logs.forEach((log) => {
    activityStats[log.activity_type] = (activityStats[log.activity_type] || 0) + 1;
  });

  // Calculate user activity counts
  const userActivityCounts: UserActivityCount[] = users
    .map((user) => ({
      user_id: user.user_id,
      full_name: user.full_name,
      count: logs.filter((log) => log.user_id === user.user_id).length,
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate query statistics
  const queryStats = {
    total: queries.length,
    open: queries.filter((q) => q.status === 'open').length,
    in_progress: queries.filter((q) => q.status === 'in_progress').length,
    resolved: queries.filter((q) => q.status === 'resolved').length,
    closed: queries.filter((q) => q.status === 'closed').length,
  };

  // Calculate trial health score (0-100)
  const calculateHealthScore = () => {
    let score = 50; // Base score

    // Engagement factor (max 30 points)
    const engagementRate = users.length > 0 ? logs.length / users.length : 0;
    score += Math.min(engagementRate * 3, 30);

    // Query resolution rate (max 20 points)
    if (queryStats.total > 0) {
      const resolutionRate = (queryStats.resolved + queryStats.closed) / queryStats.total;
      score += resolutionRate * 20;
    } else {
      score += 10; // No queries is good
    }

    return Math.min(100, Math.round(score));
  };

  const healthScore = calculateHealthScore();

  const getHealthColor = (score: number) => {
    if (score >= 75) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 75) return 'Healthy';
    if (score >= 50) return 'Fair';
    return 'At Risk';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Organization Analytics</h3>
          <p className="text-sm text-gray-600 mt-1">Aggregated engagement and support metrics</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Trial Health Score */}
        <div className={`rounded-xl border p-4 ${getHealthColor(healthScore)}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Trial Health</h4>
            <span className="text-xl">💚</span>
          </div>
          <div className="text-3xl font-bold">{healthScore}</div>
          <p className="text-xs mt-1 font-medium">{getHealthLabel(healthScore)}</p>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                healthScore >= 75
                  ? 'bg-green-600'
                  : healthScore >= 50
                  ? 'bg-yellow-600'
                  : 'bg-red-600'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-blue-900">Total Users</h4>
            <span className="text-xl">👥</span>
          </div>
          <div className="text-3xl font-bold text-blue-600">{users.length}</div>
          <p className="text-xs text-blue-700 mt-1">Users invited to trial</p>
        </div>

        {/* Total Engagement Activities */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-purple-900">Activities</h4>
            <span className="text-xl">📊</span>
          </div>
          <div className="text-3xl font-bold text-purple-600">{logs.length}</div>
          <p className="text-xs text-purple-700 mt-1">
            {users.length > 0 ? `${(logs.length / users.length).toFixed(1)}/user avg` : 'No users'}
          </p>
        </div>

        {/* Support Queries Status */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-orange-900">Queries</h4>
            <span className="text-xl">🎫</span>
          </div>
          <div className="text-3xl font-bold text-orange-600">{queryStats.total}</div>
          <p className="text-xs text-orange-700 mt-1">
            {queryStats.resolved + queryStats.closed} resolved
          </p>
        </div>
      </div>

      {/* Activity Breakdown and Query Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Type Breakdown */}
        <div className="bg-white/80 rounded-xl border border-gray-200/60 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Activity Breakdown</h4>
          {Object.keys(activityStats).length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-6">No activities logged yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(activityStats)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {type.replace(/_/g, ' ')}
                      </p>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-600 transition-all"
                          style={{
                            width: `${(count / Math.max(...Object.values(activityStats))) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="ml-3 text-sm font-semibold text-gray-700 w-10 text-right">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Query Status Summary */}
        <div className="bg-white/80 rounded-xl border border-gray-200/60 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Query Status</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-sm font-medium text-red-900">Open</span>
              <span className="text-lg font-bold text-red-600">{queryStats.open}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-sm font-medium text-yellow-900">In Progress</span>
              <span className="text-lg font-bold text-yellow-600">{queryStats.in_progress}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-sm font-medium text-green-900">Resolved</span>
              <span className="text-lg font-bold text-green-600">{queryStats.resolved}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-sm font-medium text-gray-900">Closed</span>
              <span className="text-lg font-bold text-gray-600">{queryStats.closed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Most Active Users */}
      <div className="bg-white/80 rounded-xl border border-gray-200/60 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Most Active Users</h4>
        {userActivityCounts.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6">No users in trial yet</p>
        ) : (
          <div className="space-y-2">
            {userActivityCounts.slice(0, 5).map((user, index) => (
              <div key={user.user_id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-xs text-gray-500">{user.count} activities</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{user.count}</p>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-green-600 transition-all"
                      style={{
                        width: `${(user.count / Math.max(...userActivityCounts.map((u) => u.count), 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {userActivityCounts.length > 5 && (
              <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200 text-center">
                +{userActivityCounts.length - 5} more users
              </p>
            )}
          </div>
        )}
      </div>

      {/* Data Info */}
      {lastUpdateTime && (
        <div className="text-xs text-gray-500 text-right">
          Last updated: {format(lastUpdateTime, 'MMM dd, yyyy HH:mm:ss')}
        </div>
      )}
    </div>
  );
}
