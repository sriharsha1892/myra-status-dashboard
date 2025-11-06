'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Target,
  Calendar,
} from 'lucide-react';

interface RoadmapItem {
  id: string;
  title: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_date: string | null;
  estimated_completion_date: string | null;
  created_at: string;
  updated_at: string;
  blocked_by_ids: string[] | null;
}

interface RoadmapAnalyticsProps {
  items: RoadmapItem[];
}

const STATUS_COLORS = {
  planned: '#3B82F6',
  in_progress: '#F59E0B',
  completed: '#10B981',
  cancelled: '#6B7280',
};

const PRIORITY_COLORS = {
  low: '#9CA3AF',
  medium: '#3B82F6',
  high: '#F59E0B',
  critical: '#EF4444',
};

export default function RoadmapAnalytics({ items }: RoadmapAnalyticsProps) {
  const analytics = useMemo(() => {
    const total = items.length;
    const byStatus = {
      planned: items.filter((i) => i.status === 'planned').length,
      in_progress: items.filter((i) => i.status === 'in_progress').length,
      completed: items.filter((i) => i.status === 'completed').length,
      cancelled: items.filter((i) => i.status === 'cancelled').length,
    };

    const byPriority = {
      low: items.filter((i) => i.priority === 'low').length,
      medium: items.filter((i) => i.priority === 'medium').length,
      high: items.filter((i) => i.priority === 'high').length,
      critical: items.filter((i) => i.priority === 'critical').length,
    };

    const blockedItems = items.filter(
      (item) =>
        item.blocked_by_ids &&
        item.blocked_by_ids.length > 0 &&
        items.some(
          (blocker) =>
            item.blocked_by_ids?.includes(blocker.id) && blocker.status !== 'completed'
        )
    );

    const overdue = items.filter((item) => {
      if (!item.target_date || item.status === 'completed' || item.status === 'cancelled')
        return false;
      return new Date(item.target_date) < new Date();
    });

    const completionRate = total > 0 ? (byStatus.completed / total) * 100 : 0;

    // Timeline data (items by month)
    const timelineMap = new Map<string, { planned: number; completed: number }>();
    items.forEach((item) => {
      if (item.target_date) {
        const month = new Date(item.target_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });
        const existing = timelineMap.get(month) || { planned: 0, completed: 0 };
        existing.planned++;
        if (item.status === 'completed') {
          existing.completed++;
        }
        timelineMap.set(month, existing);
      }
    });

    const timelineData = Array.from(timelineMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months

    return {
      total,
      byStatus,
      byPriority,
      blockedItems: blockedItems.length,
      overdue: overdue.length,
      completionRate,
      timelineData,
    };
  }, [items]);

  const statusData = [
    { name: 'Planned', value: analytics.byStatus.planned, color: STATUS_COLORS.planned },
    {
      name: 'In Progress',
      value: analytics.byStatus.in_progress,
      color: STATUS_COLORS.in_progress,
    },
    { name: 'Completed', value: analytics.byStatus.completed, color: STATUS_COLORS.completed },
    { name: 'Cancelled', value: analytics.byStatus.cancelled, color: STATUS_COLORS.cancelled },
  ].filter((item) => item.value > 0);

  const priorityData = [
    { name: 'Low', value: analytics.byPriority.low, color: PRIORITY_COLORS.low },
    { name: 'Medium', value: analytics.byPriority.medium, color: PRIORITY_COLORS.medium },
    { name: 'High', value: analytics.byPriority.high, color: PRIORITY_COLORS.high },
    { name: 'Critical', value: analytics.byPriority.critical, color: PRIORITY_COLORS.critical },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {analytics.completionRate.toFixed(0)}%
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
            <span>
              {analytics.byStatus.completed} of {analytics.total} completed
            </span>
          </div>
        </div>

        {/* Blocked Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Blocked Items</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{analytics.blockedItems}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {analytics.blockedItems > 0 ? 'Requires attention' : 'All clear'}
          </div>
        </div>

        {/* Overdue Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{analytics.overdue}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {analytics.overdue > 0 ? 'Past target date' : 'On track'}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Timeline Chart */}
      {analytics.timelineData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="planned" name="Planned" fill="#3B82F6" />
              <Bar dataKey="completed" name="Completed" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Status Breakdown Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700">Planned</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-gray-900">
                {analytics.byStatus.planned}
              </span>
              <span className="text-sm text-gray-500">
                {((analytics.byStatus.planned / analytics.total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
              <span className="text-gray-700">In Progress</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-gray-900">
                {analytics.byStatus.in_progress}
              </span>
              <span className="text-sm text-gray-500">
                {((analytics.byStatus.in_progress / analytics.total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-gray-700">Completed</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-gray-900">
                {analytics.byStatus.completed}
              </span>
              <span className="text-sm text-gray-500">
                {((analytics.byStatus.completed / analytics.total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Cancelled</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-gray-900">
                {analytics.byStatus.cancelled}
              </span>
              <span className="text-sm text-gray-500">
                {((analytics.byStatus.cancelled / analytics.total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
