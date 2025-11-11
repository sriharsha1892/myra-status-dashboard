'use client';

import React, { useState, useMemo } from 'react';
import { differenceInDays, format, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
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
  Zap,
  Award,
} from 'lucide-react';
import MetricCard3D from '@/components/visualizations/MetricCard3D';
import GradientMeshBg from '@/components/visualizations/GradientMeshBg';
import ParticleBackground from '@/components/visualizations/ParticleBackground';
import { AnimatedBadge } from '@/components/visualizations/AnimatedDataGrid';

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
    <div className="relative min-h-screen">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <GradientMeshBg variant="cool" intensity="subtle" animated />
        <ParticleBackground count={30} color="rgb(59, 130, 246)" size="small" speed="slow" />
      </div>

      <div className="relative space-y-6">
        {/* Filters with enhanced glass morphism */}
        <motion.div
          className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 shadow-2xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Filter className="w-5 h-5 text-blue-600" />
              </motion.div>
              <span className="text-sm font-semibold text-gray-700">Filters:</span>
            </div>

            {/* Time Range with enhanced buttons */}
            <div className="flex gap-2">
              {(['week', 'month', 'quarter', 'all'] as TimeRange[]).map((range, index) => (
                <motion.button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    timeRange === range
                      ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/30'
                      : 'bg-white/80 text-gray-700 hover:bg-white hover:shadow-md border border-gray-200/50'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : range === 'quarter' ? 'Quarter' : 'All Time'}
                </motion.button>
              ))}
            </div>

            {/* Account Manager Filter with enhanced styling */}
            {currentUser.role === 'Admin' && (
              <motion.select
                value={selectedAM}
                onChange={(e) => setSelectedAM(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200/50 bg-white/80 backdrop-blur-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-all"
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <option value="all">All Account Managers</option>
                {teamMembers.filter(m => m.role === 'Account Manager').map(am => (
                  <option key={am.user_id} value={am.username}>
                    {am.username}
                  </option>
                ))}
              </motion.select>
            )}

            {/* Export Button with enhanced styling */}
            <motion.button
              onClick={exportData}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-xl hover:from-gray-800 hover:to-gray-600 transition-all shadow-lg"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Download className="w-4 h-4" />
              <span className="font-semibold">Export CSV</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Metric View Tabs with enhanced design */}
        <motion.div
          className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-2 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex gap-2">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'engagement', label: 'Engagement', icon: Activity },
              { id: 'support', label: 'Support', icon: Target },
              { id: 'conversion', label: 'Conversion', icon: TrendingUp },
            ].map(({ id, label, icon: Icon }, index) => (
              <motion.button
                key={id}
                onClick={() => setMetricView(id as MetricView)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  metricView === id
                    ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/30'
                    : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
                }`}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Overview Metrics */}
        <AnimatePresence mode="wait">
          {metricView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              {/* 3D Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard3D
                  title="Active Trials"
                  value={metrics.activeTrials}
                  subtitle={`of ${metrics.totalOrgs} total`}
                  icon={CheckCircle2}
                  gradient="from-green-500 to-emerald-600"
                  glowColor="rgba(34, 197, 94, 0.3)"
                  trend={{
                    value: 5.2,
                    label: 'vs last period',
                  }}
                />

                <MetricCard3D
                  title="At Risk"
                  value={metrics.atRiskTrials}
                  subtitle="expiring within 7 days"
                  icon={AlertTriangle}
                  gradient="from-amber-500 to-orange-600"
                  glowColor="rgba(245, 158, 11, 0.3)"
                  trend={{
                    value: -12.3,
                    label: 'vs last period',
                  }}
                />

                <MetricCard3D
                  title="Total Users"
                  value={metrics.totalUsers}
                  subtitle="across all trials"
                  icon={Users}
                  gradient="from-blue-500 to-cyan-600"
                  glowColor="rgba(59, 130, 246, 0.3)"
                  trend={{
                    value: 18.7,
                    label: 'vs last period',
                  }}
                />

                <MetricCard3D
                  title="Engagement Score"
                  value={`${metrics.avgEngagementScore.toFixed(0)}%`}
                  subtitle="composite metric"
                  icon={Activity}
                  gradient="from-purple-500 to-pink-600"
                  glowColor="rgba(168, 85, 247, 0.3)"
                  trend={{
                    value: 3.4,
                    label: 'vs last period',
                  }}
                />

              </div>

              {/* At-Risk Trials List with enhanced design */}
              {metrics.atRiskTrials > 0 && (
                <motion.div
                  className="bg-gradient-to-br from-amber-50 to-orange-50 backdrop-blur-xl rounded-2xl border border-amber-200/60 p-6 shadow-xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900">Immediate Action Required</h3>
                    <AnimatedBadge label={`${metrics.atRiskTrials} trials`} variant="warning" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metrics.atRiskList.map((org, index) => {
                      const daysLeft = differenceInDays(new Date(org.trial_end_date), new Date());
                      return (
                        <motion.div
                          key={org.org_id}
                          className="flex items-center justify-between p-5 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 hover:shadow-lg transition-all group"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + index * 0.1 }}
                          whileHover={{ scale: 1.02, x: 4 }}
                        >
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                              {org.org_name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">AM: {org.account_manager}</div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-3xl font-bold text-amber-600">{daysLeft}</div>
                            <div className="text-xs text-gray-600 font-medium">days left</div>
                          </div>
                          <motion.div
                            className="ml-2"
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                          >
                            <Clock className="w-5 h-5 text-amber-500" />
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

          {/* High Engagement Trials - Enhanced */}
          {metrics.highEngagementTrials > 0 && (
            <motion.div
              className="bg-gradient-to-br from-green-50 to-emerald-50 backdrop-blur-xl rounded-2xl border border-green-200/60 p-6 shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1.1, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900">High Performance Trials</h3>
                <AnimatedBadge label={`${metrics.highEngagementTrials} trials`} variant="success" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.highEngagementList.slice(0, 6).map((org, index) => {
                  const activeUsers = org.trial_users?.filter(u => u.current_stage === 'active' || u.current_stage === 'engaged').length || 0;
                  const totalUsers = org.trial_users?.length || 0;
                  const engagementRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

                  return (
                    <motion.div
                      key={org.org_id}
                      className="relative group overflow-hidden"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="relative p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200 shadow-md transition-all group-hover:shadow-xl group-hover:border-green-300">
                        {/* Success glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/10 to-green-400/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />

                        <div className="relative flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-1">{org.org_name}</div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm text-green-700 font-medium">
                                {activeUsers}/{totalUsers} active users
                              </div>
                              <div className="text-xs text-gray-500">
                                ({engagementRate.toFixed(0)}%)
                              </div>
                            </div>
                          </div>
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                          >
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          </motion.div>
                        </div>

                        {/* Engagement bar */}
                        <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${engagementRate}%` }}
                            transition={{ duration: 1, delay: 0.8 + index * 0.05 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Engagement View */}
      {metricView === 'engagement' && (
        <div className="space-y-6">
          {/* User Stage Distribution - Enhanced */}
          <motion.div
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/60 p-6 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">User Stage Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                className="relative group overflow-hidden p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200/60 shadow-md"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.05, boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-sm font-semibold text-blue-700 mb-2">Invited</div>
                  <div className="text-4xl font-bold text-blue-900">{metrics.stageDistribution.invited}</div>
                </div>
              </motion.div>

              <motion.div
                className="relative group overflow-hidden p-5 bg-gradient-to-br from-accent-50 to-purple-100 rounded-xl border border-accent-200/60 shadow-md"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05, boxShadow: '0 8px 24px rgba(147, 51, 234, 0.2)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-sm font-semibold text-accent-700 mb-2">Onboarding</div>
                  <div className="text-4xl font-bold text-purple-900">{metrics.stageDistribution.onboarding}</div>
                </div>
              </motion.div>

              <motion.div
                className="relative group overflow-hidden p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200/60 shadow-md"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.05, boxShadow: '0 8px 24px rgba(34, 197, 94, 0.2)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/20 to-green-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-sm font-semibold text-green-700 mb-2">Active</div>
                  <div className="text-4xl font-bold text-green-900">{metrics.stageDistribution.active}</div>
                </div>
              </motion.div>

              <motion.div
                className="relative group overflow-hidden p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200/60 shadow-md"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05, boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/20 to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-sm font-semibold text-amber-700 mb-2">Engaged</div>
                  <div className="text-4xl font-bold text-amber-900">{metrics.stageDistribution.engaged}</div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Detailed Org Engagement - Enhanced */}
          <motion.div
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/60 p-6 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">Organization Engagement Details</h3>
            <div className="space-y-3">
              {filteredOrgs.slice(0, 10).map((org, index) => {
                const users = org.trial_users || [];
                const activeUsers = users.filter(u => u.current_stage === 'active' || u.current_stage === 'engaged');
                const engagementRate = users.length > 0 ? (activeUsers.length / users.length) * 100 : 0;

                return (
                  <motion.div
                    key={org.org_id}
                    className="group relative p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all hover:shadow-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />

                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold text-gray-900">{org.org_name}</div>
                        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                          {org.account_manager}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${engagementRate}%` }}
                              transition={{ duration: 1, delay: 0.5 + index * 0.05 }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-gray-900">
                            {activeUsers.length}/{users.length}
                          </div>
                          <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                            engagementRate >= 75 ? 'bg-green-100 text-green-700' :
                            engagementRate >= 50 ? 'bg-blue-100 text-blue-700' :
                            engagementRate >= 25 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {engagementRate.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Support View - Enhanced */}
      {metricView === 'support' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              className="relative group overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 backdrop-blur-xl rounded-2xl border border-blue-200/60 p-6 shadow-xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.05, boxShadow: '0 12px 32px rgba(59, 130, 246, 0.3)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-blue-700">Total Queries</span>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Target className="w-5 h-5 text-blue-600" />
                  </motion.div>
                </div>
                <div className="text-4xl font-bold text-blue-900">{metrics.totalQueries}</div>
              </div>
            </motion.div>

            <motion.div
              className="relative group overflow-hidden bg-gradient-to-br from-accent-50 to-purple-100 backdrop-blur-xl rounded-2xl border border-accent-200/60 p-6 shadow-xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.05, boxShadow: '0 12px 32px rgba(147, 51, 234, 0.3)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-accent-700">Avg Resolution Time</span>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  >
                    <Clock className="w-5 h-5 text-accent-600" />
                  </motion.div>
                </div>
                <div className="text-4xl font-bold text-purple-900">{metrics.avgResolutionTime.toFixed(1)}</div>
                <div className="text-xs text-accent-600 font-medium mt-1">days</div>
              </div>
            </motion.div>

            <motion.div
              className="relative group overflow-hidden bg-gradient-to-br from-green-50 to-green-100 backdrop-blur-xl rounded-2xl border border-green-200/60 p-6 shadow-xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05, boxShadow: '0 12px 32px rgba(34, 197, 94, 0.3)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/20 to-green-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-green-700">Queries per Trial</span>
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <BarChart3 className="w-5 h-5 text-green-600" />
                  </motion.div>
                </div>
                <div className="text-4xl font-bold text-green-900">
                  {metrics.activeTrials > 0 ? (metrics.totalQueries / metrics.activeTrials).toFixed(1) : '0'}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Support details placeholder - Enhanced */}
          <motion.div
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/60 p-8 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">Support Query Breakdown</h3>
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </motion.div>
                <p className="text-sm text-gray-600">Detailed support metrics coming soon...</p>
                <p className="text-xs text-gray-400 mt-2">Query categorization and trend analysis in development</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Conversion View - Enhanced */}
      {metricView === 'conversion' && (
        <motion.div
          className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/60 p-8 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900">Conversion Funnel</h3>
          </div>

          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <motion.div
                className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center shadow-xl"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <svg
                  className="w-12 h-12 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </motion.div>
              <p className="text-base font-medium text-gray-700 mb-2">Conversion tracking metrics coming soon...</p>
              <p className="text-sm text-gray-500 mb-4">Track trial-to-paid conversion rates and identify optimization opportunities</p>

              {/* Preview of upcoming features */}
              <div className="grid grid-cols-3 gap-3 mt-8">
                <motion.div
                  className="p-3 rounded-lg bg-blue-50 border border-blue-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <div className="text-xs font-medium text-blue-700">Trial Start</div>
                </motion.div>
                <motion.div
                  className="p-3 rounded-lg bg-purple-50 border border-purple-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Activity className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <div className="text-xs font-medium text-purple-700">Engagement</div>
                </motion.div>
                <motion.div
                  className="p-3 rounded-lg bg-green-50 border border-green-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <div className="text-xs font-medium text-green-700">Conversion</div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
