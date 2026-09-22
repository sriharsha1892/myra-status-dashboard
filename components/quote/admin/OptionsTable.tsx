'use client';

import React from 'react';
import type { QuoteOption } from '@/lib/quote/types';
import { currencySymbol } from '@/lib/quote/format';

interface OptionsTableProps {
  options: QuoteOption[];
  currency: string;
}

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return 'No price';
  return `${currencySymbol(currency)}${price.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`;
}

/**
 * Every option a client was offered, grouped by option label.
 * One row = one selectable option. Prices are never summed.
 */
export function OptionsTable({ options, currency }: OptionsTableProps) {
  if (options.length === 0) {
    return <p className="text-[12.5px] font-normal text-[var(--fg-faint)]">No pricing options recorded.</p>;
  }

  const groups = new Map<string, QuoteOption[]>();
  options.forEach((o) => {
    const key = o.groupLabel || '';
    const list = groups.get(key);
    if (list) list.push(o);
    else groups.set(key, [o]);
  });

  const hasProjects = options.some((o) => o.model === 'per-project');
  const showGroups = groups.size > 1 || (groups.size === 1 && !groups.has(''));

  return (
    <div className="rounded-[10px] overflow-hidden border border-[var(--hairline)] bg-[var(--card)]">
      <table className="mr-table">
        <thead>
          <tr>
            <th>Term</th>
            <th>{hasProjects ? 'Users / projects' : 'Users'}</th>
            <th>Hours</th>
            <th className="text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(groups.entries()).map(([label, rows]) => (
            <React.Fragment key={label || '__flat'}>
              {showGroups && label && (
                <tr>
                  <td colSpan={4} className="group">
                    {label}
                  </td>
                </tr>
              )}
              {rows.map((o, i) => (
                <tr key={`${label}-${i}`}>
                  <td>{o.term || '—'}</td>
                  <td>
                    {o.model === 'per-project'
                      ? [o.users, o.projects ? `${o.projects} projects` : null].filter(Boolean).join(' · ') || '—'
                      : o.users || '—'}
                  </td>
                  <td className="font-normal">{o.hours || '—'}</td>
                  <td className="text-right tabular-nums font-semibold text-[var(--fg)]">
                    {formatPrice(o.price, currency)}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
