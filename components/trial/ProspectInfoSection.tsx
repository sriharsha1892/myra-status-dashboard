'use client';

/**
 * ProspectInfoSection - Pipedrive-inspired prospect details and actions
 * Shows on the trial detail page when the organization is a prospect
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  PROSPECT_STAGES,
  getStageConfig,
  getSourceConfig,
  getActiveStages,
} from '@/lib/prospects/config';
import StagePipeline from '@/components/prospect/StagePipeline';
import DealHealthCard from '@/components/prospect/DealHealthCard';
import ProspectStageBadge from '@/components/prospect/ProspectStageBadge';
import ICPScoreIndicator from '@/components/prospect/ICPScoreIndicator';
import ProspectActivityTimeline from './ProspectActivityTimeline';
import {
  Target,
  ArrowRight,
  Mail,
  Calendar,
  FileText,
  Phone,
  ChevronDown,
  Clock,
  XCircle,
  Sparkles,
} from 'lucide-react';

interface ProspectInfoSectionProps {
  orgId: string;
  orgName: string;
  prospectStage?: string | null;
  prospectSource?: string | null;
  icpFitScore?: number | null;
  dealValue?: number | null;
  engagementScore?: number | null;
  createdAt?: string | null;
  stageChangedAt?: string | null;
  expectedCloseDate?: string | null;
  probability?: number | null;
  onStageChange?: (newStage: string) => void;
  onConvertToTrial?: () => void;
  onRefresh?: () => void;
}

export function ProspectInfoSection({
  orgId,
  orgName,
  prospectStage,
  prospectSource,
  icpFitScore,
  dealValue,
  engagementScore,
  createdAt,
  stageChangedAt,
  expectedCloseDate,
  probability,
  onStageChange,
  onConvertToTrial,
  onRefresh,
}: ProspectInfoSectionProps) {
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStageMenu, setShowStageMenu] = useState(false);

  const currentStage = getStageConfig(prospectStage);
  const currentSource = getSourceConfig(prospectSource);
  const activeStages = getActiveStages();
  const currentStageIndex = PROSPECT_STAGES.findIndex(s => s.value === prospectStage);

  const handleStageUpdate = async (newStage: string) => {
    setIsUpdating(true);
    setShowStageMenu(false);

    const fromStage = currentStage;
    const toStage = getStageConfig(newStage);

    try {
      const { error } = await supabase
        .from('trial_organizations')
        .update({
          prospect_stage: newStage,
          stage_changed_at: new Date().toISOString(),
        } as any)
        .eq('org_id', orgId);

      if (error) throw error;

      toast.success(
        <div className="flex items-center gap-2">
          <span className="font-medium">{orgName}</span>
          <span className="text-gray-400">→</span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${toStage.columnColor}20`,
              color: toStage.columnColor,
            }}
          >
            {toStage.label}
          </span>
        </div>,
        { duration: 3000 }
      );
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

      toast.success(
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-green-500" />
          <span className="font-medium">{orgName}</span>
          <span className="text-gray-600">converted to active trial!</span>
        </div>,
        { duration: 4000 }
      );
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
        .update({
          prospect_stage: 'disqualified',
          stage_changed_at: new Date().toISOString(),
        } as any)
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

  const triggerCommandCenter = (prefill: string) => {
    const event = new CustomEvent('openCommandCenter', {
      detail: { prefill }
    });
    window.dispatchEvent(event);
  };

  // Is disqualified?
  const isDisqualified = prospectStage === 'disqualified';

  return (
    <div className="space-y-6">
      {/* Main Prospect Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Header with gradient */}
        <div
          className="px-6 py-4 border-b"
          style={{
            background: `linear-gradient(135deg, ${currentStage.columnColor}10 0%, ${currentStage.columnColor}05 100%)`,
            borderColor: `${currentStage.columnColor}30`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${currentStage.columnColor}20` }}
              >
                <Target className="w-5 h-5" style={{ color: currentStage.columnColor }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Prospect Pipeline</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <ProspectStageBadge stage={prospectStage} />
                  {currentSource && (
                    <span className="text-xs text-gray-500">
                      via {currentSource.emoji} {currentSource.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!isDisqualified && (
              <div className="flex items-center gap-2">
                {/* Stage Change Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowStageMenu(!showStageMenu)}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    Change Stage
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showStageMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowStageMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                        {activeStages.map((stage) => {
                          const StageIcon = stage.icon;
                          const isActive = stage.value === prospectStage;

                          return (
                            <button
                              key={stage.value}
                              onClick={() => handleStageUpdate(stage.value)}
                              className={cn(
                                'w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors',
                                isActive
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'hover:bg-gray-50 text-gray-700'
                              )}
                            >
                              <div
                                className="w-6 h-6 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${stage.columnColor}20` }}
                              >
                                <StageIcon
                                  className="w-3.5 h-3.5"
                                  style={{ color: stage.columnColor }}
                                />
                              </div>
                              <span>{stage.label}</span>
                              {isActive && (
                                <span className="ml-auto text-blue-600">✓</span>
                              )}
                            </button>
                          );
                        })}

                        <div className="border-t border-gray-100 mt-2 pt-2">
                          <button
                            onClick={handleDisqualify}
                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                            </div>
                            <span>Disqualify</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Convert to Trial (show after demo_scheduled) */}
                {currentStageIndex >= 4 && (
                  <button
                    onClick={handleConvertToTrial}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Convert to Trial
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stage Pipeline Visualization */}
        <div className="px-6 py-6 border-b border-gray-100 bg-gray-50/50">
          <StagePipeline
            currentStage={prospectStage}
            onStageClick={isDisqualified ? undefined : handleStageUpdate}
            size="md"
          />
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-4 bg-white">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => triggerCommandCenter(`Log outreach email for ${orgName}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Mail className="w-4 h-4 text-blue-500" />
              Log Outreach
            </button>
            <button
              onClick={() => triggerCommandCenter(`Log call with ${orgName}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Phone className="w-4 h-4 text-green-500" />
              Log Call
            </button>
            <button
              onClick={() => triggerCommandCenter(`Schedule demo for ${orgName}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-violet-500" />
              Schedule Demo
            </button>
            <button
              onClick={() => triggerCommandCenter(`Add note for ${orgName}:`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-amber-500" />
              Add Note
            </button>
          </div>
        </div>
      </div>

      {/* Deal Health Card - Only show if not disqualified */}
      {!isDisqualified && (
        <DealHealthCard
          dealValue={dealValue}
          icpScore={icpFitScore}
          engagementScore={engagementScore}
          prospectStage={prospectStage}
          stageChangedAt={stageChangedAt}
          expectedCloseDate={expectedCloseDate}
          probability={probability}
          createdAt={createdAt}
        />
      )}

      {/* Activity Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <details className="group" open>
          <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">Recent Activity</h4>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="p-6 max-h-80 overflow-y-auto">
            <ProspectActivityTimeline orgId={orgId} maxItems={10} />
          </div>
        </details>
      </div>
    </div>
  );
}

export default ProspectInfoSection;
