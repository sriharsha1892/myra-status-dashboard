'use client';

import { Building2, TrendingUp } from 'lucide-react';

interface OrgDemandBadgeProps {
  orgCount: number;
  maxPriorityLevel?: number; // 1-4 (low, medium, high, critical)
  linkTypes?: string[];
  className?: string;
}

/**
 * OrgDemandBadge Component
 *
 * Displays organization demand for a roadmap item with:
 * - Count of interested organizations
 * - Color coding based on priority level
 * - Hover tooltip showing link types (interested, requested, committed, etc.)
 */
export function OrgDemandBadge({
  orgCount,
  maxPriorityLevel = 0,
  linkTypes = [],
  className = '',
}: OrgDemandBadgeProps) {
  if (orgCount === 0) return null;

  // Determine color based on priority level
  const getColorClasses = () => {
    if (maxPriorityLevel >= 4) {
      // Critical
      return 'bg-red-100 text-red-700 border-red-300 ring-red-500/20';
    } else if (maxPriorityLevel >= 3) {
      // High
      return 'bg-orange-100 text-orange-700 border-orange-300 ring-orange-500/20';
    } else if (maxPriorityLevel >= 2) {
      // Medium
      return 'bg-blue-100 text-blue-700 border-blue-300 ring-blue-500/20';
    } else {
      // Low or no priority
      return 'bg-slate-100 text-slate-700 border-slate-300 ring-slate-500/20';
    }
  };

  // Determine glow intensity (for high-demand items)
  const shouldGlow = orgCount >= 3 || maxPriorityLevel >= 3;

  const formattedLinkTypes = linkTypes
    .map((type) => {
      const formatted = type.replace(/_/g, ' ');
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    })
    .join(', ');

  const priorityLabel = maxPriorityLevel >= 4 ? 'Critical priority' : maxPriorityLevel === 3 ? 'High priority' : '';
  const tooltipText = [
    `${orgCount} ${orgCount === 1 ? 'Organization' : 'Organizations'}`,
    linkTypes.length > 0 ? `Types: ${formattedLinkTypes}` : '',
    priorityLabel,
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
        border transition-all duration-200 cursor-help
        ${getColorClasses()}
        ${shouldGlow ? 'ring-2 ring-offset-1 shadow-sm animate-pulse-soft' : ''}
        ${className}
      `}
      title={tooltipText}
    >
      <Building2 className="w-3.5 h-3.5" />
      <span className="font-semibold">{orgCount}</span>
      {orgCount >= 5 && <TrendingUp className="w-3 h-3 ml-0.5" />}
    </div>
  );
}

// Soft pulse animation for high-demand items
const pulseStyles = `
@keyframes pulse-soft {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

.animate-pulse-soft {
  animation: pulse-soft 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
`;

// Inject styles
if (typeof window !== 'undefined') {
  const styleId = 'org-demand-badge-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = pulseStyles;
    document.head.appendChild(style);
  }
}
