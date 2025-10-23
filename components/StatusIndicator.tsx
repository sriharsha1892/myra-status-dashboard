'use client';

import { ServiceStatus } from '@/lib/types';

interface StatusIndicatorProps {
  status: ServiceStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPulse?: boolean;
}

export default function StatusIndicator({
  status,
  size = 'md',
  showLabel = true,
  showPulse = false
}: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusConfig = {
    operational: {
      color: 'bg-emerald-500',
      label: 'Operational',
      textColor: 'text-emerald-700',
    },
    degraded_performance: {
      color: 'bg-amber-500',
      label: 'Degraded Performance',
      textColor: 'text-amber-700',
    },
    partial_outage: {
      color: 'bg-orange-500',
      label: 'Partial Outage',
      textColor: 'text-orange-700',
    },
    major_outage: {
      color: 'bg-red-500',
      label: 'Major Outage',
      textColor: 'text-red-700',
    },
    under_maintenance: {
      color: 'bg-blue-500',
      label: 'Under Maintenance',
      textColor: 'text-blue-700',
    },
    unknown: {
      color: 'bg-gray-400',
      label: 'Unknown',
      textColor: 'text-gray-700',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} ${config.color} rounded-full ${showPulse && status !== 'operational' ? 'pulse-ring' : ''}`} />
      {showLabel && (
        <span className={`text-sm font-medium ${config.textColor}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}
