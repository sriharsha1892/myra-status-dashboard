'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { Account, RegisterQuote } from '@/lib/quote/types';
import { currencySymbol, formatRelativeDate } from '@/lib/quote/format';
import { compactMoney, shortTerm } from '@/lib/quote/register';
import { QuoteVersionCard } from './QuoteVersionCard';
import { StatusBadge } from './StatusBadge';
import { AmAvatar } from './AmAvatar';

interface AccountRowProps {
  account: Account;
  /** Quotes that pass the current filters (newest first). */
  visible: RegisterQuote[];
  /** Quote versions on this account hidden by the current filters. */
  hidden: number;
  expanded: boolean;
  onToggle: () => void;
  onOpenQuote: (id: string) => void;
}

const MAX_SUMMARY_CHIPS = 4;

function OptionChip({ o, currency }: { o: RegisterQuote['options'][number]; currency: string }) {
  const parts: string[] = [];
  if (o.term) parts.push(shortTerm(o.term));
  if (o.model === 'per-project') {
    if (o.projects) parts.push(`${o.projects} projects`);
  } else if (o.users) {
    parts.push(`${o.users} ${o.users === '1' ? 'user' : 'users'}`);
  }
  return (
    <span className="mr-opt">
      {parts.length > 0 && <span>{parts.join(' · ')}</span>}
      <b>{o.price == null ? 'No price' : `${currencySymbol(currency)}${compactMoney(o.price)}`}</b>
    </span>
  );
}

export function AccountRow({ account, visible, hidden, expanded, onToggle, onOpenQuote }: AccountRowProps) {
  const latest = visible[0];
  const versions = account.quotes.length;
  const ams = Array.from(new Set(visible.map((q) => q.preparedBy).filter(Boolean)));
  const chips = latest.options.slice(0, MAX_SUMMARY_CHIPS);
  const more = latest.options.length - chips.length;

  return (
    <div className="mr-row border-t border-[var(--hairline)] first:border-t-0" data-open={expanded ? 'true' : 'false'}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3 grid grid-cols-[16px_minmax(220px,1.1fr)_minmax(0,1.6fr)_auto] items-center gap-4"
      >
        <ChevronRight
          className={`w-4 h-4 text-[var(--fg-faint)] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />

        {/* Company + AMs */}
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[var(--fg)] truncate">{account.companyName}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--fg-dim)] min-w-0">
            <span className="flex -space-x-1">
              {ams.slice(0, 3).map((am) => (
                <span key={am} className="ring-2 ring-[var(--card)] rounded-[6px]">
                  <AmAvatar name={am} size={18} />
                </span>
              ))}
            </span>
            <span className="truncate">{ams.length > 0 ? ams.join(', ') : 'Unassigned'}</span>
            <span className="text-[var(--fg-faint)] font-normal whitespace-nowrap">
              · {visible.length} {visible.length === 1 ? 'quote' : 'quotes'}
              {versions > visible.length && ` of ${versions}`}
            </span>
          </div>
        </div>

        {/* Options on the latest quote */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {chips.length === 0 ? (
            <span className="text-[12px] font-normal text-[var(--fg-faint)]">No options recorded</span>
          ) : (
            chips.map((o, i) => <OptionChip key={i} o={o} currency={latest.currency} />)
          )}
          {more > 0 && <span className="text-[12px] font-normal text-[var(--fg-faint)]">+{more}</span>}
        </div>

        {/* Date + status */}
        <div className="flex items-center gap-3 justify-end">
          <span className="text-[12px] font-normal text-[var(--fg-faint)] whitespace-nowrap">
            {formatRelativeDate(latest.createdAt)}
          </span>
          <StatusBadge status={latest.status} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-12 space-y-3">
          {visible.map((q) => (
            <QuoteVersionCard key={q.id} quote={q} onOpen={() => onOpenQuote(q.id)} />
          ))}
          {hidden > 0 && (
            <p className="text-[12px] font-normal text-[var(--fg-faint)]">
              {hidden} more {hidden === 1 ? 'version is' : 'versions are'} hidden by the current filters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
