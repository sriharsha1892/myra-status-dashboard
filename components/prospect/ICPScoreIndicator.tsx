'use client';

/**
 * ICPScoreIndicator - Unified ICP score display component
 * Three modes: badge (compact), gauge (circular ring), bar (horizontal)
 * Pipedrive-inspired visual styling
 */

import { cn } from '@/lib/utils';
import { getICPTier } from '@/lib/prospects/config';
import { Target, Star } from 'lucide-react';

interface ICPScoreIndicatorProps {
  score: number | undefined | null;
  /** 'badge' = compact pill, 'gauge' = circular ring, 'bar' = horizontal progress */
  variant?: 'badge' | 'gauge' | 'bar';
  /** Size for gauge variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show label text */
  showLabel?: boolean;
  /** Additional classes */
  className?: string;
}

export default function ICPScoreIndicator({
  score,
  variant = 'badge',
  size = 'md',
  showLabel = false,
  className,
}: ICPScoreIndicatorProps) {
  const tier = getICPTier(score);

  // Empty state
  if (score === undefined || score === null || !tier) {
    if (variant === 'badge') {
      return (
        <span className={cn('text-xs text-gray-400', className)}>-</span>
      );
    }
    if (variant === 'gauge') {
      return (
        <div className={cn('flex items-center justify-center', className)}>
          <div className="text-gray-300">
            <Target className="w-5 h-5" />
          </div>
        </div>
      );
    }
    return (
      <div className={cn('text-sm text-gray-400', className)}>Not scored</div>
    );
  }

  // Badge variant - compact pill with percentage
  if (variant === 'badge') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
          tier.badgeBg,
          tier.badgeText,
          className
        )}
        title={tier.label}
      >
        <Star className="w-3 h-3" />
        {score}%
      </span>
    );
  }

  // Gauge variant - circular progress ring
  if (variant === 'gauge') {
    const sizeConfig = {
      sm: { wrapper: 'w-10 h-10', stroke: 3, textSize: 'text-[10px]' },
      md: { wrapper: 'w-14 h-14', stroke: 4, textSize: 'text-xs' },
      lg: { wrapper: 'w-20 h-20', stroke: 5, textSize: 'text-sm' },
    };
    const config = sizeConfig[size];

    // SVG circle calculations
    const radius = 50 - config.stroke;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className={cn('relative', config.wrapper, className)}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(tier.ringClass, 'transition-all duration-500')}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', config.textSize, tier.badgeText)}>
            {score}%
          </span>
          {showLabel && size !== 'sm' && (
            <span className="text-[8px] text-gray-500 font-medium">
              {tier.shortLabel}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Bar variant - horizontal progress bar
  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">ICP Score</span>
          <span className={cn('font-semibold', tier.badgeText)}>{tier.label}</span>
        </div>
      )}
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-500',
            tier.gradient
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      {!showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className={cn('font-semibold', tier.badgeText)}>{score}%</span>
          <span className="text-gray-400">{tier.shortLabel}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact ICP dot indicator for cards
 */
interface ICPDotProps {
  score: number | undefined | null;
  showScore?: boolean;
  className?: string;
}

export function ICPDot({ score, showScore = true, className }: ICPDotProps) {
  const tier = getICPTier(score);

  if (!tier || score === undefined || score === null) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)} title={`ICP: ${score}% - ${tier.label}`}>
      <div
        className="w-2.5 h-2.5 rounded-full"
        style={{
          background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))`,
        }}
      >
        <div className={cn('w-full h-full rounded-full bg-gradient-to-br', tier.gradient)} />
      </div>
      {showScore && (
        <span className={cn('text-xs font-medium', tier.badgeText)}>{score}%</span>
      )}
    </div>
  );
}

/**
 * ICP Score with ring - for Kanban cards
 */
interface ICPRingProps {
  score: number | undefined | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function ICPRing({ score, size = 'sm', className }: ICPRingProps) {
  const tier = getICPTier(score);

  if (!tier || score === undefined || score === null) {
    return (
      <div className={cn('rounded-full bg-gray-100 flex items-center justify-center', {
        'w-6 h-6': size === 'xs',
        'w-8 h-8': size === 'sm',
        'w-10 h-10': size === 'md',
      }, className)}>
        <span className="text-[10px] text-gray-400">-</span>
      </div>
    );
  }

  const sizeConfig = {
    xs: { wrapper: 'w-6 h-6', stroke: 2, text: 'text-[8px]' },
    sm: { wrapper: 'w-8 h-8', stroke: 2.5, text: 'text-[10px]' },
    md: { wrapper: 'w-10 h-10', stroke: 3, text: 'text-xs' },
  };
  const config = sizeConfig[size];

  const radius = 50 - config.stroke * 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('relative', config.wrapper, className)} title={`ICP: ${score}% - ${tier.label}`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke * 5}
          className="text-gray-100"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke * 5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(tier.ringClass, 'transition-all duration-300')}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn('font-bold', config.text, tier.badgeText)}>
          {score}
        </span>
      </div>
    </div>
  );
}
