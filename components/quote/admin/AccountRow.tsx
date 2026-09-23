'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { Account, RegisterQuote } from '@/lib/quote/types';
import { currencySymbol, formatLongDate, formatRelativeDate } from '@/lib/quote/format';
import { compactMoney, shortTerm } from '@/lib/quote/register';
import { QuoteVersionCard } from './QuoteVersionCard';
import { StatusBadge } from './StatusBadge';
import { Highlight } from './Highlight';

interface AccountRowProps {
  account: Account;
  /** Quotes that pass the current filters (newest first). */
  visible: RegisterQuote[];
  /** Quote versions on this account hidden by the current filters. */
  hidden: number;
  expanded: boolean;
  /** Current search text, for match highlighting. */
  highlight: string;
  onToggle: () => void;
  onOpenQuote: (id: string) => void;
  /** Clicking an AM name narrows the list to that AM. */
  onFilterAm: (name: string) => void;
}

const MAX_SUMMARY_CHIPS = 4;

function chipText(o: RegisterQuote['options'][number], includeTerm: boolean): string {
  const parts: string[] = [];
  if (includeTerm && o.term) parts.push(shortTerm(o.term));
  if (o.model === 'per-project') {
    if (o.projects) parts.push(`${o.projects} projects`);
  } else if (o.users) {
    parts.push(`${o.users} ${o.users === '1' ? 'user' : 'users'}`);
  }
  return parts.join(' · ');
}

/**
 * Option chips for the latest quote. When every option shares one term, the
 * term is stated once so the chips read as the real choice: seats and price.
 */
function OptionSummary({ quote }: { quote: RegisterQuote }) {
  const options = quote.options;
  if (options.length === 0) {
    return <span className="text-[12px] font-normal text-[var(--fg-faint)]">No options recorded</span>;
  }
  const terms = new Set(options.map((o) => o.term).filter(Boolean));
  const sharedTerm = terms.size === 1 && options.length > 1 ? shortTerm(Array.from(terms)[0]) : null;
  const chips = options.slice(0, MAX_SUMMARY_CHIPS);
  const more = options.length - chips.length;
  const sym = currencySymbol(quote.currency);

  return (
    <>
      {sharedTerm && (
        <span className="text-[11.5px] font-medium text-[var(--fg-faint)] whitespace-nowrap mr-0.5">{sharedTerm}</span>
      )}
      {chips.map((o, i) => {
        const label = chipText(o, !sharedTerm);
        return (
          <span key={i} className="mr-opt">
            {label && <span>{label}</span>}
            <b className={o.price == null ? 'text-[var(--fg-faint)] font-medium' : ''}>
              {o.price == null ? 'no price' : `${sym}${compactMoney(o.price)}`}
            </b>
          </span>
        );
      })}
      {more > 0 && <span className="text-[12px] font-normal text-[var(--fg-faint)]">+{more}</span>}
    </>
  );
}

export function AccountRow({
  account,
  visible,
  hidden,
  expanded,
  highlight,
  onToggle,
  onOpenQuote,
  onFilterAm,
}: AccountRowProps) {
  const latest = visible[0];
  const versions = account.quotes.length;
  const ams = Array.from(new Set(visible.map((q) => q.preparedBy).filter(Boolean)));

  return (
    <div className="mr-row border-t border-[var(--hairline)] first:border-t-0" data-open={expanded ? 'true' : 'false'}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3 grid grid-cols-[16px_minmax(220px,1.1fr)_minmax(0,1.6fr)_auto] items-center gap-4 cursor-pointer"
      >
        <ChevronRight
          className={`w-4 h-4 text-[var(--fg-faint)] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />

        {/* Company + AMs */}
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[var(--fg)] truncate">
            <Highlight text={account.companyName} query={highlight} />
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--fg-dim)] min-w-0 flex-wrap">
            {ams.length === 0 ? (
              <span className="font-normal text-[var(--fg-faint)]">Unassigned</span>
            ) : (
              ams.map((am, i) => (
                <React.Fragment key={am}>
                  {i > 0 && <span className="text-[var(--fg-faint)]">,</span>}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilterAm(am);
                    }}
                    title={`Show only ${am}`}
                    className="hover:text-[var(--primary)] underline-offset-4 hover:underline decoration-[rgba(99,55,250,0.35)] transition-colors"
                  >
                    {am}
                  </button>
                </React.Fragment>
              ))
            )}
            <span className="text-[var(--fg-faint)] font-normal whitespace-nowrap ml-1">
              · {visible.length} {visible.length === 1 ? 'quote' : 'quotes'}
              {versions > visible.length && ` of ${versions}`}
            </span>
          </div>
        </div>

        {/* Options on the latest quote */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <OptionSummary quote={latest} />
        </div>

        {/* Date + status */}
        <div className="flex items-center gap-3 justify-end">
          <span
            className="text-[12px] font-normal text-[var(--fg-faint)] whitespace-nowrap"
            title={formatLongDate(latest.createdAt)}
          >
            {formatRelativeDate(latest.createdAt)}
          </span>
          <StatusBadge status={latest.status} />
        </div>
      </div>

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
