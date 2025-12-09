'use client';

/**
 * ProspectInfoSection - Displays prospect-specific information and actions
 * Shows on the trial detail page when the organization is a prospect
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import ProspectActivityTimeline from './ProspectActivityTimeline';

// Prospect stage configuration
const PROSPECT_STAGES = [
  { value: 'cold_lead', label: 'Cold Lead', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: '🧊' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '📧' },
  { value: 'responded', label: 'Responded', color: 'bg-cyan-100 text-cyan-700 border-cyan-300', icon: '💬' },
  { value: 'screening', label: 'Screening', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: '🔍' },
  { value: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: '📅' },
  { value: 'demo_done', label: 'Demo Done', color: 'bg-indigo-100 text-indigo-700 border-indigo-300', icon: '✅' },
  { value: 'disqualified', label: 'Disqualified', color: 'bg-red-100 text-red-700 border-red-300', icon: '❌' },
] as const;

const PROSPECT_SOURCES = [
  { value: 'cold_outreach', label: 'Cold Outreach', icon: '📧' },
  { value: 'inbound', label: 'Inbound', icon: '📥' },
  { value: 'referral', label: 'Referral', icon: '🤝' },
  { value: 'event', label: 'Event', icon: '🎪' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
] as const;

interface ProspectInfoSectionProps {
  orgId: string;
  orgName: string;
  prospectStage?: string | null;
  prospectSource?: string | null;
  icpFitScore?: number | null;
  createdAt?: string | null;
  onStageChange?: (newStage: string) => void;
  onConvertToTrial?: () => void;
  onRefresh?: () => void;
}

function getStageConfig(stage: string | undefined | null) {
  return PROSPECT_STAGES.find(s => s.value === stage) || PROSPECT_STAGES[0];
}

function getSourceConfig(source: string | undefined | null) {
  return PROSPECT_SOURCES.find(s => s.value === source) || { value: 'cold_outreach', label: 'Cold Outreach', icon: '📧' };
}

function ICPScoreGauge({ score }: { score?: number | null }) {
  if (score === undefined || score === null) {
    return (
      <div className="text-sm text-gray-400">Not set</div>
    );
  }

  let colorClass = 'bg-gray-200';
  let textColor = 'text-gray-600';
  let label = 'Poor Fit';

  if (score >= 80) {
    colorClass = 'bg-green-500';
    textColor = 'text-green-700';
    label = 'Excellent Fit';
  } else if (score >= 60) {
    colorClass = 'bg-yellow-500';
    textColor = 'text-yellow-700';
    label = 'Good Fit';
  } else if (score >= 40) {
    colorClass = 'bg-orange-500';
    textColor = 'text-orange-700';
    label = 'Moderate Fit';
  } else {
    colorClass = 'bg-red-500';
    textColor = 'text-red-700';
    label = 'Poor Fit';
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', colorClass)}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={cn('text-sm font-medium', textColor)}>{score}%</span>
      </div>
      <div className={cn('text-xs', textColor)}>{label}</div>
    </div>
  );
}

export function ProspectInfoSection({
  orgId,
  orgName,
  prospectStage,
  prospectSource,
  icpFitScore,
  createdAt,
  onStageChange,
  onConvertToTrial,
  onRefresh,
}: ProspectInfoSectionProps) {
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStageMenu, setShowStageMenu] = useState(false);

  const currentStage = getStageConfig(prospectStage);
  const currentSource = getSourceConfig(prospectSource);
  const currentStageIndex = PROSPECT_STAGES.findIndex(s => s.value === prospectStage);

  const handleStageUpdate = async (newStage: string) => {
    setIsUpdating(true);
    setShowStageMenu(false);

    try {
      const { error } = await supabase
        .from('trial_organizations')
        .update({ prospect_stage: newStage } as any)
        .eq('org_id', orgId);

      if (error) throw error;

      toast.success(`Stage updated to ${PROSPECT_STAGES.find(s => s.value === newStage)?.label}`);
      onStageChange?.(newStage);
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to update stage');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConvertToTrial = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('trial_organizations')
        .update({
          is_prospect: false,
          prospect_stage: null,
          trial_status: 'active',
          org_lifecycle_stage: 'trial_active',
          trial_start_date: new Date().toISOString(),
        } as any)
        .eq('org_id', orgId);

      if (error) throw error;

      toast.success(`${orgName} converted to active trial!`);
      onConvertToTrial?.();
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to convert to trial');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisqualify = async () => {
    if (!confirm(`Are you sure you want to disqualify ${orgName}?`)) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('trial_organizations')
        .update({ prospect_stage: 'disqualified' } as any)
        .eq('org_id', orgId);

      if (error) throw error;

      toast.success(`${orgName} marked as disqualified`);
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to disqualify prospect');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-lg font-semibold text-gray-900">Prospect Pipeline</h3>
        </div>
        {prospectStage !== 'disqualified' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStageMenu(!showStageMenu)}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              Change Stage
            </button>
            {currentStageIndex >= 4 && ( // Only show after demo_scheduled
              <button
                onClick={handleConvertToTrial}
                disabled={isUpdating}
                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Convert to Trial
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stage Menu Dropdown */}
      {showStageMenu && (
        <div className="absolute mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
          <div className="p-2 space-y-1">
            {PROSPECT_STAGES.filter(s => s.value !== 'disqualified').map((stage) => (
              <button
                key={stage.value}
                onClick={() => handleStageUpdate(stage.value)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm rounded-lg flex items-center gap-2 transition-colors',
                  stage.value === prospectStage
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                )}
              >
                <span>{stage.icon}</span>
                <span>{stage.label}</span>
                {stage.value === prospectStage && (
                  <svg className="w-4 h-4 ml-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            <div className="border-t border-gray-200 pt-1 mt-1">
              <button
                onClick={handleDisqualify}
                className="w-full px-3 py-2 text-left text-sm rounded-lg flex items-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
              >
                <span>❌</span>
                <span>Disqualify</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {PROSPECT_STAGES.filter(s => s.value !== 'disqualified').map((stage, idx) => {
            const isActive = stage.value === prospectStage;
            const isPast = idx < currentStageIndex;

            return (
              <div key={stage.value} className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all',
                    isActive ? 'bg-blue-600 text-white shadow-lg scale-110' :
                    isPast ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  )}
                >
                  {isPast ? '✓' : stage.icon}
                </div>
                <div className={cn(
                  'text-xs mt-1 font-medium text-center',
                  isActive ? 'text-blue-700' : isPast ? 'text-green-700' : 'text-gray-400'
                )}>
                  {stage.label}
                </div>
              </div>
            );
          })}
        </div>
        {/* Progress Line */}
        <div className="relative h-1 bg-gray-200 rounded-full mx-4 -mt-8 mb-6">
          <div
            className="absolute h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${(currentStageIndex / (PROSPECT_STAGES.length - 2)) * 100}%` }}
          />
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Stage */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Current Stage</div>
          <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium border', currentStage.color)}>
            <span>{currentStage.icon}</span>
            <span>{currentStage.label}</span>
          </div>
        </div>

        {/* Source */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Lead Source</div>
          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
            <span>{currentSource.icon}</span>
            <span>{currentSource.label}</span>
          </div>
        </div>

        {/* ICP Score */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">ICP Fit Score</div>
          <ICPScoreGauge score={icpFitScore} />
        </div>

        {/* Time in Pipeline */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">In Pipeline</div>
          <div className="text-sm font-medium text-gray-900">
            {createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: false }) : '-'}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            // Trigger command center action
            const event = new CustomEvent('openCommandCenter', {
              detail: { prefill: `Log outreach email for ${orgName}` }
            });
            window.dispatchEvent(event);
          }}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Log Outreach
        </button>
        <button
          onClick={() => {
            const event = new CustomEvent('openCommandCenter', {
              detail: { prefill: `Schedule demo for ${orgName}` }
            });
            window.dispatchEvent(event);
          }}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Schedule Demo
        </button>
        <button
          onClick={() => {
            const event = new CustomEvent('openCommandCenter', {
              detail: { prefill: `Add note for ${orgName}:` }
            });
            window.dispatchEvent(event);
          }}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Add Note
        </button>
      </div>

      {/* Activity Timeline - Collapsible */}
      <div className="mt-6 border-t border-blue-200 pt-4">
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Activity
            </h4>
            <svg className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4 max-h-64 overflow-y-auto">
            <ProspectActivityTimeline orgId={orgId} maxItems={5} />
          </div>
        </details>
      </div>
    </div>
  );
}

export default ProspectInfoSection;
