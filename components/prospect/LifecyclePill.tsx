'use client';

import React from 'react';
import { ContactLifecycle, LIFECYCLE_CONFIG } from '@/lib/types/contact';
import { OrgLifecycleStage, LIFECYCLE_LABELS, getKanbanColumn } from '@/lib/types/organization';

interface LifecyclePillProps {
  stage: ContactLifecycle | OrgLifecycleStage;
  type?: 'contact' | 'org';
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

export function LifecyclePill({
  stage,
  type = 'contact',
  size = 'sm',
  showProgress = false,
  className = '',
}: LifecyclePillProps) {
  const sizeClasses = {
    sm: 'h-5 px-2 text-xs',
    md: 'h-6 px-2.5 text-sm',
    lg: 'h-7 px-3 text-sm',
  };

  if (type === 'org') {
    const column = getKanbanColumn(stage as OrgLifecycleStage);
    const label = LIFECYCLE_LABELS[stage as OrgLifecycleStage];

    return (
      <span
        className={`
          inline-flex items-center rounded-full font-medium
          ${column.bgColor} ${column.color} ${column.borderColor} border
          ${sizeClasses[size]}
          ${className}
        `}
      >
        {label}
      </span>
    );
  }

  const config = LIFECYCLE_CONFIG[stage as ContactLifecycle];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`
          inline-flex items-center rounded-full font-medium
          ${config.bgColor} ${config.color}
          ${sizeClasses[size]}
        `}
      >
        {config.label}
      </span>
      {showProgress && config.step > 0 && (
        <LifecycleProgress step={config.step} />
      )}
    </div>
  );
}

interface LifecycleProgressProps {
  step: number;
  totalSteps?: number;
  className?: string;
}

export function LifecycleProgress({
  step,
  totalSteps = 7,
  className = '',
}: LifecycleProgressProps) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={`
            h-1.5 w-1.5 rounded-full
            ${i < step ? 'bg-emerald-500' : 'bg-gray-200'}
          `}
        />
      ))}
    </div>
  );
}

interface LifecycleJourneyProps {
  currentStage: ContactLifecycle;
  className?: string;
}

export function LifecycleJourney({
  currentStage,
  className = '',
}: LifecycleJourneyProps) {
  const stages: ContactLifecycle[] = [
    'prospect',
    'demo_scheduled',
    'demo_attended',
    'trial_invited',
    'trial_active',
    'trial_ended',
    'customer',
  ];

  const currentConfig = LIFECYCLE_CONFIG[currentStage];
  const currentStep = currentConfig.step;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {stages.map((stage, i) => {
        const config = LIFECYCLE_CONFIG[stage];
        const isActive = config.step <= currentStep;
        const isCurrent = stage === currentStage;

        return (
          <React.Fragment key={stage}>
            {/* Connector line */}
            {i > 0 && (
              <div
                className={`
                  h-0.5 w-4 rounded
                  ${isActive ? 'bg-emerald-400' : 'bg-gray-200'}
                `}
              />
            )}
            {/* Stage dot */}
            <div
              className={`
                rounded-full transition-all duration-200
                ${isCurrent ? 'h-3 w-3 ring-2 ring-offset-1' : 'h-2 w-2'}
                ${isActive ? 'bg-emerald-500' : 'bg-gray-300'}
                ${isCurrent ? 'ring-emerald-300' : ''}
              `}
              title={config.label}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Special states that break the normal journey
interface LifecycleStatusProps {
  stage: ContactLifecycle;
  size?: 'sm' | 'md';
  className?: string;
}

export function LifecycleStatus({
  stage,
  size = 'sm',
  className = '',
}: LifecycleStatusProps) {
  const config = LIFECYCLE_CONFIG[stage];

  // Special handling for negative states
  const isNegative = stage === 'churned' || stage === 'inactive';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded font-medium
        ${config.bgColor} ${config.color}
        ${sizeClasses[size]}
        ${isNegative ? 'line-through opacity-75' : ''}
        ${className}
      `}
    >
      {config.label}
    </span>
  );
}
