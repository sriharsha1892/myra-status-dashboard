'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import RelativeTime from '@/components/ui/RelativeTime';
import {
  TrendingUp, TrendingDown, Activity, Users, FileText, MessageSquare,
  Calendar, AlertCircle, CheckCircle, Clock, BarChart3, Zap
} from 'lucide-react';

interface TrialUsageDashboardProps {
  trialOrgId: string;
  trialOrgName?: string;
}

interface UsageStats {
  totalLogins: number;
  totalQuestions: number;
  totalReports: number;
  totalActivities: number;
  recentActivities: any[];
  loginTrend: number; // % change from previous period
  questionTrend: number;
  reportTrend: number;
}

interface TrialInfo {
  org_name: string;
  status: string;
  trial_start_date: string;
  trial_end_date: string;
  users_count: number;
  primary_contact_name?: string;
}

export default function TrialUsageDashboard({ trialOrgId, trialOrgName }: TrialUsageDashboardProps) {
  const [stats, setStats] = useState<UsageStats>({
    totalLogins: 0,
    totalQuestions: 0,
    totalReports: 0,
    totalActivities: 0,
    recentActivities: [],
    loginTrend: 0,
    questionTrend: 0,
    reportTrend: 0,
  });
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchTrialInfo();
    fetchUsageStats();
  }, [trialOrgId]);

  const fetchTrialInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select(`
          org_name,
          status,
          trial_start_date,
          trial_end_date,
          users:users(count)
        `)
        .eq('org_id', trialOrgId)
        .single();

      if (error) throw error;

      setTrialInfo(data as any);
    } catch (error) {
      console.error('Error fetching trial info:', error);
    }
  };

  const fetchUsageStats = async () => {
    setLoading(true);
    try {
      // Fetch all activities for this trial org
      const { data: activities, error } = await supabase
        .from('trial_activities')
        .select('*')
        .eq('trial_org_id', trialOrgId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate stats
      const logins = activities?.filter(a => a.activity_type === 'user_login').length || 0;
      const questions = activities?.filter(a => a.activity_type === 'questions_asked')
        .reduce((sum, a) => sum + (a.metadata?.count || 1), 0) || 0;
      const reports = activities?.filter(a => a.activity_type === 'report_generated').length || 0;

      // Calculate trends (last 7 days vs previous 7 days)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const recentLogins = activities?.filter(a =>
        a.activity_type === 'user_login' &&
        new Date(a.created_at) >= sevenDaysAgo
      ).length || 0;

      const previousLogins = activities?.filter(a =>
        a.activity_type === 'user_login' &&
        new Date(a.created_at) >= fourteenDaysAgo &&
        new Date(a.created_at) < sevenDaysAgo
      ).length || 0;

      const loginTrend = previousLogins > 0
        ? ((recentLogins - previousLogins) / previousLogins) * 100
        : recentLogins > 0 ? 100 : 0;

      // Similar for questions and reports
      const recentQuestions = activities?.filter(a =>
        a.activity_type === 'questions_asked' &&
        new Date(a.created_at) >= sevenDaysAgo
      ).reduce((sum, a) => sum + (a.metadata?.count || 1), 0) || 0;

      const previousQuestions = activities?.filter(a =>
        a.activity_type === 'questions_asked' &&
        new Date(a.created_at) >= fourteenDaysAgo &&
        new Date(a.created_at) < sevenDaysAgo
      ).reduce((sum, a) => sum + (a.metadata?.count || 1), 0) || 0;

      const questionTrend = previousQuestions > 0
        ? ((recentQuestions - previousQuestions) / previousQuestions) * 100
        : recentQuestions > 0 ? 100 : 0;

      const recentReports = activities?.filter(a =>
        a.activity_type === 'report_generated' &&
        new Date(a.created_at) >= sevenDaysAgo
      ).length || 0;

      const previousReports = activities?.filter(a =>
        a.activity_type === 'report_generated' &&
        new Date(a.created_at) >= fourteenDaysAgo &&
        new Date(a.created_at) < sevenDaysAgo
      ).length || 0;

      const reportTrend = previousReports > 0
        ? ((recentReports - previousReports) / previousReports) * 100
        : recentReports > 0 ? 100 : 0;

      setStats({
        totalLogins: logins,
        totalQuestions: questions,
        totalReports: reports,
        totalActivities: activities?.length || 0,
        recentActivities: activities?.slice(0, 5) || [],
        loginTrend,
        questionTrend,
        reportTrend,
      });
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrialDaysRemaining = () => {
    if (!trialInfo?.trial_end_date) return null;
    const now = new Date();
    const endDate = new Date(trialInfo.trial_end_date);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getTrialDaysRemaining();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Trial Status */}
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10" />
        <div className="relative backdrop-blur-xl bg-white/70 dark:bg-slate-900/40 border border-white/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {trialOrgName || trialInfo?.org_name || 'Trial Usage Dashboard'}
              </h2>
              <div className="flex items-center gap-4 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  trialInfo?.status === 'active'
                    ? 'bg-green-500/20 text-green-700 border border-green-500/30'
                    : 'bg-slate-500/20 text-slate-700 border border-slate-500/30'
                }`}>
                  {trialInfo?.status || 'Unknown'}
                </span>
                {daysRemaining !== null && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    daysRemaining < 7
                      ? 'bg-red-500/20 text-red-700 border border-red-500/30'
                      : daysRemaining < 14
                      ? 'bg-yellow-500/20 text-yellow-700 border border-yellow-500/30'
                      : 'bg-blue-500/20 text-blue-700 border border-blue-500/30'
                  }`}>
                    <Clock className="w-4 h-4" />
                    {daysRemaining} days remaining
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats.totalActivities}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Total Activities
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Logins Card */}
        <StatCard
          title="User Logins"
          value={stats.totalLogins}
          trend={stats.loginTrend}
          icon={Users}
          color="blue"
        />

        {/* Questions Card */}
        <StatCard
          title="Questions Asked"
          value={stats.totalQuestions}
          trend={stats.questionTrend}
          icon={MessageSquare}
          color="purple"
        />

        {/* Reports Card */}
        <StatCard
          title="Reports Generated"
          value={stats.totalReports}
          trend={stats.reportTrend}
          icon={FileText}
          color="green"
        />
      </div>

      {/* Recent Activity */}
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />
        <div className="relative backdrop-blur-xl bg-white/70 dark:bg-slate-900/40 border border-white/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Recent Activity
            </h3>
          </div>

          {stats.recentActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No recent activities
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-xl backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-slate-200/30 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {activity.title}
                    </h4>
                    {activity.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {activity.description}
                      </p>
                    )}
                  </div>
                  <RelativeTime
                    date={activity.created_at}
                    className="text-xs text-slate-500 flex-shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  trend: number;
  icon: any;
  color: 'blue' | 'purple' | 'green';
}) {
  const colorMap = {
    blue: {
      bg: 'from-blue-500/20 to-blue-600/20',
      text: 'text-blue-600',
      border: 'border-blue-500/30',
    },
    purple: {
      bg: 'from-purple-500/20 to-purple-600/20',
      text: 'text-purple-600',
      border: 'border-purple-500/30',
    },
    green: {
      bg: 'from-green-500/20 to-green-600/20',
      text: 'text-green-600',
      border: 'border-green-500/30',
    },
  };

  const config = colorMap[color];
  const isPositiveTrend = trend >= 0;

  return (
    <div className="relative overflow-hidden rounded-3xl group">
      <div className={`absolute inset-0 bg-gradient-to-br ${config.bg} opacity-50 group-hover:opacity-70 transition-opacity`} />
      <div className="relative backdrop-blur-xl bg-white/70 dark:bg-slate-900/40 border border-white/20 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${config.bg} border ${config.border}`}>
            <Icon className={`w-6 h-6 ${config.text}`} />
          </div>
          {trend !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
              isPositiveTrend
                ? 'bg-green-500/20 text-green-700 border border-green-500/30'
                : 'bg-red-500/20 text-red-700 border border-red-500/30'
            }`}>
              {isPositiveTrend ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(Math.round(trend))}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className={`text-3xl font-bold ${config.text}`}>
            {value.toLocaleString()}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {title}
          </div>
          <div className="text-xs text-slate-500">
            vs. previous 7 days
          </div>
        </div>
      </div>
    </div>
  );
}
