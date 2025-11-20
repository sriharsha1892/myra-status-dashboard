'use client';

import { memo } from 'react';
import { Calendar, Clock, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { OrgDemandBadge } from './OrgDemandBadge';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';

interface TimelineItemProps {
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
  onClick?: () => void;
  className?: string;
  isCompact?: boolean;
}

/**
 * TimelineItem Component
 *
 * Compact card representation of a roadmap item for timeline views.
 * Features:
 * - Status-based color coding
 * - Progress bar visualization
 * - Target date with urgency indicators
 * - Organization demand badge
 * - Responsive compact/full modes
 * - Memoized to prevent unnecessary re-renders
 */
const TimelineItemComponent = ({
  id,
  title,
  status,
  priority,
  targetDate,
  progressPercentage = 0,
  ownerName,
  orgCount = 0,
  maxPriorityLevel,
  linkTypes,
  onClick,
  className = '',
  isCompact = false,
}: TimelineItemProps) => {
  // Parse target date
  const target = targetDate ? new Date(targetDate) : null;
  const isOverdue = target && isPast(target) && status !== 'completed';
  const isUpcoming = target && isFuture(target);

  // Status styling
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 hover:border-green-300';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200 hover:border-blue-300';
      case 'cancelled':
        return 'bg-slate-100 border-slate-200 opacity-60';
      case 'planned':
      default:
        return 'bg-white border-slate-200 hover:border-slate-300';
    }
  };

  // Priority border accent
  const getPriorityAccent = () => {
    switch (priority) {
      case 'critical':
        return 'border-l-4 border-l-red-500';
      case 'high':
        return 'border-l-4 border-l-orange-500';
      case 'medium':
        return 'border-l-4 border-l-blue-500';
      case 'low':
      default:
        return 'border-l-4 border-l-slate-300';
    }
  };

  // Status icon
  const StatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
      case 'planned':
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  // Progress bar color
  const getProgressColor = () => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'in_progress') return 'bg-blue-500';
    return 'bg-slate-300';
  };

  return (
    <div
      className={`
        group relative rounded-lg border-2 transition-all duration-200
        ${getStatusStyles()}
        ${getPriorityAccent()}
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
        ${isCompact ? 'p-2' : 'p-3'}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <StatusIcon />
          <h4
            className={`font-medium text-slate-900 line-clamp-2 ${
              isCompact ? 'text-xs' : 'text-sm'
            }`}
            title={title}
          >
            {title}
          </h4>
        </div>

        {orgCount > 0 && (
          <OrgDemandBadge
            orgCount={orgCount}
            maxPriorityLevel={maxPriorityLevel}
            linkTypes={linkTypes}
          />
        )}
      </div>

      {/* Progress bar */}
      {!isCompact && status !== 'cancelled' && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer metadata */}
      <div className={`flex items-center justify-between gap-2 ${isCompact ? 'text-xs' : 'text-xs'}`}>
        {/* Target date */}
        {target && (
          <div
            className={`flex items-center gap-1 ${
              isOverdue
                ? 'text-red-600 font-medium'
                : isUpcoming
                ? 'text-slate-600'
                : 'text-slate-500'
            }`}
            title={format(target, 'PPP')}
          >
            <Calendar className="w-3 h-3" />
            <span>{formatDistanceToNow(target, { addSuffix: true })}</span>
          </div>
        )}

        {/* Owner */}
        {ownerName && !isCompact && (
          <div className="flex items-center gap-1 text-slate-600" title={ownerName}>
            <User className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{ownerName}</span>
          </div>
        )}
      </div>

      {/* Overdue indicator */}
      {isOverdue && !isCompact && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
      )}
    </div>
  );
};

/**
 * Memoized TimelineItem with custom comparison
 * Only re-renders if critical props change
 */
export const TimelineItem = memo(TimelineItemComponent, (prevProps, nextProps) => {
  // Return true if props are equal (prevent re-render)
  // Return false if props changed (allow re-render)
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.status === nextProps.status &&
    prevProps.priority === nextProps.priority &&
    prevProps.progressPercentage === nextProps.progressPercentage &&
    prevProps.targetDate === nextProps.targetDate &&
    prevProps.ownerName === nextProps.ownerName &&
    prevProps.orgCount === nextProps.orgCount &&
    prevProps.maxPriorityLevel === nextProps.maxPriorityLevel &&
    prevProps.isCompact === nextProps.isCompact
  );
});
