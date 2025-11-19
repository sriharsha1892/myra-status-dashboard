'use client';

/**
 * Error Trends Chart Component
 * Displays visualizations for error trends, types, contexts, and status distribution
 */

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
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
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface TrendData {
  date: string;
  error_count: number;
}

interface TypeData {
  error_type: string;
  count: number;
}

interface ContextData {
  context: string;
  total_errors: number;
}

interface StatusData {
  status: string;
  count: number;
}

const STATUS_COLORS = {
  open: '#ef4444',
  investigating: '#f59e0b',
  resolved: '#10b981',
  ignored: '#9ca3af',
  duplicate: '#6366f1',
};

const TYPE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#84cc16', '#6366f1', '#f59e0b'];
const CONTEXT_COLORS = ['#06b6d4', '#8b5cf6', '#f43f5e', '#eab308', '#22c55e', '#a855f7', '#f97316', '#14b8a6'];

export function ErrorTrendsChart() {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [typeData, setTypeData] = useState<TypeData[]>([]);
  const [contextData, setContextData] = useState<ContextData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Fetch daily trends (last 30 days)
      const { data: trends, error: trendsError } = await supabase
        .from('error_trends_daily')
        .select('*')
        .order('date', { ascending: true });

      if (trendsError) throw trendsError;

      // Fetch errors by type
      const { data: types, error: typesError } = await supabase
        .from('error_summary_by_type')
        .select('*')
        .order('count', { ascending: false })
        .limit(10);

      if (typesError) throw typesError;

      // Fetch errors by context
      const { data: contexts, error: contextsError } = await supabase
        .from('error_summary_by_context')
        .select('context, total_errors')
        .order('total_errors', { ascending: false })
        .limit(10);

      if (contextsError) throw contextsError;

      // Fetch status distribution (manual query)
      const { data: statuses, error: statusesError } = await supabase
        .from('error_reports')
        .select('status')
        .is('deleted_at', null);

      if (statusesError) throw statusesError;

      // Calculate status counts
      const statusCounts: Record<string, number> = {};
      statuses?.forEach((item) => {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      });

      const statusArray = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      }));

      setTrendData(trends || []);
      setTypeData(types || []);
      setContextData(contexts || []);
      setStatusData(statusArray);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-900 font-medium">{error}</p>
        <button
          onClick={fetchChartData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Error Trends */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Daily Error Trends</h3>
          <p className="text-sm text-gray-600 mt-1">Error occurrences over the last 30 days</p>
        </div>
        {trendData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No trend data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
              />
              <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: '#111827', fontWeight: 600 }}
                itemStyle={{ color: '#6b7280' }}
                labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="error_count"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Errors"
                dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Errors by Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Errors by Type</h3>
            <p className="text-sm text-gray-600 mt-1">Top 10 error types</p>
          </div>
          {typeData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No error type data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData} margin={{ top: 5, right: 20, left: 0, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="error_type"
                  stroke="#9ca3af"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar dataKey="count" name="Count" radius={[8, 8, 0, 0]}>
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Errors by Context */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Errors by Context</h3>
            <p className="text-sm text-gray-600 mt-1">Top 10 error contexts</p>
          </div>
          {contextData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No context data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={contextData} margin={{ top: 5, right: 20, left: 0, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="context"
                  stroke="#9ca3af"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                />
                <Bar dataKey="total_errors" name="Errors" radius={[8, 8, 0, 0]}>
                  {contextData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CONTEXT_COLORS[index % CONTEXT_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Status Distribution</h3>
          <p className="text-sm text-gray-600 mt-1">Current error status breakdown</p>
        </div>
        {statusData.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-gray-500">
            No status data available
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={{
                    stroke: '#9ca3af',
                    strokeWidth: 1,
                  }}
                  label={({ status, percent }) =>
                    `${status.charAt(0).toUpperCase() + status.slice(1)}: ${(percent * 100).toFixed(1)}%`
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#9ca3af'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
