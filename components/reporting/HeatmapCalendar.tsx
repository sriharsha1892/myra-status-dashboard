'use client';

import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface ActivityDay {
  date: string;
  count: number;
  value: number;
  items: Array<{
    id: string;
    type: 'quote' | 'msa' | 'deal';
    companyName: string;
    value: number;
  }>;
}

interface HeatmapCalendarProps {
  data: Array<{
    id: string;
    type: 'quote' | 'msa' | 'deal';
    companyName: string;
    totalValue: number;
    createdAt: string;
  }>;
  onDayClick?: (day: ActivityDay) => void;
  days?: number;
}

export default function HeatmapCalendar({
  data,
  onDayClick,
  days = 90,
}: HeatmapCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<ActivityDay | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  // Generate calendar data
  const calendarData = useMemo(() => {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() - monthOffset);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);

    // Group data by date
    const byDate = new Map<string, ActivityDay>();

    data.forEach((item) => {
      const date = new Date(item.createdAt).toISOString().split('T')[0];
      const dateObj = new Date(date);
      if (dateObj >= startDate && dateObj <= endDate) {
        if (!byDate.has(date)) {
          byDate.set(date, {
            date,
            count: 0,
            value: 0,
            items: [],
          });
        }
        const day = byDate.get(date)!;
        day.count += 1;
        day.value += item.totalValue || 0;
        day.items.push({
          id: item.id,
          type: item.type,
          companyName: item.companyName,
          value: item.totalValue,
        });
      }
    });

    // Generate all days in range
    const allDays: Array<{ date: string; data: ActivityDay | null }> = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      allDays.push({
        date: dateStr,
        data: byDate.get(dateStr) || null,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Find max count for intensity calculation
    const maxCount = Math.max(
      1,
      ...Array.from(byDate.values()).map((d) => d.count)
    );

    return { allDays, maxCount, startDate, endDate };
  }, [data, days, monthOffset]);

  // Group days by week
  const weeks = useMemo(() => {
    const result: Array<typeof calendarData.allDays> = [];
    let currentWeek: typeof calendarData.allDays = [];

    // Pad the first week
    const firstDayOfWeek = new Date(calendarData.allDays[0]?.date || new Date()).getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', data: null });
    }

    calendarData.allDays.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    // Pad the last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', data: null });
      }
      result.push(currentWeek);
    }

    return result;
  }, [calendarData.allDays]);

  const getIntensity = (count: number) => {
    if (count === 0) return 0;
    return Math.min(4, Math.ceil((count / calendarData.maxCount) * 4));
  };

  const intensityColors = [
    'bg-neutral-100',
    'bg-violet-100',
    'bg-violet-200',
    'bg-violet-400',
    'bg-violet-600',
  ];

  const handleDayClick = (day: { date: string; data: ActivityDay | null }) => {
    if (day.data) {
      setSelectedDay(day.data);
      if (onDayClick) {
        onDayClick(day.data);
      }
    }
  };

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-neutral-500" />
          <h3 className="font-semibold text-neutral-900">Activity Heatmap</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset((prev) => prev + 1)}
            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-neutral-500" />
          </button>
          <span className="text-sm text-neutral-600 min-w-[100px] text-center">
            {formatDateLabel(calendarData.startDate)} -{' '}
            {formatDateLabel(calendarData.endDate)}
          </span>
          <button
            onClick={() => setMonthOffset((prev) => Math.max(0, prev - 1))}
            disabled={monthOffset === 0}
            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="flex gap-1 mb-2 pl-8">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="w-4 text-[10px] text-neutral-400 text-center">
            {day[0]}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {/* Month labels */}
          <div className="flex flex-col gap-1 pr-2">
            {weeks.map((_, i) => {
              if (i === 0 || i % 4 === 0) {
                const weekDate = new Date(weeks[i][0]?.date || new Date());
                return (
                  <div
                    key={i}
                    className="h-4 text-[10px] text-neutral-400 flex items-center"
                  >
                    {weekDate.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                );
              }
              return <div key={i} className="h-4" />;
            })}
          </div>

          {/* Week columns */}
          <div className="flex flex-col gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1">
                {week.map((day, dayIndex) => {
                  if (!day.date) {
                    return <div key={dayIndex} className="w-4 h-4" />;
                  }

                  const intensity = getIntensity(day.data?.count || 0);
                  const isSelected = selectedDay?.date === day.date;

                  return (
                    <button
                      key={dayIndex}
                      onClick={() => handleDayClick(day)}
                      className={`w-4 h-4 rounded-sm ${intensityColors[intensity]} ${
                        isSelected ? 'ring-2 ring-violet-500 ring-offset-1' : ''
                      } ${day.data ? 'cursor-pointer hover:ring-1 hover:ring-violet-300' : 'cursor-default'} transition-all`}
                      title={`${day.date}: ${day.data?.count || 0} activities${
                        day.data?.value ? ` ($${(day.data.value / 1000).toFixed(0)}K)` : ''
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-neutral-500">
        <span>Less</span>
        {intensityColors.map((color, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
        ))}
        <span>More</span>
      </div>

      {/* Selected day details */}
      {selectedDay && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-neutral-900">
              {new Date(selectedDay.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h4>
            <span className="text-sm text-neutral-500">
              {selectedDay.count} activit{selectedDay.count !== 1 ? 'ies' : 'y'}{' '}
              · ${(selectedDay.value / 1000).toFixed(0)}K
            </span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedDay.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.type === 'quote'
                        ? 'bg-violet-500'
                        : item.type === 'msa'
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                    }`}
                  />
                  <span className="text-sm text-neutral-700">
                    {item.companyName}
                  </span>
                </div>
                <span className="text-sm font-medium text-neutral-900">
                  ${(item.value / 1000).toFixed(0)}K
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
