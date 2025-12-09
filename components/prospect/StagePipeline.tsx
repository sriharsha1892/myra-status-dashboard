'use client';

/**
 * StagePipeline - Visual pipeline progress component
 * Shows prospect journey through stages with connected nodes
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  PROSPECT_STAGES,
  getActiveStages,
  getStageConfig,
  getStageIndex,
  type ProspectStageConfig,
} from '@/lib/prospects/config';
import { Check } from 'lucide-react';

interface StagePipelineProps {
  currentStage: string | undefined | null;
  /** Callback when a stage node is clicked */
  onStageClick?: (stage: string) => void;
  /** Show only active (non-terminal) stages */
  activeOnly?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional classes */
  className?: string;
}

export default function StagePipeline({
  currentStage,
  onStageClick,
  activeOnly = true,
  size = 'md',
  className,
}: StagePipelineProps) {
  const stages = useMemo(
    () => (activeOnly ? getActiveStages() : PROSPECT_STAGES),
    [activeOnly]
  );

  const currentIndex = getStageIndex(currentStage);

  // Size configurations
  const sizeConfig = {
    sm: {
      node: 'w-8 h-8',
      icon: 'w-4 h-4',
      check: 'w-3 h-3',
      text: 'text-[10px]',
      connector: 'h-0.5',
      gap: 'gap-1',
    },
    md: {
      node: 'w-10 h-10',
      icon: 'w-5 h-5',
      check: 'w-4 h-4',
      text: 'text-xs',
      connector: 'h-1',
      gap: 'gap-2',
    },
    lg: {
      node: 'w-12 h-12',
      icon: 'w-6 h-6',
      check: 'w-5 h-5',
      text: 'text-sm',
      connector: 'h-1.5',
      gap: 'gap-3',
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between relative">
        {/* Background connector line */}
        <div
          className={cn(
            'absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-gray-200 rounded-full',
            config.connector
          )}
          style={{ margin: '0 20px' }}
        />

        {/* Progress line (filled portion) */}
        <div
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 rounded-full transition-all duration-500',
            config.connector
          )}
          style={{
            marginLeft: '20px',
            width: `calc(${Math.min(currentIndex / (stages.length - 1), 1) * 100}% - 40px)`,
            background: 'linear-gradient(90deg, #22c55e 0%, #3b82f6 50%, #8b5cf6 100%)',
          }}
        />

        {/* Stage nodes */}
        {stages.map((stage, index) => (
          <StageNode
            key={stage.value}
            stage={stage}
            index={index}
            currentIndex={currentIndex}
            onClick={onStageClick}
            config={config}
          />
        ))}
      </div>
    </div>
  );
}

// Individual stage node
function StageNode({
  stage,
  index,
  currentIndex,
  onClick,
  config,
}: {
  stage: ProspectStageConfig;
  index: number;
  currentIndex: number;
  onClick?: (stage: string) => void;
  config: {
    node: string;
    icon: string;
    check: string;
    text: string;
    connector: string;
    gap: string;
  };
}) {
  const Icon = stage.icon;
  const isCompleted = index < currentIndex;
  const isCurrent = index === currentIndex;
  const isFuture = index > currentIndex;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center z-10',
        config.gap,
        onClick && 'cursor-pointer group'
      )}
      onClick={() => onClick?.(stage.value)}
    >
      {/* Node circle */}
      <div
        className={cn(
          'rounded-full flex items-center justify-center transition-all duration-300',
          config.node,
          // State-based styling
          isCompleted && 'bg-green-500 text-white shadow-md',
          isCurrent && 'ring-4 shadow-lg scale-110',
          isFuture && 'bg-white border-2 border-gray-300 text-gray-400',
          // Hover effect
          onClick && 'group-hover:scale-110 group-hover:shadow-md'
        )}
        style={{
          backgroundColor: isCurrent ? stage.columnColor : isCompleted ? undefined : undefined,
          // Use CSS variable for ring color
          ['--tw-ring-color' as string]: isCurrent ? `${stage.columnColor}40` : undefined,
        }}
      >
        {isCompleted ? (
          <Check className={cn(config.check, 'stroke-[3]')} />
        ) : (
          <Icon
            className={config.icon}
            style={{ color: isCurrent ? 'white' : isFuture ? undefined : stage.columnColor }}
          />
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          'font-medium whitespace-nowrap transition-colors',
          config.text,
          isCurrent && 'font-bold',
          isCompleted && 'text-green-600',
          isFuture && 'text-gray-400'
        )}
        style={{ color: isCurrent ? stage.columnColor : undefined }}
      >
        {stage.shortLabel}
      </span>
    </div>
  );
}

/**
 * Compact horizontal pipeline for cards
 */
export function StagePipelineCompact({
  currentStage,
  className,
}: {
  currentStage: string | undefined | null;
  className?: string;
}) {
  const stages = getActiveStages();
  const currentIndex = getStageIndex(currentStage);
  const currentConfig = getStageConfig(currentStage);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {stages.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div
            key={stage.value}
            className={cn(
              'flex-1 h-1.5 rounded-full transition-all duration-300',
              isCompleted && 'bg-green-500',
              isCurrent && 'relative'
            )}
            style={{
              backgroundColor: isCurrent
                ? stage.columnColor
                : isCompleted
                ? undefined
                : '#e5e7eb',
            }}
            title={stage.label}
          >
            {isCurrent && (
              <div
                className="absolute -top-0.5 -bottom-0.5 left-0 right-0 rounded-full ring-2 ring-offset-1"
                style={{ ['--tw-ring-color' as string]: `${stage.columnColor}50` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Vertical pipeline for sidebar/detail views
 */
export function StagePipelineVertical({
  currentStage,
  onStageClick,
  className,
}: {
  currentStage: string | undefined | null;
  onStageClick?: (stage: string) => void;
  className?: string;
}) {
  const stages = getActiveStages();
  const currentIndex = getStageIndex(currentStage);

  return (
    <div className={cn('space-y-0', className)}>
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;
        const isLast = index === stages.length - 1;

        return (
          <div
            key={stage.value}
            className={cn(
              'flex gap-3',
              onStageClick && 'cursor-pointer group'
            )}
            onClick={() => onStageClick?.(stage.value)}
          >
            {/* Timeline column */}
            <div className="flex flex-col items-center">
              {/* Node */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                  isCompleted && 'bg-green-500 text-white',
                  isCurrent && 'ring-2 ring-offset-2',
                  isFuture && 'bg-gray-100 text-gray-400 border-2 border-gray-300',
                  onStageClick && 'group-hover:scale-110'
                )}
                style={{
                  backgroundColor: isCurrent ? stage.columnColor : undefined,
                  ['--tw-ring-color' as string]: isCurrent ? `${stage.columnColor}40` : undefined,
                }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <Icon
                    className="w-4 h-4"
                    style={{ color: isCurrent ? 'white' : undefined }}
                  />
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[24px]',
                    index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-medium',
                  isCompleted && 'text-green-600',
                  isCurrent && 'font-bold',
                  isFuture && 'text-gray-400'
                )}
                style={{ color: isCurrent ? stage.columnColor : undefined }}
              >
                {stage.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isCompleted && 'Completed'}
                {isCurrent && 'Current stage'}
                {isFuture && 'Upcoming'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
