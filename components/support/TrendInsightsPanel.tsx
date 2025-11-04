'use client';

import { useMemo } from 'react';
import { Database } from '@/lib/supabase/types';
import { calculateWeeklyStats, generateInsights, TrendInsight } from '@/lib/analytics/categoryTrends';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface TrendInsightsPanelProps {
  tickets: Ticket[];
  period: string;
}

export default function TrendInsightsPanel({ tickets, period }: TrendInsightsPanelProps) {
  // Calculate insights
  const insights = useMemo(() => {
    const stats = calculateWeeklyStats(tickets);
    return generateInsights(stats);
  }, [tickets]);

  // Get icon for insight type
  const getInsightIcon = (type: TrendInsight['type']) => {
    switch (type) {
      case 'growing':
        return '↑';
      case 'active':
        return '●';
      case 'declining':
        return '↓';
      default:
        return '○';
    }
  };

  // Get color classes for insight type
  const getInsightColorClasses = (type: TrendInsight['type']) => {
    switch (type) {
      case 'growing':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'active':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'declining':
        return 'bg-green-50 border-green-200 text-green-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  // Get icon color classes for insight type
  const getIconColorClasses = (type: TrendInsight['type']) => {
    switch (type) {
      case 'growing':
        return 'text-red-600';
      case 'active':
        return 'text-blue-600';
      case 'declining':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (insights.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Trend Insights</h3>
        <p className="text-sm text-gray-500">
          No insights available yet. More data is needed to generate insights.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Trend Insights</h3>
        <span className="text-xs text-gray-500">This week vs last week</span>
      </div>

      <div className="space-y-2">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`border rounded-lg p-3 ${getInsightColorClasses(insight.type)}`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${getIconColorClasses(insight.type)}`}>
                {getInsightIcon(insight.type)}
              </span>
              <span className="text-sm font-medium">{insight.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <span className="text-red-600 font-bold">↑</span>
            <span>Growing</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-600 font-bold">●</span>
            <span>Most Active</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-600 font-bold">↓</span>
            <span>Declining</span>
          </div>
        </div>
      </div>
    </div>
  );
}
