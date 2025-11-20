'use client';

import { format, addMonths, startOfMonth, differenceInMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TimelineAxisProps {
  startDate: Date;
  endDate: Date;
  currentDate?: Date;
  onNavigate?: (direction: 'prev' | 'next') => void;
  className?: string;
}

/**
 * TimelineAxis Component
 *
 * Horizontal timeline ruler showing months/quarters.
 * Features:
 * - Adaptive granularity (months for short ranges, quarters for long ranges)
 * - Current date indicator
 * - Navigation controls
 * - Responsive grid layout
 */
export function TimelineAxis({
  startDate,
  endDate,
  currentDate = new Date(),
  onNavigate,
  className = '',
}: TimelineAxisProps) {
  const monthCount = differenceInMonths(endDate, startDate) + 1;
  const showQuarters = monthCount > 12; // Show quarters if more than 12 months

  // Generate time markers
  const generateMarkers = () => {
    const markers: Array<{ date: Date; label: string; isQuarter?: boolean; isCurrent?: boolean }> = [];
    let current = startOfMonth(startDate);
    let monthIndex = 0;

    while (current <= endDate) {
      const isCurrent = current.getMonth() === currentDate.getMonth() && current.getFullYear() === currentDate.getFullYear();
      const isQuarterStart = current.getMonth() % 3 === 0;

      if (showQuarters) {
        // Show quarters
        if (isQuarterStart) {
          markers.push({
            date: current,
            label: `Q${Math.floor(current.getMonth() / 3) + 1} ${format(current, 'yyyy')}`,
            isQuarter: true,
            isCurrent,
          });
        }
      } else {
        // Show months
        markers.push({
          date: current,
          label: format(current, 'MMM yy'),
          isCurrent,
        });
      }

      current = addMonths(current, 1);
      monthIndex++;
    }

    return markers;
  };

  const markers = generateMarkers();

  return (
    <div className={`bg-white border-b-2 border-slate-200 ${className}`}>
      {/* Navigation header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Timeline: {format(startDate, 'MMM yyyy')} - {format(endDate, 'MMM yyyy')}
          </h3>
          <span className="text-xs text-slate-500">
            ({monthCount} {monthCount === 1 ? 'month' : 'months'})
          </span>
        </div>

        {onNavigate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('prev')}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={() => onNavigate('next')}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Next period"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}
      </div>

      {/* Timeline markers */}
      <div className="relative overflow-x-auto">
        <div className="flex min-w-full">
          {markers.map((marker, index) => (
            <div
              key={index}
              className={`
                flex-1 min-w-[80px] px-3 py-2 text-center border-r border-slate-200 last:border-r-0
                transition-colors
                ${marker.isCurrent ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}
              `}
            >
              <div className={`text-xs font-medium ${marker.isCurrent ? 'text-blue-700' : 'text-slate-700'}`}>
                {marker.label}
              </div>
              {marker.isCurrent && (
                <div className="mt-1 text-xs text-blue-600 font-semibold">• Now</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress indicator line */}
      <div className="relative h-1 bg-slate-100">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-600"
          style={{
            width: `${(differenceInMonths(currentDate, startDate) / monthCount) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
