'use client';

import { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { differenceInDays } from 'date-fns';
import { TrialProgressBar } from '@/components/TrialProgressBar';
import { EngagementTierIcon } from '@/components/trials/EngagementTierBadge';
import { getRecencyMetrics, formatLastActivity } from '@/lib/trial-org-recency';
import { getInitials } from '@/lib/utils/accountManagerUtils';
import { Database } from '@/lib/supabase/types';
import QuickActivityLog from '@/components/trial/QuickActivityLog';

type TrialOrg = Database['public']['Tables']['trial_organizations']['Row'];

interface OrgWithUsers extends TrialOrg {
  user_count: number;
  active_users: number;
}

interface AccountManager {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface TrialCardProps {
  org: OrgWithUsers;
  isSelected: boolean;
  onSelect: (orgId: string) => void;
  accountManagers: AccountManager[];
  formatStage: (stage: string) => string;
  onActivityLogged?: () => void;
  onPrefetch?: (orgId: string) => void;
}

// Helper functions moved outside component to prevent recreation
const getStageGradient = (stage: string) => {
  switch (stage) {
    case 'trial_active': return 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/80';
    case 'trial_scheduled': return 'bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/80';
    case 'trial_expired': return 'bg-gradient-to-br from-rose-50/80 via-white to-red-50/80';
    case 'converted': return 'bg-gradient-to-br from-purple-50/80 via-white to-pink-50/80';
    case 'not_converted': return 'bg-gradient-to-br from-gray-50/80 via-white to-slate-50/80';
    default: return 'bg-gradient-to-br from-gray-50/80 via-white to-gray-50/80';
  }
};

const getStageShadow = (stage: string) => {
  switch (stage) {
    case 'trial_active': return 'shadow-emerald-100/50 hover:shadow-emerald-200/50';
    case 'trial_scheduled': return 'shadow-blue-100/50 hover:shadow-blue-200/50';
    case 'trial_expired': return 'shadow-rose-100/50 hover:shadow-rose-200/50';
    case 'converted': return 'shadow-purple-100/50 hover:shadow-purple-200/50';
    case 'not_converted': return 'shadow-gray-100/50 hover:shadow-gray-200/50';
    default: return 'shadow-gray-100/50 hover:shadow-gray-200/50';
  }
};

const getStageDotColor = (stage: string) => {
  switch (stage) {
    case 'trial_active': return 'bg-emerald-500';
    case 'trial_scheduled': return 'bg-blue-500';
    case 'trial_expired': return 'bg-rose-500';
    case 'converted': return 'bg-purple-500';
    case 'not_converted': return 'bg-gray-400';
    default: return 'bg-gray-300';
  }
};

const getActivityDotColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-700';
    case 'quiet': return 'bg-yellow-600';
    case 'stale': return 'bg-orange-600';
    case 'dormant': return 'bg-red-600';
    default: return 'bg-gray-400';
  }
};

export const TrialCard = memo(function TrialCard({
  org,
  isSelected,
  onSelect,
  accountManagers,
  formatStage,
  onActivityLogged,
  onPrefetch,
}: TrialCardProps) {
  const router = useRouter();

  // Memoized handlers
  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect(org.org_id);
  }, [org.org_id, onSelect]);

  const handleCardClick = useCallback(() => {
    router.push(`/support/trials/${org.org_id}`);
  }, [router, org.org_id]);

  // Prefetch detail page data on hover for instant navigation
  const handleMouseEnter = useCallback(() => {
    onPrefetch?.(org.org_id);
  }, [org.org_id, onPrefetch]);

  // Calculate derived values
  const daysLeft = org.trial_end_date ? differenceInDays(new Date(org.trial_end_date), new Date()) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
  const isExpired = daysLeft !== null && daysLeft < 0;

  const recencyMetrics = getRecencyMetrics(org.last_activity_at);
  const lastActivityText = formatLastActivity(org.last_activity_at);
  const completenessScore = org.completeness_score || 0;

  // Find account manager
  const accountManagerValue = org.account_manager_id || org.account_manager;
  const manager = accountManagers.find(am => am.user_id === accountManagerValue);
  const managerName = manager?.full_name || manager?.email?.split('@')[0];
  const isAssigned = !!managerName;

  return (
    <div
      data-testid="org-card"
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm border border-gray-200/50 shadow-lg ${getStageGradient(org.org_lifecycle_stage)} ${getStageShadow(org.org_lifecycle_stage)} hover:shadow-xl min-h-[320px] flex flex-col`}
      style={{ backdropFilter: 'blur(8px)' }}
      onMouseEnter={handleMouseEnter}
    >
      {/* Selection Checkbox - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          aria-label={`Select ${org.org_name} for bulk action`}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer transition-transform hover:scale-110"
        />
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-4 flex-1">
        {/* Header: Avatar + Name + Domain */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white/50">
            <span className="text-base font-bold text-white">
              {org.org_name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-xl font-bold text-gray-900 mb-1 truncate leading-tight">
              {org.org_name}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600 truncate">
                {org.domain || 'No domain'}
              </p>
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                completenessScore >= 70 ? 'bg-green-100 text-green-700 border border-green-300' :
                completenessScore >= 40 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                'bg-red-100 text-red-700 border border-red-300'
              }`} title={`Data Completeness: ${completenessScore}%`}>
                {completenessScore}%
              </div>
            </div>
          </div>
        </div>

        {/* Status Row: Stage + Activity + Last Activity */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${getStageDotColor(org.org_lifecycle_stage)}`}></div>
            <span className="text-gray-700 font-medium">{formatStage(org.org_lifecycle_stage)}</span>
          </div>

          <div className="w-px h-3 bg-gray-300"></div>

          <EngagementTierIcon tier={org.engagement_tier} size="sm" />

          <div className="w-px h-3 bg-gray-300"></div>

          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${recencyMetrics.activityStatusColor}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${getActivityDotColor(recencyMetrics.activityStatus)}`}></div>
            <span>{recencyMetrics.activityStatusLabel}</span>
          </div>

          <span className="text-gray-600 text-xs">
            {lastActivityText}
          </span>
        </div>

        {/* Days Left - Compact */}
        {daysLeft !== null && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <div className={`w-1.5 h-1.5 rounded-full ${
              isExpired ? 'bg-red-500' :
              isExpiringSoon ? 'bg-amber-500' :
              'bg-gray-400'
            }`}></div>
            <span className={`text-xs font-medium ${
              isExpired ? 'text-red-700' :
              isExpiringSoon ? 'text-amber-700' :
              'text-gray-600'
            }`}>
              {isExpired ? 'Expired' :
               isExpiringSoon ? `${daysLeft} days left` :
               `${daysLeft} days remaining`}
            </span>
          </div>
        )}

        {/* Trial Progress Bar */}
        <TrialProgressBar
          trialStartDate={org.trial_start_date}
          trialEndDate={org.trial_end_date}
          engagementScore={org.engagement_score}
          lastActivityDate={org.last_activity_date}
          className="pt-3"
        />

        {/* Account Manager - Minimal */}
        <div className="flex items-center gap-2.5 pt-3 border-t border-gray-100">
          {isAssigned ? (
            <>
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-semibold text-blue-800">
                  {getInitials(managerName!)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-900 font-medium truncate">{managerName}</div>
                <div className="text-[10px] text-gray-600">Account Manager</div>
              </div>
            </>
          ) : (
            <>
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] text-gray-500">?</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600">Unassigned</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card Footer - Modern */}
      <div className="border-t border-white/50 px-6 py-4 backdrop-blur-sm bg-white/30">
        <div className="flex items-center gap-3">
          {/* Quick Activity Log */}
          <QuickActivityLog
            orgId={org.org_id}
            orgName={org.org_name}
            onSuccess={onActivityLogged}
          />

          {/* View Details Button */}
          <button
            onClick={handleCardClick}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-gray-700 hover:text-white bg-white/60 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md group/btn"
          >
            <span>View Details</span>
            <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

export default TrialCard;
