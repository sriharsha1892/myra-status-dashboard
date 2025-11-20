'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Target, TrendingUp } from 'lucide-react';
import { TimelineItem } from './TimelineItem';

interface RoadmapItem {
  id: string;
  title: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetDate?: Date | string | null;
  progressPercentage?: number;
  ownerName?: string | null;
  orgCount?: number;
  maxPriorityLevel?: number;
  linkTypes?: string[];
}

interface MacroGoalLaneProps {
  category: string;
  categoryDescription?: string;
  items: RoadmapItem[];
  defaultExpanded?: boolean;
  onItemClick?: (itemId: string) => void;
  className?: string;
}

/**
 * MacroGoalLane Component
 *
 * Expandable swimlane for strategic categories in the timeline view.
 * Features:
 * - Collapsible header with aggregate stats
 * - Progress rollup from child items
 * - Item count and completion metrics
 * - Color-coded category indicators
 * - Density heatmap visualization
 */
export function MacroGoalLane({
  category,
  categoryDescription,
  items,
  defaultExpanded = true,
  onItemClick,
  className = '',
}: MacroGoalLaneProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate aggregate statistics
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.status === 'completed').length;
  const inProgressItems = items.filter((item) => item.status === 'in_progress').length;
  const avgProgress =
    totalItems > 0
      ? Math.round(
          items.reduce((sum, item) => sum + (item.progressPercentage || 0), 0) / totalItems
        )
      : 0;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Category color scheme
  const getCategoryColor = () => {
    const colors: Record<string, string> = {
      'Datasets Expansion': 'purple',
      'Enterprise Integrations': 'blue',
      'Feature Development': 'green',
      'Platform Optimizations': 'orange',
      'Expert Insights Network': 'pink',
      'Survey Panels Integration': 'cyan',
    };

    const color = colors[category] || 'slate';

    return {
      bg: `bg-${color}-50`,
      border: `border-${color}-300`,
      text: `text-${color}-900`,
      accentBg: `bg-${color}-500`,
      lightBg: `bg-${color}-100`,
      darkText: `text-${color}-700`,
    };
  };

  const colors = getCategoryColor();

  return (
    <div className={`border-2 border-slate-200 rounded-lg overflow-hidden ${className}`}>
      {/* Lane Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full px-4 py-3 flex items-center justify-between gap-4
          ${colors.bg} hover:opacity-90 transition-all duration-200
          border-b-2 border-slate-200
        `}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Expand/collapse icon */}
          {isExpanded ? (
            <ChevronDown className={`w-5 h-5 ${colors.darkText} flex-shrink-0`} />
          ) : (
            <ChevronRight className={`w-5 h-5 ${colors.darkText} flex-shrink-0`} />
          )}

          {/* Category indicator */}
          <div className={`w-1 h-8 ${colors.accentBg} rounded-full flex-shrink-0`} />

          {/* Category title */}
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Target className={`w-4 h-4 ${colors.darkText} flex-shrink-0`} />
              <h3 className={`font-bold text-base ${colors.text} truncate`}>{category}</h3>
            </div>
            {categoryDescription && (
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                {categoryDescription}
              </p>
            )}
          </div>
        </div>

        {/* Stats summary */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Item count */}
          <div className="text-center">
            <div className={`text-lg font-bold ${colors.text}`}>{totalItems}</div>
            <div className="text-xs text-slate-600">Items</div>
          </div>

          {/* Progress */}
          <div className="text-center">
            <div className={`text-lg font-bold ${colors.text}`}>{avgProgress}%</div>
            <div className="text-xs text-slate-600">Progress</div>
          </div>

          {/* Completion rate */}
          <div className="text-center">
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold ${colors.text}`}>{completedItems}</span>
              <span className="text-sm text-slate-500">/ {totalItems}</span>
            </div>
            <div className="text-xs text-slate-600">Done</div>
          </div>

          {/* In progress indicator */}
          {inProgressItems > 0 && (
            <div className={`px-2 py-1 ${colors.lightBg} rounded-full`}>
              <div className="flex items-center gap-1">
                <TrendingUp className={`w-3 h-3 ${colors.darkText}`} />
                <span className={`text-xs font-medium ${colors.darkText}`}>
                  {inProgressItems} active
                </span>
              </div>
            </div>
          )}
        </div>
      </button>

      {/* Lane Content */}
      {isExpanded && (
        <div className="p-4 bg-white">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Overall Progress</span>
              <span className="font-medium">{completionRate}% complete</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors.accentBg} transition-all duration-500`}
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Items grid */}
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map((item) => (
                <TimelineItem
                  key={item.id}
                  {...item}
                  onClick={() => onItemClick?.(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No items in this category yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
