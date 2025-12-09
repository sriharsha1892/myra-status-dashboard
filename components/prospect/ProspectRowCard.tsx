'use client';

/**
 * ProspectRowCard - Pipedrive-inspired rich row card for list view
 * Optimized for available data: ICP-colored left border, avatar, stage badge, source
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  getStageConfig,
  getSourceConfig,
  getICPTier,
  getDaysInStage,
} from '@/lib/prospects/config';
import ProspectStageBadge from './ProspectStageBadge';
import { ICPRing } from './ICPScoreIndicator';
import Avatar from '@/components/Avatar';
import {
  Mail,
  Phone,
  Calendar,
  ArrowRight,
  MoreVertical,
  ExternalLink,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface ProspectRowData {
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
  description?: string | null;
}

interface ProspectRowCardProps {
  prospect: ProspectRowData;
  onClick?: () => void;
  onQuickAction?: (action: string, orgId: string) => void;
  isSelected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  showSelection?: boolean;
  className?: string;
}

export default function ProspectRowCard({
  prospect,
  onClick,
  onQuickAction,
  isSelected = false,
  onSelectChange,
  showSelection = false,
  className,
}: ProspectRowCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const icpTier = getICPTier(prospect.icp_fit_score);
  const stageConfig = getStageConfig(prospect.prospect_stage);
  const sourceConfig = getSourceConfig(prospect.prospect_source);
  const daysInPipeline = getDaysInStage(prospect.created_at);

  const borderColorClass = icpTier?.borderClass || 'border-l-gray-300';

  return (
    <div
      className={cn(
        // Base card styles
        'bg-white border border-gray-200 transition-all duration-200',
        // Left border accent based on ICP
        'border-l-4',
        borderColorClass,
        // Selection state
        isSelected && 'bg-blue-50/50 border-blue-200',
        // Hover effect
        'hover:shadow-md hover:border-gray-300',
        // First/last rounding handled by parent
        className
      )}
    >
      {/* Main Row */}
      <div
        className={cn(
          'flex items-center gap-4 px-4 py-3',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        {/* Checkbox */}
        {showSelection && (
          <div
            className="flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelectChange?.(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Avatar + Company Info */}
        <div className="flex items-center gap-3 min-w-[200px] flex-1">
          <Avatar
            name={prospect.org_name}
            size="sm"
            className="ring-2 ring-white shadow-sm flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">
                {prospect.org_name}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {prospect.domain && (
                <span className="text-xs text-gray-500 truncate">{prospect.domain}</span>
              )}
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs',
                  sourceConfig.badgeText
                )}
              >
                {sourceConfig.emoji}
              </span>
            </div>
          </div>
        </div>

        {/* Stage Badge */}
        <div className="flex-shrink-0 w-[130px]">
          <ProspectStageBadge stage={prospect.prospect_stage} />
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{daysInPipeline}d</span>
          </div>
        </div>

        {/* ICP Score */}
        <div className="flex-shrink-0 w-[60px] flex justify-center">
          <ICPRing score={prospect.icp_fit_score} size="sm" />
        </div>

        {/* Source Badge - replacing deal value */}
        <div className="flex-shrink-0 w-[80px]">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
              sourceConfig.badgeBg,
              sourceConfig.badgeText
            )}
          >
            {sourceConfig.shortLabel}
          </span>
        </div>

        {/* Last Activity */}
        <div className="flex-shrink-0 w-[100px]">
          <span className="text-xs text-gray-500">
            {prospect.last_activity_at
              ? formatDistanceToNow(new Date(prospect.last_activity_at), { addSuffix: true })
              : 'No activity'}
          </span>
        </div>

        {/* Owner */}
        <div className="flex-shrink-0 w-[80px] truncate">
          <span className="text-xs text-gray-600" title={prospect.account_manager || undefined}>
            {prospect.account_manager ? prospect.account_manager.split(' ')[0] : '-'}
          </span>
        </div>

        {/* Quick Actions */}
        <div
          className="flex-shrink-0 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onQuickAction?.('email', prospect.org_id)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Send email"
          >
            <Mail className="w-4 h-4" />
          </button>
          <button
            onClick={() => onQuickAction?.('schedule_demo', prospect.org_id)}
            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
            title="Schedule demo"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => onQuickAction?.('convert', prospect.org_id)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Convert to trial"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      onQuickAction?.('call', prospect.org_id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Log Call
                  </button>
                  <button
                    onClick={() => {
                      onQuickAction?.('view', prospect.org_id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Detail Section */}
      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-6 text-sm">
            {/* Description */}
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Description</h5>
              <p className="text-gray-700">
                {prospect.description || 'No description available'}
              </p>
            </div>

            {/* Stage Info */}
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Pipeline Progress</h5>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${stageConfig.columnColor}20` }}
                >
                  <stageConfig.icon
                    className="w-4 h-4"
                    style={{ color: stageConfig.columnColor }}
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{stageConfig.label}</p>
                  <p className="text-xs text-gray-500">
                    In pipeline for {daysInPipeline} days
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Quick Stats</h5>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">ICP Fit</span>
                  <span className={cn('font-medium', icpTier?.badgeText || 'text-gray-500')}>
                    {prospect.icp_fit_score !== null && prospect.icp_fit_score !== undefined
                      ? `${prospect.icp_fit_score}% - ${icpTier?.label || 'Unknown'}`
                      : 'Not scored'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Source</span>
                  <span className="font-medium text-gray-900">
                    {sourceConfig.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Owner</span>
                  <span className="font-medium text-gray-900">
                    {prospect.account_manager || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for mobile or condensed views
 */
export function ProspectRowCompact({
  prospect,
  onClick,
}: {
  prospect: ProspectRowData;
  onClick?: () => void;
}) {
  const icpTier = getICPTier(prospect.icp_fit_score);
  const borderColorClass = icpTier?.borderClass || 'border-l-gray-300';
  const sourceConfig = getSourceConfig(prospect.prospect_source);

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 bg-white border border-gray-200',
        'border-l-4',
        borderColorClass,
        'hover:bg-gray-50 cursor-pointer transition-colors'
      )}
    >
      <Avatar name={prospect.org_name} size="sm" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">
          {prospect.org_name}
        </h4>
      </div>
      <ProspectStageBadge stage={prospect.prospect_stage} variant="compact" />
      <span className={cn('text-xs font-medium', sourceConfig.badgeText)}>
        {sourceConfig.emoji}
      </span>
    </div>
  );
}
