'use client';

import { PipelineStage, PipelineStageStatus } from '@/lib/research-status';
import { cn } from '@/lib/utils';

interface PipelineStagesProps {
  stages: PipelineStage[];
}

// Status text mapping
const STATUS_TEXT: Record<PipelineStageStatus, string> = {
  operational: 'Operational',
  delayed: 'Delayed',
  unavailable: 'Unavailable',
};

// Status styling
const STATUS_STYLES: Record<PipelineStageStatus, string> = {
  operational: 'text-emerald-400',
  delayed: 'text-amber-400',
  unavailable: 'text-red-400',
};

export default function PipelineStages({ stages }: PipelineStagesProps) {
  // Check if any stage has issues
  const hasIssues = stages.some(s => s.status !== 'operational');

  return (
    <div
      className={cn(
        'rounded-xl border backdrop-blur-sm p-5',
        hasIssues
          ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-white/[0.02] border-white/10'
      )}
    >
      {/* Header */}
      <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wide">
        Research Pipeline
      </h3>

      {/* Pipeline Flow - Horizontal on desktop, vertical on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <div className="flex items-center justify-between min-w-max gap-2">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              {/* Stage Card */}
              <div className="flex flex-col items-center text-center min-w-[120px]">
                <span className="text-xs text-white/70 mb-1">{stage.name}</span>
                <span className={cn('text-xs font-medium', STATUS_STYLES[stage.status])}>
                  {STATUS_TEXT[stage.status]}
                </span>
              </div>

              {/* Arrow connector (not after last item) */}
              {index < stages.length - 1 && (
                <span className="text-white/30 mx-2 text-lg">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Vertical list */}
      <div className="md:hidden space-y-3">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 w-4">{index + 1}.</span>
              <span className="text-sm text-white/70">{stage.name}</span>
            </div>
            <span className={cn('text-sm font-medium', STATUS_STYLES[stage.status])}>
              {STATUS_TEXT[stage.status]}
            </span>
          </div>
        ))}
      </div>

      {/* Help text for pipeline */}
      <p className="mt-4 text-xs text-white/40 leading-relaxed">
        Research flows through these stages sequentially. Delays in any stage may affect overall completion time.
      </p>
    </div>
  );
}
