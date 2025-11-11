'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, TrendingDown, AlertCircle, Clock, Target, Zap, Users } from 'lucide-react';

interface ProductivityMetrics {
  totalHoursLogged: number;
  itemsCompleted: number;
  avgCompletionTime: number;
  staleItemsCount: number;
  overdueItemsCount: number;
  velocityTrend: number; // % change vs last week
  topContributors: Array<{
    user_id: string;
    name: string;
    hours: number;
  }>;
}

export default function VelocityDashboard() {
  const [metrics, setMetrics] = useState<ProductivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);

    try {
      // Fetch productivity metrics view
      const { data: items } = await supabase
        .from('roadmap_productivity_metrics')
        .select('*');

      if (!items) {
        setLoading(false);
        return;
      }

      // Fetch time logs for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentTimeLogs } = await supabase
        .from('roadmap_time_logs')
        .select('*, auth.users(email)')
        .gte('work_date', sevenDaysAgo.toISOString().split('T')[0]);

      // Calculate metrics
      const totalHours = recentTimeLogs?.reduce((sum, log) => sum + (log.hours_logged || 0), 0) || 0;
      const completed = items.filter(i => i.status === 'completed').length;
      const stale = items.filter(i => (i.days_since_activity ?? 0) >= 5).length;
      const overdue = items.filter(i => i.is_overdue).length;

      // Calculate average completion time for completed items
      const completedItems = items.filter(i => i.status === 'completed' && i.actual_hours);
      const avgTime = completedItems.length > 0
        ? completedItems.reduce((sum, item) => sum + (item.actual_hours || 0), 0) / completedItems.length
        : 0;

      // Group by user for top contributors
      const userHours = new Map<string, { name: string; hours: number }>();
      recentTimeLogs?.forEach(log => {
        const userId = log.user_id;
        const userEmail = (log as any)['auth.users']?.email || 'Unknown';
        const userName = userEmail.split('@')[0];

        if (!userHours.has(userId)) {
          userHours.set(userId, { name: userName, hours: 0 });
        }
        userHours.get(userId)!.hours += log.hours_logged || 0;
      });

      const topContributors = Array.from(userHours.entries())
        .map(([user_id, data]) => ({ user_id, ...data }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

      // Mock velocity trend for now (would need historical data)
      const velocityTrend = Math.floor(Math.random() * 40) - 10; // -10 to +30

      setMetrics({
        totalHoursLogged: totalHours,
        itemsCompleted: completed,
        avgCompletionTime: avgTime,
        staleItemsCount: stale,
        overdueItemsCount: overdue,
        velocityTrend,
        topContributors
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center animate-pulse">
            <TrendingUp className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
          </div>
          <h2 className="text-sm font-semibold text-neutral-900">Team Velocity</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-neutral-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl border border-neutral-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-sm">
            <TrendingUp className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Team Velocity</h2>
            <p className="text-xs text-neutral-500">Last 7 days</p>
          </div>
        </div>

        {/* Velocity Trend */}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${
          metrics.velocityTrend > 0
            ? 'bg-emerald-50 text-emerald-700'
            : metrics.velocityTrend < 0
            ? 'bg-red-50 text-red-700'
            : 'bg-neutral-50 text-neutral-700'
        }`}>
          {metrics.velocityTrend > 0 ? (
            <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />
          ) : metrics.velocityTrend < 0 ? (
            <TrendingDown className="w-3.5 h-3.5" strokeWidth={2} />
          ) : (
            <Clock className="w-3.5 h-3.5" strokeWidth={2} />
          )}
          <span className="text-xs font-semibold">
            {metrics.velocityTrend > 0 ? '+' : ''}{metrics.velocityTrend}%
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Total Hours */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-neutral-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" strokeWidth={2} />
            <span className="text-xs font-medium text-neutral-600">Total Hours</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{metrics.totalHoursLogged.toFixed(1)}h</p>
        </div>

        {/* Items Completed */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-neutral-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-emerald-600" strokeWidth={2} />
            <span className="text-xs font-medium text-neutral-600">Completed</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{metrics.itemsCompleted}</p>
        </div>

        {/* Avg Completion Time */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-neutral-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-accent-600" strokeWidth={2} />
            <span className="text-xs font-medium text-neutral-600">Avg Time</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{metrics.avgCompletionTime.toFixed(1)}h</p>
        </div>

        {/* Stale Items */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-neutral-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className={`w-4 h-4 ${metrics.staleItemsCount > 0 ? 'text-amber-600' : 'text-neutral-400'}`} strokeWidth={2} />
            <span className="text-xs font-medium text-neutral-600">Stale</span>
          </div>
          <p className={`text-2xl font-bold ${metrics.staleItemsCount > 0 ? 'text-amber-600' : 'text-neutral-900'}`}>
            {metrics.staleItemsCount}
          </p>
        </div>
      </div>

      {/* Top Contributors */}
      {metrics.topContributors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-neutral-600" strokeWidth={2} />
            <h3 className="text-xs font-semibold text-neutral-900">Top Contributors</h3>
          </div>

          <div className="space-y-2">
            {metrics.topContributors.map((contributor, index) => {
              const maxHours = metrics.topContributors[0].hours;
              const percentage = (contributor.hours / maxHours) * 100;

              return (
                <div key={contributor.user_id} className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-neutral-100 text-neutral-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-neutral-50 text-neutral-600'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Name + Hours */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-neutral-900 truncate">{contributor.name}</span>
                      <span className="text-xs font-bold text-neutral-700 ml-2">{contributor.hours.toFixed(1)}h</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          index === 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                          index === 1 ? 'bg-gradient-to-r from-slate-400 to-slate-500' :
                          index === 2 ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                          'bg-gradient-to-r from-blue-400 to-purple-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {(metrics.staleItemsCount > 0 || metrics.overdueItemsCount > 0) && (
        <div className="mt-5 pt-4 border-t border-neutral-200">
          <div className="space-y-2">
            {metrics.staleItemsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" strokeWidth={2} />
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">{metrics.staleItemsCount} item{metrics.staleItemsCount > 1 ? 's' : ''}</span> with no activity in 5+ days
                </p>
              </div>
            )}

            {metrics.overdueItemsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" strokeWidth={2} />
                <p className="text-xs text-red-800">
                  <span className="font-semibold">{metrics.overdueItemsCount} item{metrics.overdueItemsCount > 1 ? 's' : ''}</span> past due date
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
