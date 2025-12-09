'use client';

/**
 * DealHealthCard - Pipedrive-inspired deal potential visualization
 * Shows deal value, probability, expected close date, and health metrics
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  formatDealValue,
  getICPTier,
  getEngagementLevel,
  getPipelineProgress,
  getDaysInStage,
} from '@/lib/prospects/config';
import ICPScoreIndicator from './ICPScoreIndicator';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Target,
  Flame,
  Activity,
  AlertTriangle,
} from 'lucide-react';

interface DealHealthCardProps {
  dealValue?: number | null;
  icpScore?: number | null;
  engagementScore?: number | null;
  prospectStage?: string | null;
  stageChangedAt?: string | null;
  expectedCloseDate?: string | null;
  probability?: number | null;
  createdAt?: string | null;
  className?: string;
}

export default function DealHealthCard({
  dealValue,
  icpScore,
  engagementScore,
  prospectStage,
  stageChangedAt,
  expectedCloseDate,
  probability,
  createdAt,
  className,
}: DealHealthCardProps) {
  const icpTier = getICPTier(icpScore);
  const engagement = getEngagementLevel(engagementScore);
  const pipelineProgress = getPipelineProgress(prospectStage);
  const daysInStage = getDaysInStage(stageChangedAt || createdAt);
  const daysInPipeline = getDaysInStage(createdAt);

  // Calculate weighted deal score
  const dealScore = useMemo(() => {
    const icpWeight = 0.4;
    const engagementWeight = 0.3;
    const progressWeight = 0.3;

    const icpValue = icpScore || 0;
    const engagementValue = engagementScore || 0;
    const progressValue = pipelineProgress;

    return Math.round(
      icpValue * icpWeight +
      engagementValue * engagementWeight +
      progressValue * progressWeight
    );
  }, [icpScore, engagementScore, pipelineProgress]);

  // Determine deal health status
  const healthStatus = useMemo(() => {
    if (dealScore >= 70) return { label: 'Healthy', color: 'text-green-600', bg: 'bg-green-100', icon: TrendingUp };
    if (dealScore >= 40) return { label: 'At Risk', color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertTriangle };
    return { label: 'Needs Attention', color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle };
  }, [dealScore]);

  // Expected value (deal value * probability)
  const expectedValue = useMemo(() => {
    if (!dealValue) return null;
    const prob = probability ?? (pipelineProgress / 100);
    return Math.round(dealValue * prob);
  }, [dealValue, probability, pipelineProgress]);

  const HealthIcon = healthStatus.icon;

  return (
    <div className={cn('bg-white rounded-2xl border border-gray-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Deal Potential</h3>
          </div>
          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', healthStatus.bg, healthStatus.color)}>
            <HealthIcon className="w-3.5 h-3.5" />
            {healthStatus.label}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5">
        {/* Deal Value Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Opportunity Value</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatDealValue(dealValue)}
            </p>
            {expectedValue && expectedValue !== dealValue && (
              <p className="text-sm text-gray-500 mt-1">
                Expected: <span className="font-medium text-green-600">{formatDealValue(expectedValue)}</span>
              </p>
            )}
          </div>

          {/* Probability Ring */}
          <div className="text-center">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - (probability ?? pipelineProgress) / 100)}
                  className="text-blue-500 transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">
                  {probability ?? pipelineProgress}%
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Probability</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* ICP Fit */}
          <div className="p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-medium text-gray-600">ICP Fit</span>
            </div>
            <div className="flex items-center justify-between">
              <ICPScoreIndicator score={icpScore} variant="badge" />
              <span className={cn('text-xs font-medium', icpTier?.badgeText || 'text-gray-400')}>
                {icpTier?.shortLabel || 'Not scored'}
              </span>
            </div>
          </div>

          {/* Engagement */}
          <div className="p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium text-gray-600">Engagement</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', engagement.badgeBg, engagement.badgeText)}>
                {engagement.emoji} {engagementScore ?? 0}%
              </span>
              <span className={cn('text-xs font-medium', engagement.badgeText)}>
                {engagement.label}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="space-y-3">
          {/* Days in Pipeline */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-700">Days in Pipeline</span>
            </div>
            <span className="text-sm font-bold text-blue-600">{daysInPipeline}</span>
          </div>

          {/* Days in Current Stage */}
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-gray-700">Days in Current Stage</span>
            </div>
            <span className={cn(
              'text-sm font-bold',
              daysInStage > 14 ? 'text-red-600' : daysInStage > 7 ? 'text-amber-600' : 'text-amber-600'
            )}>
              {daysInStage}
              {daysInStage > 14 && (
                <span className="ml-1 text-xs font-normal text-red-500">⚠️</span>
              )}
            </span>
          </div>

          {/* Expected Close Date */}
          {expectedCloseDate && (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700">Expected Close</span>
              </div>
              <span className="text-sm font-bold text-green-600">
                {new Date(expectedCloseDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Pipeline Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-500">Pipeline Progress</span>
            <span className="font-medium text-gray-700">{pipelineProgress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 via-violet-500 to-green-500 transition-all duration-500"
              style={{ width: `${pipelineProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for cards/lists
 */
export function DealHealthCompact({
  dealValue,
  icpScore,
  probability,
  className,
}: {
  dealValue?: number | null;
  icpScore?: number | null;
  probability?: number | null;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div>
        <p className="text-lg font-bold text-gray-900">{formatDealValue(dealValue)}</p>
        <p className="text-xs text-gray-500">Deal Value</p>
      </div>
      <div className="h-8 w-px bg-gray-200" />
      <ICPScoreIndicator score={icpScore} variant="gauge" size="sm" />
      <div className="h-8 w-px bg-gray-200" />
      <div className="text-center">
        <p className="text-lg font-bold text-blue-600">{probability ?? 0}%</p>
        <p className="text-xs text-gray-500">Probability</p>
      </div>
    </div>
  );
}
