'use client';

import React, { useState } from 'react';
import { ProviderStatus } from '@/lib/types';
import { WORKFLOW_STAGES, getStageStatus } from '@/lib/workflow-config';
import { cn } from '@/lib/utils';

interface WorkflowStatusProps {
  providers: ProviderStatus[];
}

// Status configuration
const STATUS_CONFIG = {
  operational: {
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-400',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
    label: 'Operational',
  },
  degraded: {
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-400',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    label: 'Degraded',
  },
  outage: {
    bgClass: 'bg-red-500/15',
    borderClass: 'border-red-500/40',
    textClass: 'text-red-400',
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-500/20 border-red-500/40 text-red-400',
    label: 'Outage',
  },
  unknown: {
    bgClass: 'bg-gray-500/15',
    borderClass: 'border-gray-500/40',
    textClass: 'text-gray-400',
    dotClass: 'bg-gray-500',
    badgeClass: 'bg-gray-500/20 border-gray-500/40 text-gray-400',
    label: 'Unknown',
  },
} as const;

// Stage icons based on stage name
const getStageIcon = (stageName: string) => {
  if (stageName.toLowerCase().includes('ingest') || stageName.toLowerCase().includes('upload')) return '📥';
  if (stageName.toLowerCase().includes('process') || stageName.toLowerCase().includes('extract')) return '⚙️';
  if (stageName.toLowerCase().includes('enrich') || stageName.toLowerCase().includes('enhance')) return '✨';
  if (stageName.toLowerCase().includes('index') || stageName.toLowerCase().includes('search')) return '🔍';
  if (stageName.toLowerCase().includes('generation') || stageName.toLowerCase().includes('output')) return '📤';
  return '📊';
};

// Animated connector between stages
function StageConnector({ isOperational }: { isOperational: boolean }) {
  return (
    <div className="hidden md:flex items-center flex-1 min-w-[20px] max-w-[60px] px-1">
      <div className="relative w-full h-0.5">
        {/* Base line */}
        <div className={cn(
          'absolute inset-0 rounded-full',
          isOperational ? 'bg-emerald-500/30' : 'bg-amber-500/30'
        )} />
        {/* Animated flow dots */}
        <div className={cn(
          'absolute inset-0 overflow-hidden rounded-full',
          isOperational ? 'opacity-100' : 'opacity-50'
        )}>
          <div className={cn(
            'h-full w-2 rounded-full animate-flow',
            isOperational ? 'bg-emerald-400' : 'bg-amber-400'
          )} />
        </div>
        {/* Arrow head */}
        <div className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0',
          'border-l-[6px] border-y-[4px] border-y-transparent',
          isOperational ? 'border-l-emerald-500/50' : 'border-l-amber-500/50'
        )} />
      </div>
    </div>
  );
}

// Individual pipeline stage card
function PipelineStage({
  stage,
  index,
  status,
  isExpanded,
  onToggle,
  isAdminView
}: {
  stage: typeof WORKFLOW_STAGES[0];
  index: number;
  status: string;
  isExpanded: boolean;
  onToggle: () => void;
  isAdminView: boolean;
}) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;
  const icon = getStageIcon(stage.name);

  return (
    <div
      className={cn(
        'relative flex-1 min-w-[140px] max-w-[200px]',
        'rounded-xl border backdrop-blur-sm',
        'transition-all duration-200 cursor-pointer',
        config.bgClass,
        config.borderClass,
        'hover:scale-[1.02] hover:shadow-lg'
      )}
      onClick={onToggle}
    >
      {/* Stage number badge */}
      <div className={cn(
        'absolute -top-2 -left-2 w-6 h-6 rounded-full',
        'flex items-center justify-center',
        'text-[10px] font-bold text-white',
        'shadow-lg z-10',
        config.dotClass
      )}>
        {index + 1}
      </div>

      <div className="p-3">
        {/* Icon and Name */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{icon}</span>
          <h4 className="text-sm font-semibold text-white truncate flex-1">
            {stage.name}
          </h4>
        </div>

        {/* Status Badge */}
        <div className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border',
          config.badgeClass
        )}>
          <div className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)} />
          {config.label}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2 animate-fade-in">
            <p className="text-[11px] text-white/60 leading-relaxed">
              {stage.description}
            </p>
            {isAdminView && (
              <>
                <div className="text-[10px] text-white/40">
                  <span className="font-medium">Services:</span> {stage.primaryServices.join(', ')}
                </div>
                {stage.requiredModels && stage.requiredModels.length > 0 && (
                  <div className="text-[10px] text-white/40">
                    <span className="font-medium">Models:</span> {stage.requiredModels.join(', ')}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Click hint */}
      <div className="absolute bottom-1 right-2 text-[8px] text-white/30">
        {isExpanded ? '▲' : '▼'}
      </div>
    </div>
  );
}

export default function WorkflowStatus({ providers }: WorkflowStatusProps) {
  // Note: Admin view is now handled via /status/admin route instead of context toggle
  const isAdminView = false;
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  // Calculate stage statuses
  const stageStatuses = WORKFLOW_STAGES.map(stage => getStageStatus(stage, providers));
  const allOperational = stageStatuses.every(s => s === 'operational');
  const hasOutage = stageStatuses.some(s => s === 'outage');
  const healthyCount = stageStatuses.filter(s => s === 'operational').length;

  // Overall status
  const overallStatus = allOperational ? 'operational' : hasOutage ? 'outage' : 'degraded';
  const overallConfig = STATUS_CONFIG[overallStatus];

  const overallMessage = allOperational
    ? 'Research Pipeline Healthy'
    : hasOutage
    ? 'Pipeline Disrupted'
    : 'Pipeline Degraded';

  return (
    <div className="mb-6">
      {/* Overall Status Header */}
      <div className={cn(
        'rounded-xl border-2 backdrop-blur-xl p-4 mb-4',
        overallConfig.bgClass,
        overallConfig.borderClass
      )}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-3 h-3 rounded-full shadow-lg',
              overallConfig.dotClass,
              allOperational && 'animate-pulse-slow'
            )}
            style={{ boxShadow: `0 0 10px currentColor` }}
            />
            <div>
              <div className="text-base font-bold text-white">
                {overallMessage}
              </div>
              <div className="text-[11px] text-white/50">
                {WORKFLOW_STAGES.length} workflow stages • Click stages for details
              </div>
            </div>
          </div>
          <div className="text-sm font-semibold text-white/70">
            {healthyCount}/{WORKFLOW_STAGES.length} stages healthy
          </div>
        </div>
      </div>

      {/* Horizontal Pipeline */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 overflow-x-auto">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-5">
          Research Workflow Pipeline
        </h3>

        {/* Pipeline stages */}
        <div className="flex items-start gap-2 min-w-max md:min-w-0">
          {WORKFLOW_STAGES.map((stage, index) => {
            const status = stageStatuses[index];
            const isLastStage = index === WORKFLOW_STAGES.length - 1;
            const nextStageOperational = !isLastStage && stageStatuses[index + 1] === 'operational';

            return (
              <React.Fragment key={stage.id}>
                <PipelineStage
                  stage={stage}
                  index={index}
                  status={status}
                  isExpanded={expandedStage === stage.id}
                  onToggle={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                  isAdminView={isAdminView}
                />
                {!isLastStage && (
                  <StageConnector isOperational={status === 'operational' && nextStageOperational} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-white/8 flex items-center gap-5 flex-wrap text-[11px]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-white/50">Operational</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-white/50">Degraded</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-white/50">Outage</span>
          </div>
          <div className="ml-auto text-white/30">
            ← Data flows through stages →
          </div>
        </div>
      </div>

      {/* Add animation keyframes for flow effect */}
      <style jsx>{`
        @keyframes flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(1000%); }
        }
        .animate-flow {
          animation: flow 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
