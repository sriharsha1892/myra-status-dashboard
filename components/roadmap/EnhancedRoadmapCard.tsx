'use client';

import { useState } from 'react';
import { Clock, AlertCircle, TrendingUp, TrendingDown, Minus, Calendar, User, UserPlus, Edit3, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  estimated_hours?: number;
  actual_hours?: number;
  progress_percentage?: number;
  assigned_to?: string;
  target_date?: string;
  last_activity_at?: string;
  days_since_activity?: number;
}

interface EnhancedRoadmapCardProps {
  item: RoadmapItem;
  onClick: () => void;
}

export default function EnhancedRoadmapCard({ item, onClick }: EnhancedRoadmapCardProps) {
  // Calculate estimate variance
  const estimateVariance = item.estimated_hours && item.actual_hours
    ? ((item.actual_hours - item.estimated_hours) / item.estimated_hours * 100)
    : null;

  // Determine if stale (5+ days no activity)
  const isStale = (item.days_since_activity ?? 0) >= 5;
  const isVeryStale = (item.days_since_activity ?? 0) >= 7;

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in_progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'planned': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-slate-50 text-slate-700 border-slate-200';
      default: return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-amber-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <div
      className="group relative bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Stale indicator bar */}
      {isStale && (
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${isVeryStale ? 'bg-red-500' : 'bg-orange-500'}`} />
      )}

      <div className="p-3">
        {/* Header: Title + Status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <button
            onClick={onClick}
            className="flex-1 text-left group-hover:text-blue-600 transition-colors duration-200"
          >
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
              {item.title}
            </h3>
          </button>

          <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${getStatusColor(item.status)}`}>
            {item.status.replace('_', ' ')}
          </span>
        </div>

        {/* Time Tracking Section */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {/* Estimated */}
          <div className="bg-slate-50 rounded p-1.5 border border-slate-200">
            <div className="flex items-center gap-1 mb-0.5">
              <Clock className="w-3 h-3 text-slate-400" strokeWidth={2} />
              <span className="text-[9px] text-slate-600 font-medium uppercase tracking-wide">Est</span>
            </div>
            <p className="text-sm font-bold text-slate-900">
              {item.estimated_hours ? `${item.estimated_hours}h` : '-'}
            </p>
          </div>

          {/* Actual */}
          <div className="bg-blue-50 rounded p-1.5 border border-blue-200">
            <div className="flex items-center gap-1 mb-0.5">
              <Clock className="w-3 h-3 text-blue-600" strokeWidth={2} />
              <span className="text-[9px] text-blue-700 font-medium uppercase tracking-wide">Act</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-sm font-bold text-blue-900">
                {item.actual_hours ? `${item.actual_hours}h` : '0h'}
              </p>
              {estimateVariance !== null && (
                <span className={`text-xs font-semibold ${estimateVariance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {estimateVariance > 0 ? (
                    <span className="flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" strokeWidth={2} />
                      +{Math.abs(estimateVariance).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <TrendingDown className="w-3 h-3" strokeWidth={2} />
                      {estimateVariance.toFixed(0)}%
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="bg-purple-50 rounded p-1.5 border border-purple-200">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className="w-3 h-3 text-purple-600" strokeWidth={2} />
              <span className="text-[9px] text-purple-700 font-medium uppercase tracking-wide">Prog</span>
            </div>
            <p className="text-sm font-bold text-purple-900">
              {item.progress_percentage ?? 0}%
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${item.progress_percentage ?? 0}%` }}
            />
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center justify-between text-[10px] text-slate-600 mb-2">
          <div className="flex items-center gap-3">
            {item.assigned_to && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" strokeWidth={2} />
                <span>{item.assigned_to}</span>
              </div>
            )}

            {item.target_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Due {new Date(item.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* Priority Badge */}
          <span className={`font-semibold ${getPriorityColor(item.priority)}`}>
            {item.priority.toUpperCase()}
          </span>
        </div>

        {/* Last Activity + Hover Quick Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {isStale && (
              <div className="flex items-center gap-1 text-amber-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Stale</span>
              </div>
            )}
            {item.last_activity_at && (
              <span>
                Last: {formatDistanceToNow(new Date(item.last_activity_at), { addSuffix: true })}
              </span>
            )}
          </div>

          {/* Quick Actions - Hover Reveal */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Assign:', item.id);
              }}
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
              title="Assign"
            >
              <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Edit:', item.id);
              }}
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
              title="Edit"
            >
              <Edit3 className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Comment:', item.id);
              }}
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
              title="Comment"
            >
              <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Estimate Variance Warning */}
        {estimateVariance !== null && Math.abs(estimateVariance) > 25 && (
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" strokeWidth={2} />
            <p className="text-xs text-amber-800">
              {estimateVariance > 0
                ? `Over estimate by ${Math.abs(estimateVariance).toFixed(0)}% (${Math.abs(item.actual_hours! - item.estimated_hours!).toFixed(1)}h)`
                : `Under estimate by ${Math.abs(estimateVariance).toFixed(0)}%`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
