'use client';

import React from 'react';

interface SectionHeaderProps {
  label: string;
  count?: number;
  countLabel?: string;
  tone?: 'default' | 'warning';
  action?: React.ReactNode;
}

export function SectionHeader({ label, count, countLabel, tone = 'default', action }: SectionHeaderProps) {
  const labelColor = tone === 'warning' ? 'text-[#c2410c]' : 'text-neutral-500';
  const ruleColor = tone === 'warning' ? 'border-[#fed7aa]' : 'border-neutral-200';

  return (
    <div className={`flex items-baseline justify-between border-b ${ruleColor} pb-2 mb-3 mt-8 first:mt-0`}>
      <div className="flex items-baseline gap-3">
        <h2 className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${labelColor}`}>
          {label}
        </h2>
        {typeof count === 'number' && (
          <span className="text-[11px] text-neutral-400 tabular-nums">
            {count} {countLabel ?? `result${count === 1 ? '' : 's'}`}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}
