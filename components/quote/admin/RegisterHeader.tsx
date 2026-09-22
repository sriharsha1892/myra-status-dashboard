'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';

interface RegisterHeaderProps {
  accounts: number;
  quotes: number;
  options: number;
  totals: { accounts: number; quotes: number; options: number };
  filtered: boolean;
}

function Count({ n, of, label, filtered }: { n: number; of: number; label: string; filtered: boolean }) {
  return (
    <span className="tabular-nums">
      <span className="text-[var(--fg)] font-semibold">{n}</span>
      {filtered && n !== of && <span className="text-[var(--fg-faint)]"> / {of}</span>}
      <span className="text-[var(--fg-faint)]"> {label}</span>
    </span>
  );
}

/** Sticky product top bar: brand, page name, live counts, the one primary CTA. */
export function RegisterHeader({ accounts, quotes, options, totals, filtered }: RegisterHeaderProps) {
  return (
    <header className="mr-header sticky top-0 z-30">
      <div className="max-w-[1120px] mx-auto px-6 h-14 flex items-center gap-4">
        <Link href="/quote" className="flex items-center gap-2.5 shrink-0" aria-label="myRA sales documents">
          <Image src="/logo-myra.svg" alt="myRA" width={87} height={26} priority unoptimized className="h-[26px] w-auto" />
        </Link>
        <span className="h-5 w-px bg-[var(--hairline-2)]" aria-hidden />
        <span className="text-[13px] font-semibold">Quotes</span>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-3 text-[12.5px] font-medium">
          <Count n={accounts} of={totals.accounts} label={accounts === 1 ? 'account' : 'accounts'} filtered={filtered} />
          <Count n={quotes} of={totals.quotes} label={quotes === 1 ? 'quote' : 'quotes'} filtered={filtered} />
          <Count n={options} of={totals.options} label={options === 1 ? 'option' : 'options'} filtered={filtered} />
        </div>

        <Link href="/quote/cost" className="mr-btn mr-btn-primary">
          <span className="mr-icon-chip">
            <Plus className="w-3 h-3" strokeWidth={2.5} />
          </span>
          New Quote
        </Link>
      </div>
    </header>
  );
}
