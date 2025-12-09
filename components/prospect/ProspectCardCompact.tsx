'use client';

/**
 * ProspectCardCompact - Pipedrive-inspired prospect card for Kanban view
 * Optimized for available data: org info, ICP score, source, activity
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  getICPTier,
  getSourceConfig,
  getDaysInStage,
} from '@/lib/prospects/config';
import { ICPRing } from './ICPScoreIndicator';
import Avatar from '@/components/Avatar';
import {
  Clock,
  MoreVertical,
  Mail,
  Phone,
  ArrowRight,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface ProspectCardData {
  org_id: string;
  org_name: string;
  domain?: string | null;
  prospect_stage?: string | null;
  prospect_source?: string | null;
  icp_fit_score?: number | null;
  deal_value?: number | null;
  engagement_score?: number | null;
  contact_count?: number;
  account_manager?: string | null;
  last_activity_at?: string | null;
  stage_changed_at?: string | null;
  created_at?: string;
}

interface ProspectCardCompactProps {
  prospect: ProspectCardData;
  onDragStart?: (e: React.DragEvent, orgId: string) => void;
  onClick?: () => void;
  onQuickAction?: (action: string, orgId: string) => void;
  isDragging?: boolean;
  className?: string;
}

export default function ProspectCardCompact({
  prospect,
  onDragStart,
  onClick,
  onQuickAction,
  isDragging = false,
  className,
}: ProspectCardCompactProps) {
  const [showMenu, setShowMenu] = useState(false);

  const icpTier = getICPTier(prospect.icp_fit_score);
  const sourceConfig = getSourceConfig(prospect.prospect_source);
  const daysInPipeline = getDaysInStage(prospect.created_at);

  // Get border color based on ICP (gray if no score)
  const borderColorClass = icpTier?.borderClass || 'border-l-gray-300';

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, prospect.org_id)}
      onClick={onClick}
      className={cn(
        // Base styles
        'bg-white rounded-xl border border-gray-200 overflow-hidden',
        'cursor-pointer select-none',
        // Left border accent based on ICP
        'border-l-4',
        borderColorClass,
        // Hover and transition effects
        'transition-all duration-200 ease-out',
        'hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5',
        // Dragging state
        isDragging && 'opacity-50 rotate-2 scale-105 shadow-xl',
        // Group for hover effects
        'group',
        className
      )}
    >
      {/* Card Content */}
      <div className="p-3 space-y-2.5">
        {/* Header Row: Avatar + Name + ICP */}
        <div className="flex items-start gap-3">
          {/* Company Avatar */}
          <div className="flex-shrink-0">
            <Avatar
              name={prospect.org_name}
              size="sm"
              className="ring-2 ring-white shadow-sm"
            />
          </div>

          {/* Name & Domain */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {prospect.org_name}
            </h4>
            {prospect.domain && (
              <p className="text-xs text-gray-500 truncate">{prospect.domain}</p>
            )}
          </div>

          {/* ICP Ring */}
          <div className="flex-shrink-0">
            <ICPRing score={prospect.icp_fit_score} size="sm" />
          </div>
        </div>

        {/* Source & Time in Pipeline */}
        <div className="flex items-center justify-between">
          {/* Prospect Source */}
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
              sourceConfig.badgeBg,
              sourceConfig.badgeText
            )}
          >
            <span>{sourceConfig.emoji}</span>
            <span>{sourceConfig.shortLabel}</span>
          </div>

          {/* Days in Pipeline */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{daysInPipeline}d</span>
          </div>
        </div>

        {/* Account Manager & Last Activity */}
        <div className="flex items-center justify-between text-xs">
          {/* Account Manager */}
          {prospect.account_manager ? (
            <span className="text-gray-600 truncate max-w-[100px]" title={prospect.account_manager}>
              {prospect.account_manager.split(' ')[0]}
            </span>
          ) : (
            <span className="text-gray-400">Unassigned</span>
          )}

          {/* Last Activity */}
          {prospect.last_activity_at ? (
            <span className="text-gray-400 truncate">
              {formatDistanceToNow(new Date(prospect.last_activity_at), { addSuffix: true })}
            </span>
          ) : (
            <span className="text-gray-300">No activity</span>
          )}
        </div>
      </div>

      {/* Quick Actions - shown on hover */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-100',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
        )}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAction?.('email', prospect.org_id);
            }}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            title="Send email"
          >
            <Mail className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAction?.('call', prospect.org_id);
            }}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            title="Log call"
          >
            <Phone className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAction?.('view', prospect.org_id);
            }}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            title="View details"
          >
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* More menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 bottom-full mb-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  onQuickAction?.('schedule_demo', prospect.org_id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Schedule Demo
              </button>
              <button
                onClick={() => {
                  onQuickAction?.('add_note', prospect.org_id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Add Note
              </button>
              <button
                onClick={() => {
                  onQuickAction?.('convert', prospect.org_id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Convert to Trial
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Dragging preview card - shown while dragging
 */
export function ProspectCardDragPreview({ prospect }: { prospect: ProspectCardData }) {
  const icpTier = getICPTier(prospect.icp_fit_score);
  const borderColorClass = icpTier?.borderClass || 'border-l-gray-300';

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-300 p-3 shadow-2xl',
        'border-l-4 rotate-3 scale-105',
        borderColorClass,
        'min-w-[200px]'
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar name={prospect.org_name} size="sm" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {prospect.org_name}
          </h4>
          {prospect.domain && (
            <p className="text-xs text-gray-500 truncate">
              {prospect.domain}
            </p>
          )}
        </div>
        <ICPRing score={prospect.icp_fit_score} size="xs" />
      </div>
    </div>
  );
}
