'use client';

import React from 'react';

interface FacetChipProps {
  label: string;
  active: boolean;
  count?: number;
  onToggle: () => void;
  /** Muted when nothing in the current data has this value. */
  disabled?: boolean;
}

export function FacetChip({ label, active, count, onToggle, disabled }: FacetChipProps) {
  return (
    <button type="button" className="mr-chip" onClick={onToggle} disabled={disabled} aria-pressed={active}>
      <span>{label}</span>
      {typeof count === 'number' && <span className="count tabular-nums">{count}</span>}
    </button>
  );
}

interface FacetGroupProps {
  label: string;
  children: React.ReactNode;
}

export function FacetGroup({ label, children }: FacetGroupProps) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="mr-eyebrow shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}
