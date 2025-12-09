'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface ExecutionStats {
  total: number;
  successful: number;
  failed: number;
  avg_duration_ms: number;
  avg_confidence: number;
  positive_feedback: number;
  negative_feedback: number;
}

interface TemplateStats {
  template_id: string;
  template_name: string;
  template_key: string;
  category: string;
  stats: ExecutionStats;
}

export default function AIAnalyticsPage() {
  const { user, loading: authLoading, role, is_super_admin } = useAuth();

  const [stats, setStats] = useState<ExecutionStats | null>(null);
  const [templateStats, setTemplateStats] = useState<TemplateStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (user && (role === 'Admin' || is_super_admin)) {
      fetchStats();
    }
  }, [user, role, is_super_admin, days]);

  const fetchStats = async () => {
    try {
      // Fetch overall stats
      const response = await fetch(`/api/prompts/stats?days=${days}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats(data.data);

      // Fetch stats for each template
      const templatesResponse = await fetch('/api/prompts/templates?activeOnly=false');
      const templatesData = await templatesResponse.json();

      if (templatesResponse.ok && templatesData.data) {
        const templateStatsPromises = templatesData.data.map(async (template: {
          id: string;
          template_name: string;
          template_key: string;
          category: string;
        }) => {
          const statsRes = await fetch(`/api/prompts/stats?templateId=${template.id}&days=${days}`);
          const statsData = await statsRes.json();
          return {
            template_id: template.id,
            template_name: template.template_name,
            template_key: template.template_key,
            category: template.category,
            stats: statsData.data,
          };
        });

        const allTemplateStats = await Promise.all(templateStatsPromises);
        // Filter to only templates with executions
        setTemplateStats(allTemplateStats.filter(t => t.stats.total > 0));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const successRate = stats && stats.total > 0
    ? ((stats.successful / stats.total) * 100).toFixed(1)
    : '0';

  const feedbackScore = stats && (stats.positive_feedback + stats.negative_feedback) > 0
    ? ((stats.positive_feedback / (stats.positive_feedback + stats.negative_feedback)) * 100).toFixed(1)
    : 'N/A';

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || (role !== 'Admin' && !is_super_admin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-sm text-gray-500">Unauthorized - Admin access required</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI Analytics
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Monitor AI performance and user feedback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-9 px-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-9 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Executions"
            value={stats?.total.toLocaleString() || '0'}
            icon={<Sparkles className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            label="Success Rate"
            value={`${successRate}%`}
            icon={parseFloat(successRate) >= 90 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            color={parseFloat(successRate) >= 90 ? 'green' : 'yellow'}
            subtext={`${stats?.successful || 0} successful, ${stats?.failed || 0} failed`}
          />
          <StatCard
            label="Avg Duration"
            value={`${stats?.avg_duration_ms || 0}ms`}
            icon={<Clock className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Feedback Score"
            value={feedbackScore === 'N/A' ? feedbackScore : `${feedbackScore}%`}
            icon={<ThumbsUp className="w-5 h-5" />}
            color={feedbackScore === 'N/A' || parseFloat(feedbackScore) >= 70 ? 'green' : 'red'}
            subtext={`${stats?.positive_feedback || 0} positive, ${stats?.negative_feedback || 0} negative`}
          />
        </div>

        {/* Confidence Score */}
        {stats && stats.avg_confidence > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
              Average Confidence Score
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    stats.avg_confidence >= 0.8
                      ? 'bg-green-500'
                      : stats.avg_confidence >= 0.6
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.avg_confidence * 100}%` }}
                />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {(stats.avg_confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* Per-Template Stats */}
        {templateStats.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Performance by Template
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {templateStats.map((template) => {
                const templateSuccessRate = template.stats.total > 0
                  ? ((template.stats.successful / template.stats.total) * 100).toFixed(1)
                  : '0';

                return (
                  <div
                    key={template.template_id}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {template.template_name}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}>
                            {template.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                          {template.template_key}
                        </p>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {template.stats.total}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">executions</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-medium ${
                            parseFloat(templateSuccessRate) >= 90
                              ? 'text-green-600'
                              : parseFloat(templateSuccessRate) >= 70
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}>
                            {templateSuccessRate}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">success</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {template.stats.avg_duration_ms}ms
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">avg time</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-green-600">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>{template.stats.positive_feedback}</span>
                          </div>
                          <div className="flex items-center gap-1 text-red-600">
                            <ThumbsDown className="w-3.5 h-3.5" />
                            <span>{template.stats.negative_feedback}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {templateStats.length === 0 && stats?.total === 0 && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-400">No AI executions recorded yet</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
              Analytics will appear once AI features are used
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'yellow' | 'blue' | 'red';
  subtext?: string;
}

function StatCard({ label, value, icon, color, subtext }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'extraction':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'analysis':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'generation':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'summarization':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
}
