'use client';

import { ResearchEngineStatus } from '@/lib/research-status';
import { cn } from '@/lib/utils';

interface ResearchStatusHeroProps {
  status: ResearchEngineStatus;
  message: string;
  affectedStages: string[];
  lastUpdated: string;
  onNotifyClick?: () => void;
}

// Status configuration - no icons, text-based styling
const STATUS_CONFIG = {
  operational: {
    label: 'OPERATIONAL',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    labelBgClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
  },
  delayed: {
    label: 'EXPERIENCING DELAYS',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    labelBgClass: 'bg-amber-500',
    textClass: 'text-amber-400',
  },
  unavailable: {
    label: 'SERVICE INTERRUPTION',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    labelBgClass: 'bg-red-500',
    textClass: 'text-red-400',
  },
};

export default function ResearchStatusHero({
  status,
  message,
  affectedStages,
  lastUpdated,
  onNotifyClick,
}: ResearchStatusHeroProps) {
  const config = STATUS_CONFIG[status];

  // Format last updated time
  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        'rounded-2xl border-2 backdrop-blur-xl p-6 md:p-8 transition-all duration-300',
        config.bgClass,
        config.borderClass
      )}
    >
      {/* Status Label */}
      <div className="mb-4">
        <span
          className={cn(
            'inline-block text-xs font-bold px-3 py-1.5 rounded text-white uppercase tracking-widest',
            config.labelBgClass
          )}
        >
          {config.label}
        </span>
      </div>

      {/* Main Message */}
      <p className="text-lg md:text-xl text-white/90 leading-relaxed mb-4">
        {message}
      </p>

      {/* Affected Stages (if any) */}
      {status !== 'operational' && affectedStages.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-white/60">
            <span className="font-medium">Affected:</span>{' '}
            {affectedStages.join(', ')} services are being retried.
          </p>
        </div>
      )}

      {/* Actions and Metadata */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Notify Button (only show when not operational) */}
        {status !== 'operational' && onNotifyClick && (
          <button
            onClick={onNotifyClick}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-white/10 border border-white/20 text-white/90',
              'hover:bg-white/15 hover:border-white/30',
              'transition-all duration-200'
            )}
          >
            Notify me when resolved
          </button>
        )}

        {/* Last Updated */}
        <span className="text-xs text-white/50">
          Last checked: {formatLastUpdated(lastUpdated)}
        </span>
      </div>
    </div>
  );
}
