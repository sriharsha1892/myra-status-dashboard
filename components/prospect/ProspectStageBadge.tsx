'use client';

/**
 * ProspectStageBadge - Unified stage badge component
 * Pipedrive-inspired with icon, color, and optional mini mode
 */

import { cn } from '@/lib/utils';
import { getStageConfig, type ProspectStageConfig } from '@/lib/prospects/config';

interface ProspectStageBadgeProps {
  stage: string | undefined | null;
  /** 'default' shows icon + label, 'compact' shows icon only, 'mini' shows dot only */
  variant?: 'default' | 'compact' | 'mini';
  /** Additional classes */
  className?: string;
  /** Show border */
  showBorder?: boolean;
}

export default function ProspectStageBadge({
  stage,
  variant = 'default',
  className,
  showBorder = true,
}: ProspectStageBadgeProps) {
  const config = getStageConfig(stage);
  const Icon = config.icon;

  if (variant === 'mini') {
    return (
      <div
        className={cn(
          'w-2.5 h-2.5 rounded-full',
          className
        )}
        style={{ backgroundColor: config.columnColor }}
        title={config.label}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center w-7 h-7 rounded-lg',
          config.badgeBg,
          className
        )}
        title={config.label}
      >
        <Icon className={cn('w-4 h-4', config.badgeText)} />
      </div>
    );
  }

  // Default variant
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.badgeBg,
        config.badgeText,
        showBorder && `border ${config.badgeBorder}`,
        'transition-all duration-200',
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Stage badge with dropdown for selection
 */
interface ProspectStageSelectProps {
  value: string | undefined | null;
  onChange: (newStage: string) => void;
  disabled?: boolean;
  excludeTerminal?: boolean;
  className?: string;
}

export function ProspectStageSelect({
  value,
  onChange,
  disabled = false,
  excludeTerminal = false,
  className,
}: ProspectStageSelectProps) {
  const { getActiveStages, PROSPECT_STAGES } = require('@/lib/prospects/config');
  const stages = excludeTerminal ? getActiveStages() : PROSPECT_STAGES;
  const currentConfig = getStageConfig(value);

  return (
    <div className={cn('relative inline-block', className)}>
      <select
        value={value || 'cold_lead'}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'appearance-none cursor-pointer rounded-full pl-8 pr-6 py-1.5 text-xs font-medium border',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          currentConfig.badgeBg,
          currentConfig.badgeText,
          currentConfig.badgeBorder,
          `focus:ring-${currentConfig.accentColor}-300`,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {stages.map((stage: ProspectStageConfig) => (
          <option key={stage.value} value={stage.value}>
            {stage.emoji} {stage.label}
          </option>
        ))}
      </select>
      {/* Icon overlay */}
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
        <currentConfig.icon className={cn('w-3.5 h-3.5', currentConfig.badgeText)} />
      </div>
      {/* Dropdown arrow */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className={cn('w-3 h-3', currentConfig.badgeText)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
