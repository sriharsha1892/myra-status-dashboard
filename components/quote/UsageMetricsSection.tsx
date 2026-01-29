'use client';

import { useState } from 'react';
import {
  Activity,
  DollarSign,
  Users,
  MessageSquare,
  Loader2,
  TrendingUp,
  Building,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { useUsageStats } from '@/hooks/useMyraUsageParser';

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function UsageMetricsSection() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useUsageStats(days);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-neutral-500" />
          <h3 className="text-lg font-semibold text-neutral-900">
            myRA Usage Metrics
          </h3>
        </div>
        <p className="text-neutral-500 text-center py-8">
          No usage data available. Use the parser above to import usage data.
        </p>
      </div>
    );
  }

  const { summary, byDate, topUsers } = data;

  // Show empty state if no data
  const hasData = summary.total_conversations > 0;

  // Prepare chart data
  const chartData = (byDate || [])
    .slice(0, 14)
    .reverse()
    .map((d) => ({
      date: formatDate(d.usage_date),
      conversations: d.conversation_count,
      cost: d.total_cost,
    }));

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-500" />
          myRA Usage Metrics
        </h3>
        {hasData && (
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-1.5 text-sm bg-neutral-100 border border-neutral-200 rounded-lg"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Activity className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-neutral-600 font-medium mb-1">No usage data yet</p>
          <p className="text-sm text-neutral-500 max-w-sm">
            Import myRA usage data using the bookmarklet or paste usage text in the parser above.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-600 font-medium">
                  Conversations
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-900">
                {summary.total_conversations.toLocaleString()}
              </p>
              <p className="text-xs text-amber-600/70 mt-1">
                {summary.conversations_last_7_days} this week
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-emerald-600 font-medium">
                  Total Cost
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-900">
                {formatCurrency(summary.total_cost || 0)}
              </p>
              <p className="text-xs text-emerald-600/70 mt-1">
                {formatCurrency(summary.cost_last_7_days || 0)} this week
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">
                  Active Users
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {summary.total_users}
              </p>
              <p className="text-xs text-blue-600/70 mt-1">across platform</p>
            </div>

            <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-4 h-4 text-violet-600" />
                <span className="text-xs text-violet-600 font-medium">
                  Organizations
                </span>
              </div>
              <p className="text-2xl font-bold text-violet-900">
                {summary.total_orgs}
              </p>
              <p className="text-xs text-violet-600/70 mt-1">with usage data</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Trend */}
            {chartData.length > 0 && (
              <div className="bg-neutral-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-neutral-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Daily Usage Trend
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'cost' ? `$${value.toFixed(2)}` : value,
                          name === 'cost' ? 'Cost' : 'Conversations',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="conversations"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top Users */}
            {topUsers && topUsers.length > 0 && (
              <div className="bg-neutral-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-neutral-700 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Top Users by Cost
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topUsers.slice(0, 5).map((u) => ({
                        name:
                          u.user_name.length > 12
                            ? u.user_name.slice(0, 12) + '...'
                            : u.user_name,
                        cost: u.total_cost,
                        count: u.conversation_count,
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                      />
                      <Bar dataKey="cost" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Top Users Table */}
          {topUsers && topUsers.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-neutral-700 mb-3">
                User Breakdown
              </h4>
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">
                        User
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">
                        Organization
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">
                        Conversations
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.slice(0, 10).map((user, i) => (
                      <tr key={i} className="border-t border-neutral-100">
                        <td className="px-4 py-2 font-medium text-neutral-900">
                          {user.user_name}
                        </td>
                        <td className="px-4 py-2 text-neutral-600">
                          {user.org_name || (
                            <span className="text-neutral-400 italic">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-neutral-700">
                          {user.conversation_count}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-neutral-900">
                          ${user.total_cost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
