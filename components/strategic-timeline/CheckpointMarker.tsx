'use client';

import { Flag, Star } from 'lucide-react';
import { format } from 'date-fns';

interface CheckpointMarkerProps {
  date: Date;
  label?: string;
  itemCount?: number;
  isHighlight?: boolean; // For major milestones (e.g., March 2026)
  className?: string;
}

/**
 * CheckpointMarker Component
 *
 * Vertical milestone marker in the timeline view.
 * Shows key dates with optional item counts and visual emphasis for major milestones.
 */
export function CheckpointMarker({
  date,
  label,
  itemCount = 0,
  isHighlight = false,
  className = '',
}: CheckpointMarkerProps) {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Vertical line */}
      <div
        className={`absolute top-0 bottom-0 w-0.5 ${
          isHighlight
            ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600'
            : 'bg-slate-300'
        }`}
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />

      {/* Marker icon */}
      <div
        className={`
          relative z-10 flex items-center justify-center rounded-full
          ${isHighlight ? 'w-10 h-10 bg-amber-500 shadow-lg' : 'w-7 h-7 bg-slate-400 shadow-md'}
          transition-transform hover:scale-110
        `}
        title={format(date, 'PPP')}
      >
        {isHighlight ? (
          <Star className="w-5 h-5 text-white fill-white" />
        ) : (
          <Flag className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Date label */}
      <div className="mt-2 text-center">
        <div
          className={`font-semibold ${
            isHighlight ? 'text-amber-900 text-sm' : 'text-slate-700 text-xs'
          }`}
        >
          {label || format(date, 'MMM yyyy')}
        </div>
        {itemCount > 0 && (
          <div
            className={`
              mt-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium
              ${
                isHighlight
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
              }
            `}
          >
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </div>
        )}
      </div>

      {/* Glow effect for highlights */}
      {isHighlight && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-amber-400 rounded-full opacity-30 blur-xl animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
