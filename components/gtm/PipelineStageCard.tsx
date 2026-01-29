'use client';

import React from 'react';
import type { OrgSummary } from '@/hooks/useGtmDashboard';

interface PipelineStageCardProps {
  stage: string;
  label: string;
  count: number;
  value: number;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function PipelineStageCard({
  label,
  count,
  value,
  color,
  isSelected,
  onClick,
}: PipelineStageCardProps) {
  const formatValue = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return val > 0 ? `$${val.toFixed(0)}` : '';
  };

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        isSelected
          ? 'bg-neutral-900 text-white shadow-lg scale-105'
          : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
      }`}
    >
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: isSelected ? '#fff' : color }}
      />
      <span>{label}</span>
      <span className={`font-bold ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
        {count}
      </span>
      {value > 0 && (
        <span className={`text-xs ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
          {formatValue(value)}
        </span>
      )}
    </button>
  );
}

// Compact org row for the list view
export function CompactOrgRow({
  org,
  stageColor,
  onClick,
  onDragStart,
}: {
  org: OrgSummary;
  stageColor: string;
  onClick?: () => void;
  onDragStart?: () => void;
}) {
  const formatValue = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return val > 0 ? `$${val}` : '-';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-b-0 group"
    >
      <div
        className="w-1 h-8 rounded-full flex-shrink-0"
        style={{ backgroundColor: stageColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-neutral-900 truncate text-sm">
          {org.displayName || org.name}
        </div>
        {(org.salesPoc || org.vertical) && (
          <div className="text-xs text-neutral-500 truncate">
            {[org.salesPoc, org.vertical].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-medium text-neutral-700">
          {formatValue(org.dealValue || org.contractValue || org.arr || 0)}
        </div>
        {org.region && (
          <div className="text-xs text-neutral-400">{org.region}</div>
        )}
      </div>
    </div>
  );
}
