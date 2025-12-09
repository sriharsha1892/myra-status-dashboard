// myRA Usage Widget - Display comprehensive myRA AI activity stats
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import {
  Sparkles,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  ChevronRight,
  Zap,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays } from 'date-fns';
import Link from 'next/link';

interface MyraStats {
  total_insights: number;
  active_users: number;
  total_cost: number;
  insights_last_7_days: number;
  insights_last_30_days: number;
  most_recent_activity: string | null;
  top_categories: Array<{ category: string; count: number }>;
  user_breakdown: Array<{ user_name: string; insight_count: number }>;
}

interface MyraUsageWidgetProps {
  orgId: string;
  variant?: 'compact' | 'expanded';
}

export default function MyraUsageWidget({
  orgId,
  variant = 'compact',
}: MyraUsageWidgetProps) {
  const [stats, setStats] = useState<MyraStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchMyraStats();
  }, [orgId]);

  const fetchMyraStats = async () => {
    try {
      setLoading(true);

      // Fetch all platform queries for this org
      const { data: queries, error } = await supabase
        .from('platform_queries')
        .select(
          `
          query_id,
          insight_title,
          category,
          cost_usd,
          created_at,
          user_id,
          trial_users (
            name,
            email
          )
        `
        )
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching myRA stats:', error);
        setLoading(false);
        return;
      }

      if (!queries || queries.length === 0) {
        setStats({
          total_insights: 0,
          active_users: 0,
          total_cost: 0,
          insights_last_7_days: 0,
          insights_last_30_days: 0,
          most_recent_activity: null,
          top_categories: [],
          user_breakdown: [],
        });
        setLoading(false);
        return;
      }

      // Calculate statistics
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      const thirtyDaysAgo = subDays(now, 30);

      const total_insights = queries.length;
      const total_cost = queries.reduce((sum, q) => sum + (q.cost_usd || 0), 0);

      const insights_last_7_days = queries.filter(
        (q) => new Date(q.created_at) >= sevenDaysAgo
      ).length;

      const insights_last_30_days = queries.filter(
        (q) => new Date(q.created_at) >= thirtyDaysAgo
      ).length;

      const uniqueUserIds = new Set(queries.map((q) => q.user_id).filter(Boolean));
      const active_users = uniqueUserIds.size;

      const most_recent_activity = queries.length > 0 ? queries[0].created_at : null;

      // Top categories
      const categoryCount: { [key: string]: number } = {};
      queries.forEach((q) => {
        if (q.category) {
          categoryCount[q.category] = (categoryCount[q.category] || 0) + 1;
        }
      });
      const top_categories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // User breakdown
      const userCount: { [key: string]: { name: string; count: number } } = {};
      queries.forEach((q) => {
        if (q.user_id) {
          const userName =
            (q.trial_users as any)?.name || (q.trial_users as any)?.email || 'Unknown';
          if (!userCount[q.user_id]) {
            userCount[q.user_id] = { name: userName, count: 0 };
          }
          userCount[q.user_id].count++;
        }
      });
      const user_breakdown = Object.values(userCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((u) => ({ user_name: u.name, insight_count: u.count }));

      setStats({
        total_insights,
        active_users,
        total_cost,
        insights_last_7_days,
        insights_last_30_days,
        most_recent_activity,
        top_categories,
        user_breakdown,
      });
    } catch (error) {
      console.error('Error calculating myRA stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-300 rounded"></div>
            <div className="h-20 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || stats.total_insights === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">myRA AI Activity</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-gray-600 mb-4">No myRA activity recorded yet</p>
          <p className="text-sm text-gray-500">
            Activity will appear here once insights are generated via screenshot import
          </p>
        </div>
      </motion.div>
    );
  }

  // Calculate trend (comparing last 7 days to previous 7 days)
  const previousSevenDays = stats.insights_last_30_days - stats.insights_last_7_days;
  const trend =
    previousSevenDays > 0
      ? ((stats.insights_last_7_days - previousSevenDays) / previousSevenDays) * 100
      : stats.insights_last_7_days > 0
      ? 100
      : 0;

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">myRA AI Activity</h3>
          </div>
          <Link
            href={`/support/trials/${orgId}?tab=platform-queries`}
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Insights */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-600 font-medium">Total Insights</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total_insights}</p>
            {stats.insights_last_7_days > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                +{stats.insights_last_7_days} this week
              </p>
            )}
          </div>

          {/* Active Users */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-600 font-medium">Active Users</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.active_users}</p>
            {stats.user_breakdown.length > 0 && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                Top: {stats.user_breakdown[0].user_name}
              </p>
            )}
          </div>

          {/* Weekly Trend */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp
                className={`w-4 h-4 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}
              />
              <p className="text-xs text-gray-600 font-medium">7-Day Trend</p>
            </div>
            <p
              className={`text-2xl font-bold ${
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend > 0 ? '+' : ''}
              {trend.toFixed(0)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">{stats.insights_last_7_days} insights</p>
          </div>

          {/* Total Cost */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-600 font-medium">Total Cost</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">${stats.total_cost.toFixed(2)}</p>
            {stats.total_insights > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                ${(stats.total_cost / stats.total_insights).toFixed(2)}/insight
              </p>
            )}
          </div>
        </div>

        {/* Last Activity */}
        {stats.most_recent_activity && (
          <div className="mt-4 pt-4 border-t border-purple-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Activity className="w-4 h-4" />
              <span>
                Last activity:{' '}
                <span className="font-medium text-gray-900">
                  {format(new Date(stats.most_recent_activity), 'MMM dd, yyyy h:mm a')}
                </span>
              </span>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Expanded variant with detailed breakdown
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">myRA AI Activity</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <Zap className="w-5 h-5 text-purple-600 mb-2" />
            <p className="text-xs text-gray-600 font-medium mb-1">Total Insights</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total_insights}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <Users className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-xs text-gray-600 font-medium mb-1">Active Users</p>
            <p className="text-3xl font-bold text-gray-900">{stats.active_users}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <TrendingUp
              className={`w-5 h-5 mb-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}
            />
            <p className="text-xs text-gray-600 font-medium mb-1">7-Day Trend</p>
            <p
              className={`text-3xl font-bold ${
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend > 0 ? '+' : ''}
              {trend.toFixed(0)}%
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <DollarSign className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-xs text-gray-600 font-medium mb-1">Total Cost</p>
            <p className="text-3xl font-bold text-gray-900">${stats.total_cost.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      {stats.top_categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Insight Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_categories.map((cat, index) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">{index + 1}</span>
                    <span className="text-sm text-gray-900 capitalize">
                      {cat.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${(cat.count / stats.total_insights) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 min-w-[3ch]">
                      {cat.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Users */}
      {stats.user_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.user_breakdown.map((user, index) => (
                <div key={user.user_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">{index + 1}</span>
                    <span className="text-sm text-gray-900">{user.user_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${(user.insight_count / stats.total_insights) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 min-w-[3ch]">
                      {user.insight_count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
