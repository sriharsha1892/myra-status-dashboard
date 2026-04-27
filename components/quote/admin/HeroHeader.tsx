'use client';

import React from 'react';
import { formatStatsCurrency } from '@/hooks/useQuoteMsaStats';

interface HeroHeaderProps {
  totalValue: number;
  quotesCount: number;
  msasCount: number;
  staleCount: number;
}

export function HeroHeader({ totalValue, quotesCount, msasCount, staleCount }: HeroHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-8 pt-2 pb-6 border-b border-neutral-200">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-1">
          Sales operations
        </p>
        <h1 className="font-serif text-5xl leading-[0.95] text-neutral-900 tracking-tight">
          Sales documents
          <span className="font-serif italic text-neutral-400 ml-2">archive</span>
        </h1>
      </div>

      <div className="text-right shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-1">
          Total contracted
        </div>
        <div className="font-serif text-5xl leading-none tabular-nums text-neutral-900">
          {formatStatsCurrency(totalValue)}
        </div>
        <div className="text-xs text-neutral-500 mt-2 tabular-nums">
          {quotesCount} quote{quotesCount === 1 ? '' : 's'}
          <span className="text-neutral-300 mx-2">·</span>
          {msasCount} MSA{msasCount === 1 ? '' : 's'}
          {staleCount > 0 && (
            <>
              <span className="text-neutral-300 mx-2">·</span>
              <span className="text-[#c2410c]">{staleCount} need{staleCount === 1 ? 's' : ''} attention</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
