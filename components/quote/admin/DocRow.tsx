'use client';

import React from 'react';
import { StatusDropdown } from '@/components/quote/StatusDropdown';
import type { DocStatus } from '@/hooks/useUpdateDocStatus';
import { currencySymbol, formatRelativeDate } from '@/lib/quote/format';

export interface DocRowItem {
  id: string;
  reference: string;
  companyName: string;
  totalValue: number;
  preparedBy: string;
  createdAt: string;
  currency: string;
  status?: string;
  downloadCount?: number;
  version?: number;
  type: 'Quote' | 'MSA';
}

interface DocRowProps {
  doc: DocRowItem;
  onClick: () => void;
  attentionLabel?: string; // e.g. "Stale 21d", "Draft, never sent"
  index: number;
}

export function DocRow({ doc, onClick, attentionLabel, index }: DocRowProps) {
  const zebra = index % 2 === 1;
  const edge = doc.type === 'Quote' ? 'before:bg-[#FF6B6B]' : 'before:bg-neutral-300';

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer transition-colors before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full ${edge} ${
        zebra ? 'bg-neutral-50/40' : 'bg-transparent'
      } hover:bg-neutral-100/60`}
    >
      <div className="px-4 py-3.5 pl-5">
        {/* Line 1: Company + money */}
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0 flex items-baseline gap-3">
            <h3 className="font-serif text-[19px] leading-tight text-neutral-900 truncate">
              {doc.companyName}
            </h3>
            {attentionLabel && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c2410c] whitespace-nowrap">
                {attentionLabel}
              </span>
            )}
          </div>
          <span className="font-serif text-[20px] tabular-nums text-neutral-900 whitespace-nowrap">
            {currencySymbol(doc.currency)}
            {doc.totalValue.toLocaleString()}
          </span>
        </div>

        {/* Line 2: meta */}
        <div className="flex items-center justify-between gap-3 mt-1.5">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 min-w-0 flex-wrap">
            <span className="font-mono text-[10.5px] text-neutral-400 uppercase tracking-wide">
              {doc.type === 'Quote' ? 'Q' : 'M'} · {doc.reference}
              {(doc.version ?? 0) > 1 && <span className="text-neutral-300"> · v{doc.version}</span>}
            </span>
            <span className="text-neutral-300">·</span>
            <span>{doc.preparedBy || 'Unassigned'}</span>
            <span className="text-neutral-300">·</span>
            <span>{formatRelativeDate(doc.createdAt)}</span>
            {(doc.downloadCount ?? 0) > 0 && (
              <>
                <span className="text-neutral-300">·</span>
                <span className="text-neutral-400 tabular-nums">
                  {doc.downloadCount} dl
                </span>
              </>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <StatusDropdown id={doc.id} type={doc.type} status={(doc.status as DocStatus) || 'draft'} />
          </div>
        </div>
      </div>
    </div>
  );
}
