'use client';

import { useState, useMemo } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

interface TimelineItem {
  id: string;
  title: string;
  target_date?: string;
  estimated_completion_date?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress_percentage?: number;
  owner_name?: string;
  linked_feature_count?: number;
  forwarded_feature_count?: number;
}

interface RoadmapTimelineViewProps {
  items: TimelineItem[];
  onItemClick: (id: string) => void;
}

const STATUS_COLOR = {
  planned: 'bg-blue-100 border-blue-300',
  in_progress: 'bg-yellow-100 border-yellow-300',
  completed: 'bg-green-100 border-green-300',
  cancelled: 'bg-gray-100 border-gray-300',
};

const PRIORITY_COLOR = {
  low: 'border-l-4 border-l-green-500',
  medium: 'border-l-4 border-l-yellow-500',
  high: 'border-l-4 border-l-red-500',
  critical: 'border-l-4 border-l-red-700',
};

const STATUS_ICON = {
  planned: '📋',
  in_progress: '🚀',
  completed: '✅',
  cancelled: '⛔',
};

export default function RoadmapTimelineView({ items, onItemClick }: RoadmapTimelineViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group items by month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const itemsInMonth = useMemo(() => {
    return items.filter((item) => {
      if (!item.target_date) return false;
      const itemDate = new Date(item.target_date);
      return isSameMonth(itemDate, currentMonth);
    });
  }, [items, currentMonth]);

  // Create week view data
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  // Fill in previous month's days to start week on Sunday
  const firstDayOfWeek = monthStart.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    currentWeek.push(new Date(monthStart.getTime() - (i + 1) * 24 * 60 * 60 * 1000));
  }

  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Fill remaining days to complete the last week
  if (currentWeek.length > 0) {
    const daysToAdd = 7 - currentWeek.length;
    for (let i = 1; i <= daysToAdd; i++) {
      currentWeek.push(new Date(monthEnd.getTime() + i * 24 * 60 * 60 * 1000));
    }
    weeks.push(currentWeek);
  }

  const getItemsForDate = (date: Date) => {
    return itemsInMonth.filter((item) => {
      if (!item.target_date) return false;
      return isSameDay(new Date(item.target_date), date);
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
        >
          ← Previous
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
        >
          Next →
        </button>
      </div>

      {/* Calendar Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{itemsInMonth.length}</div>
          <div className="text-xs text-blue-700">Items this month</div>
        </div>
        <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">
            {itemsInMonth.filter((i) => i.status === 'in_progress').length}
          </div>
          <div className="text-xs text-yellow-700">In Progress</div>
        </div>
        <div className="p-2 bg-green-50 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">
            {itemsInMonth.filter((i) => i.status === 'completed').length}
          </div>
          <div className="text-xs text-green-700">Completed</div>
        </div>
        <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">
            {itemsInMonth.reduce((sum, i) => sum + (i.forwarded_feature_count || 0), 0)}
          </div>
          <div className="text-xs text-purple-700">Forwarded Features</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="space-y-1">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIdx) => {
                const dayItems = getItemsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-24 p-1 rounded border ${
                      isCurrentMonth
                        ? 'bg-white border-gray-200 hover:bg-gray-50'
                        : 'bg-gray-50 border-gray-100'
                    } transition-all`}
                  >
                    <div className={`text-xs font-semibold ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'} mb-1`}>
                      {format(day, 'd')}
                    </div>

                    {/* Items on this day */}
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onItemClick(item.id)}
                          className={`text-xs p-1 rounded cursor-pointer hover:shadow-md transition-all border ${PRIORITY_COLOR[item.priority]} ${STATUS_COLOR[item.status]}`}
                        >
                          <div className="flex items-start gap-0.5">
                            <span className="text-xs flex-shrink-0">{STATUS_ICON[item.status]}</span>
                            <span className="font-medium line-clamp-2 flex-1">{item.title}</span>
                          </div>

                          {/* Progress bar */}
                          {item.progress_percentage !== undefined && item.progress_percentage > 0 && (
                            <div className="mt-0.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getProgressColor(item.progress_percentage)} transition-all`}
                                style={{ width: `${item.progress_percentage}%` }}
                              />
                            </div>
                          )}

                          {/* Owner */}
                          {item.owner_name && (
                            <div className="text-xs text-gray-600 mt-0.5 truncate">👤 {item.owner_name}</div>
                          )}

                          {/* Forwarded indicator */}
                          {item.forwarded_feature_count && item.forwarded_feature_count > 0 && (
                            <div className="text-xs font-semibold text-purple-600 mt-0.5">
                              ⬆️ {item.forwarded_feature_count} forwarded
                            </div>
                          )}
                        </div>
                      ))}

                      {dayItems.length > 3 && (
                        <div className="text-xs text-gray-500 px-1 py-0.5 font-medium">
                          +{dayItems.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="text-xs font-semibold text-gray-700 mb-2">Status Legend</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(STATUS_ICON).map(([status, icon]) => (
            <div key={status} className="flex items-center gap-2">
              <span>{icon}</span>
              <span className="text-gray-600 capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
