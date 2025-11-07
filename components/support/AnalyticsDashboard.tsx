'use client';

import React, { useState, useMemo } from 'react';
import { differenceInDays, format, startOfWeek, startOfMonth, subDays } from 'date-fns';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Activity,
  Target,
  Filter,
  Download,
} from 'lucide-react';

interface TrialOrg {
  org_id: string;
  org_name: string;
  account_manager: string;
  trial_start_date: string;
  trial_end_date: string;
  created_at: string;
  sales_poc?: string;
  trial_users?: TrialUser[];
  trial_support_queries?: SupportQuery[];
}

interface TrialUser {
  user_id: string;
  name: string;
  email: string;
  current_stage: string;
  created_at: string;
  last_active?: string;
}

interface SupportQuery {
  query_id: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at?: string;
}

interface TeamMember {
  user_id: string;
  username: string;
  role: string;
}

interface CurrentUser {
  role: string;
  username: string;
}

interface Props {
  organizations: TrialOrg[];
  teamMembers: TeamMember[];
  currentUser: CurrentUser;
}

type TimeRange = 'week' | 'month' | 'quarter' | 'all';
type MetricView = 'overview' | 'engagement' | 'support' | 'conversion';

export default function AnalyticsDashboard({ organizations, teamMembers, currentUser }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [metricView, setMetricView] = useState<MetricView>('overview');
  const [selectedAM, setSelectedAM] = useState<string>('all');

  // Filter organizations by time range and account manager
  const filteredOrgs = useMemo(() => {
    let filtered = [...organizations];
    const now = new Date();

    // Filter by time range
    if (timeRange !== 'all') {
      const daysBack = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const cutoffDate = subDays(now, daysBack);
      filtered = filtered.filter(org => new Date(org.created_at) >= cutoffDate);
    }

    // Filter by account manager
    if (selectedAM !== 'all') {
      filtered = filtered.filter(org => org.account_manager === selectedAM);
    }

    return filtered;
  }, [organizations, timeRange, selectedAM]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const totalOrgs = filteredOrgs.length;
    const totalUsers = filteredOrgs.reduce((sum, org) => sum + (org.trial_users?.length || 0), 0);
    const totalQueries = filteredOrgs.reduce((sum, org) => sum + (org.trial_support_queries?.length || 0), 0);

    // Active trials (not expired)
    const activeTrials = filteredOrgs.filter(org =>
      differenceInDays(new Date(org.trial_end_date), now) >= 0
    );

    // At-risk trials (expiring in 7 days or less)
    const atRiskTrials = activeTrials.filter(org => {
      const daysLeft = differenceInDays(new Date(org.trial_end_date), now);
      return daysLeft >= 0 && daysLeft <= 7;
    });

    // High engagement trials (3+ active users)
    const highEngagementTrials = activeTrials.filter(org => {
      const activeUsers = org.trial_users?.filter(u => u.current_stage === 'active' || u.current_stage === 'engaged') || [];
      return activeUsers.length >= 3;
    });

    // Support response metrics
    const resolvedQueries = filteredOrgs.flatMap(org =>
      org.trial_support_queries?.filter(q => q.status === 'resolved') || []
    );

    const avgResolutionTime = resolvedQueries.length > 0
      ? resolvedQueries.reduce((sum, q) => {
          if (q.resolved_at) {
            return sum + differenceInDays(new Date(q.resolved_at), new Date(q.created_at));
          }
          return sum;
        }, 0) / resolvedQueries.length
      : 0;

    // Engagement score (composite metric)
    const engagementScores = activeTrials.map(org => {
      const users = org.trial_users || [];
      const queries = org.trial_support_queries || [];

      const activeUsers = users.filter(u => u.current_stage === 'active' || u.current_stage === 'engaged').length;
      const totalUsers = users.length || 1;
      const userEngagement = (activeUsers / totalUsers) * 100;

      const openQueries = queries.filter(q => q.status !== 'resolved').length;
      const supportHealth = openQueries === 0 ? 100 : Math.max(0, 100 - (openQueries * 10));

      return (userEngagement * 0.7) + (supportHealth * 0.3);
    });

    const avgEngagementScore = engagementScores.length > 0
      ? engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length
      : 0;

    // User stage distribution
    const allUsers = filteredOrgs.flatMap(org => org.trial_users || []);
    const stageDistribution = {
      invited: allUsers.filter(u => u.current_stage === 'invited').length,
      onboarding: allUsers.filter(u => u.current_stage === 'onboarding').length,
      active: allUsers.filter(u => u.current_stage === 'active').length,
      engaged: allUsers.filter(u => u.current_stage === 'engaged').length,
    };

    return {
      totalOrgs,
      activeTrials: activeTrials.length,
      atRiskTrials: atRiskTrials.length,
      highEngagementTrials: highEngagementTrials.length,
      totalUsers,
      totalQueries,
      avgResolutionTime,
      avgEngagementScore,
      stageDistribution,
      atRiskList: atRiskTrials,
      highEngagementList: highEngagementTrials,
    };
  }, [filteredOrgs]);

  const exportData = () => {
    const csvData = filteredOrgs.map(org => ({
      Organization: org.org_name,
      'Account Manager': org.account_manager,
      'Trial Start': format(new Date(org.trial_start_date), 'yyyy-MM-dd'),
      'Trial End': format(new Date(org.trial_end_date), 'yyyy-MM-dd'),
      'Days Left': differenceInDays(new Date(org.trial_end_date), new Date()),
      'Total Users': org.trial_users?.length || 0,
      'Active Users': org.trial_users?.filter(u => u.current_stage === 'active' || u.current_stage === 'engaged').length || 0,
      'Open Queries': org.trial_support_queries?.filter(q => q.status !== 'resolved').length || 0,
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          {/* Time Range */}
          <div className="flex gap-2">
            {(['week', 'month', 'quarter', 'all'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : range === 'quarter' ? 'Quarter' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Account Manager Filter */}
          {currentUser.role === 'Admin' && (
            <select
              value={selectedAM}
              onChange={(e) => setSelectedAM(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Account Managers</option>
              {teamMembers.filter(m => m.role === 'Account Manager').map(am => (
                <option key={am.user_id} value={am.username}>
                  {am.username}
                </option>
              ))}
            </select>
          )}

          {/* Export Button */}
          <button
            onClick={exportData}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Metric View Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-2">
        <div className="flex gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'engagement', label: 'Engagement', icon: Activity },
            { id: 'support', label: 'Support', icon: Target },
            { id: 'conversion', label: 'Conversion', icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMetricView(id as MetricView)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                metricView === id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Metrics */}
      {metricView === 'overview' && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Active Trials</span>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{metrics.activeTrials}</div>
              <div className="text-xs text-gray-500 mt-1">of {metrics.totalOrgs} total</div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">At Risk</span>
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{metrics.atRiskTrials}</div>
              <div className="text-xs text-gray-500 mt-1">expiring within 7 days</div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Users</span>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{metrics.totalUsers}</div>
              <div className="text-xs text-gray-500 mt-1">across all trials</div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Engagement Score</span>
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{metrics.avgEngagementScore.toFixed(0)}%</div>
              <div className="text-xs text-gray-500 mt-1">composite metric</div>
            </div>
          </div>

          {/* At-Risk Trials List */}
          {metrics.atRiskTrials > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-gray-900">Immediate Action Required</h3>
              </div>
              <div className="space-y-3">
                {metrics.atRiskList.map(org => {
                  const daysLeft = differenceInDays(new Date(org.trial_end_date), new Date());
                  return (
                    <div key={org.org_id} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div>
                        <div className="font-semibold text-gray-900">{org.org_name}</div>
                        <div className="text-sm text-gray-600">AM: {org.account_manager}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-amber-600">{daysLeft}</div>
                        <div className="text-xs text-gray-600">days left</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* High Engagement Trials */}
          {metrics.highEngagementTrials > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-green-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">High Engagement Trials</h3>
                <span className="text-sm text-gray-600">({metrics.highEngagementTrials})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {metrics.highEngagementList.slice(0, 6).map(org => {
                  const activeUsers = org.trial_users?.filter(u => u.current_stage === 'active' || u.current_stage === 'engaged').length || 0;
                  return (
                    <div key={org.org_id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <div className="font-semibold text-gray-900">{org.org_name}</div>
                        <div className="text-sm text-gray-600">{activeUsers} active users</div>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Engagement View */}
      {metricView === 'engagement' && (
        <div className="space-y-6">
          {/* User Stage Distribution */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">User Stage Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-700">Invited</div>
                <div className="text-3xl font-bold text-blue-900 mt-2">{metrics.stageDistribution.invited}</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-sm font-medium text-purple-700">Onboarding</div>
                <div className="text-3xl font-bold text-purple-900 mt-2">{metrics.stageDistribution.onboarding}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-700">Active</div>
                <div className="text-3xl font-bold text-green-900 mt-2">{metrics.stageDistribution.active}</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-sm font-medium text-amber-700">Engaged</div>
                <div className="text-3xl font-bold text-amber-900 mt-2">{metrics.stageDistribution.engaged}</div>
              </div>
            </div>
          </div>

          {/* Detailed Org Engagement */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Organization Engagement Details</h3>
            <div className="space-y-3">
              {filteredOrgs.slice(0, 10).map(org => {
                const users = org.trial_users || [];
                const activeUsers = users.filter(u => u.current_stage === 'active' || u.current_stage === 'engaged');
                const engagementRate = users.length > 0 ? (activeUsers.length / users.length) * 100 : 0;

                return (
                  <div key={org.org_id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-900">{org.org_name}</div>
                      <div className="text-sm text-gray-600">{org.account_manager}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                            style={{ width: `${engagementRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {activeUsers.length}/{users.length} active ({engagementRate.toFixed(0)}%)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Support View */}
      {metricView === 'support' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Queries</span>
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{metrics.totalQueries}</div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avg Resolution Time</span>
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{metrics.avgResolutionTime.toFixed(1)}</div>
              <div className="text-xs text-gray-500 mt-1">days</div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Queries per Trial</span>
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {metrics.activeTrials > 0 ? (metrics.totalQueries / metrics.activeTrials).toFixed(1) : '0'}
              </div>
            </div>
          </div>

          {/* Support details would go here */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Support Query Breakdown</h3>
            <p className="text-sm text-gray-600">Detailed support metrics coming soon...</p>
          </div>
        </div>
      )}

      {/* Conversion View */}
      {metricView === 'conversion' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Conversion Funnel</h3>
          <p className="text-sm text-gray-600">Conversion tracking metrics coming soon...</p>
        </div>
      )}
    </div>
  );
}
