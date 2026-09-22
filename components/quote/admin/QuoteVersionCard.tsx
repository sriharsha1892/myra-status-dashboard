'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { RegisterQuote } from '@/lib/quote/types';
import { formatLongDate } from '@/lib/quote/format';
import { OptionsTable } from './OptionsTable';
import { StatusBadge } from './StatusBadge';
import { AmAvatar } from './AmAvatar';

interface QuoteVersionCardProps {
  quote: RegisterQuote;
  onOpen: () => void;
}

export function QuoteVersionCard({ quote, onOpen }: QuoteVersionCardProps) {
  return (
    <article className="mr-event p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 group">
            <span className="mr-mono text-[12px] font-semibold text-[var(--fg)]">{quote.reference}</span>
            {quote.version > 1 && (
              <span className="mr-mono text-[11px] text-[var(--fg-faint)]">v{quote.version}</span>
            )}
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--fg-faint)] group-hover:text-[var(--primary)] transition-colors" />
          </button>
          <span className="text-[12.5px] font-normal text-[var(--fg-faint)]">{formatLongDate(quote.createdAt)}</span>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--fg-dim)]">
            <AmAvatar name={quote.preparedBy || '?'} size={18} />
            {quote.preparedBy || 'Unassigned'}
          </span>
          {quote.contactName && (
            <span className="text-[12.5px] font-normal text-[var(--fg-faint)] truncate">for {quote.contactName}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {quote.validUntil && (
            <span className="text-[12px] font-normal text-[var(--fg-faint)]">
              Valid until {formatLongDate(quote.validUntil)}
            </span>
          )}
          <StatusBadge status={quote.effectiveStatus} />
        </div>
      </div>

      <div className="mt-3">
        <OptionsTable options={quote.options} currency={quote.currency} />
      </div>
    </article>
  );
}
