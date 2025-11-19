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
  count: number;
}

interface StatusData {
  status: string;
  count: number;
}

const STATUS_COLORS = {
  open: '#ef4444', // red
  investigating: '#f59e0b', // amber
  resolved: '#10b981', // green
  ignored: '#6b7280', // gray
};

const TYPE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#84cc16'];
const CONTEXT_COLORS = ['#06b6d4', '#8b5cf6', '#f43f5e', '#eab308', '#22c55e', '#a855f7'];

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
        .select('*')
        .order('count', { ascending: false })
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
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-900 dark:text-red-100">{error}</p>
        <button
          onClick={fetchChartData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Daily Error Trends */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Daily Error Trends (Last 30 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              tick={{ fill: '#6b7280' }}
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
              }}
              labelFormatter={(date) => {
                const d = new Date(date);
                return d.toLocaleDateString();
              }}
            />
            <Legend wrapperStyle={{ color: '#9ca3af' }} />
            <Line
              type="monotone"
              dataKey="error_count"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Errors"
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Errors by Type */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Errors by Type
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="error_type"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                }}
              />
              <Bar dataKey="count" name="Count">
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Errors by Context */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Errors by Context
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={contextData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="context"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                }}
              />
              <Bar dataKey="count" name="Count">
                {contextData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CONTEXT_COLORS[index % CONTEXT_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Status Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ status, percent }) =>
                `${status}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={100}
              fill="#8884d8"
              dataKey="count"
              nameKey="status"
            >
              {statusData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#6b7280'}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
              }}
            />
            <Legend
              wrapperStyle={{ color: '#9ca3af' }}
              formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
