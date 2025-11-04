'use client';

import { useMemo, useState } from 'react';
import { Database } from '@/lib/supabase/types';
import { calculateWeeklyStats, CategoryStats } from '@/lib/analytics/categoryTrends';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface CategoryTrendsTableProps {
  tickets: Ticket[];
  onCategoryClick?: (category: string) => void;
}

type SortField = 'category' | 'thisWeek' | 'changePercent';
type SortDirection = 'asc' | 'desc';

export default function CategoryTrendsTable({ tickets, onCategoryClick }: CategoryTrendsTableProps) {
  const [sortField, setSortField] = useState<SortField>('thisWeek');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Calculate weekly stats
  const stats = useMemo(() => {
    return calculateWeeklyStats(tickets);
  }, [tickets]);

  // Sort stats
  const sortedStats = useMemo(() => {
    const sorted = [...stats];

    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === 'thisWeek') {
        comparison = a.thisWeek - b.thisWeek;
      } else if (sortField === 'changePercent') {
        comparison = a.changePercent - b.changePercent;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [stats, sortField, sortDirection]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Render arrow indicator
  const renderArrow = (stat: CategoryStats) => {
    if (stat.trend === 'up') {
      return <span className="text-red-600 font-medium">↑</span>;
    } else if (stat.trend === 'down') {
      return <span className="text-green-600 font-medium">↓</span>;
    } else {
      return <span className="text-gray-400 font-medium">→</span>;
    }
  };

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span className="text-gray-300">↕</span>;
    }
    return sortDirection === 'asc' ? <span className="text-gray-600">↑</span> : <span className="text-gray-600">↓</span>;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Table header */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Weekly Category Statistics</h3>
      </div>

      {/* Table */}
      {sortedStats.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-2">
                    Category
                    {renderSortIcon('category')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('thisWeek')}
                >
                  <div className="flex items-center gap-2">
                    This Week
                    {renderSortIcon('thisWeek')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Week
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('changePercent')}
                >
                  <div className="flex items-center gap-2">
                    Change
                    {renderSortIcon('changePercent')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStats.map((stat) => (
                <tr
                  key={stat.category}
                  onClick={() => onCategoryClick?.(stat.category)}
                  className="h-12 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stat.category}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                    {stat.thisWeek}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                    {stat.lastWeek}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium">
                    <span
                      className={
                        stat.trend === 'up'
                          ? 'text-red-600'
                          : stat.trend === 'down'
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }
                    >
                      {stat.changePercent > 0 ? '+' : ''}
                      {stat.changePercent}%
                    </span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm">
                    {renderArrow(stat)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-12 text-center text-sm text-gray-500">
          No category statistics available
        </div>
      )}

      {/* Footer note */}
      {sortedStats.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Click on a row to filter tickets by that category. Click column headers to sort.
          </p>
        </div>
      )}
    </div>
  );
}
