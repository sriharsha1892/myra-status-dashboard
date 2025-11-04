'use client';

import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Database } from '@/lib/supabase/types';
import { calculateTrends, getCategories, getCategoryColor, Period } from '@/lib/analytics/categoryTrends';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface CategoryTrendsChartProps {
  tickets: Ticket[];
  period: Period;
  onPeriodChange: (period: Period) => void;
  onCategoryClick?: (category: string) => void;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

export default function CategoryTrendsChart({
  tickets,
  period,
  onPeriodChange,
  onCategoryClick,
}: CategoryTrendsChartProps) {
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());

  // Calculate trend data
  const trendData = useMemo(() => {
    return calculateTrends(tickets, period);
  }, [tickets, period]);

  // Get all categories
  const categories = useMemo(() => {
    return getCategories(tickets);
  }, [tickets]);

  // Handle line click
  const handleLineClick = (category: string) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    }
  };

  // Handle legend click to toggle category visibility
  const handleLegendClick = (entry: any) => {
    const category = entry.value;
    setActiveCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-xs font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload
            .sort((a: any, b: any) => b.value - a.value)
            .map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-gray-700">{entry.name}</span>
                </div>
                <span className="text-xs font-medium text-gray-900">{entry.value}</span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Check if category is visible
  const isCategoryVisible = (category: string) => {
    return activeCategories.size === 0 || activeCategories.has(category);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-900">Category Trends</h3>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`px-3 h-8 text-xs font-medium rounded-md transition-colors ${
                period === p.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {trendData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={{ stroke: '#e5e7eb' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              onClick={handleLegendClick}
              iconType="line"
            />
            {categories.map((category) => (
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                stroke={getCategoryColor(category)}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5, onClick: () => handleLineClick(category), cursor: 'pointer' }}
                hide={!isCategoryVisible(category)}
                animationDuration={500}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
          No trend data available for this period
        </div>
      )}

      {/* Help text */}
      <div className="mt-4 text-xs text-gray-500">
        Click on a legend item to show/hide categories. Click on a data point to filter by that category.
      </div>
    </div>
  );
}
