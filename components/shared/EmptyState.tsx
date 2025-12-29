'use client';

import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  compact?: boolean;
  className?: string;
}

/**
 * Reusable empty state component with optional CTA
 *
 * Usage:
 * <EmptyState
 *   icon={Building2}
 *   title="No prospects yet"
 *   description="Add your first prospect to get started."
 *   action={{ label: "Add Prospect", onClick: () => {} }}
 * />
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className = '',
}: EmptyStateProps) {
  const ActionIcon = action?.icon || Plus;

  if (compact) {
    return (
      <div className={`h-32 rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 ${className}`}>
        <Icon className="w-6 h-6 text-neutral-300" />
        <p className="text-sm text-neutral-400">{title}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
          >
            <ActionIcon className="w-3.5 h-3.5" />
            {action.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 bg-white/50 rounded-2xl border border-dashed border-neutral-200 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-neutral-400" />
      </div>
      <p className="text-neutral-700 font-medium text-center">{title}</p>
      {description && (
        <p className="text-sm text-neutral-500 mt-1 text-center max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <ActionIcon className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}
