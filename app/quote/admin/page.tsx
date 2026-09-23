'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuoteRegister } from '@/hooks/useQuoteRegister';
import { isAdminAuthenticated, setAdminAuthenticated } from '@/lib/quote/admin-auth';
import { QuoteAdminAuthModal } from '@/components/quote/QuoteAdminAuthModal';
import { QuoteDetailDrawer } from '@/components/quote/QuoteDetailDrawer';
import { RegisterHeader } from '@/components/quote/admin/RegisterHeader';
import { FilterBar } from '@/components/quote/admin/FilterBar';
import { AccountRow } from '@/components/quote/admin/AccountRow';
import {
  EMPTY_FILTERS,
  SORT_LABEL,
  buildRegisterCsv,
  facetCounts,
  filterAccounts,
  filtersFromSearchParams,
  filtersToSearchParams,
  hasActiveFilters,
  monthLabel,
  sortAccounts,
} from '@/lib/quote/register';
import type { RegisterFilters, RegisterSort } from '@/lib/quote/types';

export default function QuoteAdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <QuoteRegister />
    </Suspense>
  );
}

const SORTS: RegisterSort[] = ['newest', 'oldest', 'company', 'quotes'];

function QuoteRegister() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setIsAuthed(isAdminAuthenticated());
    setAuthChecked(true);
  }, []);

  // Filters and sort live in the URL so a view is shareable and Back works.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const setFilters = useCallback(
    (next: RegisterFilters) => {
      const qs = filtersToSearchParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );
  const clearFilters = useCallback(() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort }), [setFilters, filters.sort]);

  const { data, isPending, error } = useQuoteRegister();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const allQuotes = useMemo(() => (data ? data.accounts.flatMap((a) => a.quotes) : []), [data]);
  const counts = useMemo(() => facetCounts(allQuotes), [allQuotes]);

  const rows = useMemo(
    () => (data ? sortAccounts(filterAccounts(data.accounts, filters), filters.sort) : []),
    [data, filters]
  );

  const inView = useMemo(() => {
    let quotes = 0;
    let options = 0;
    rows.forEach((r) => {
      quotes += r.visible.length;
      r.visible.forEach((q) => {
        options += q.options.length;
      });
    });
    return { accounts: rows.length, quotes, options };
  }, [rows]);

  const filtered = hasActiveFilters(filters);
  const totals = data?.totals ?? { accounts: 0, quotes: 0, options: 0 };
  const byDate = filters.sort === 'newest' || filters.sort === 'oldest';

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allExpanded = rows.length > 0 && rows.every((r) => expanded.has(r.account.key));
  const toggleAll = () => {
    setExpanded(allExpanded ? new Set() : new Set(rows.map((r) => r.account.key)));
  };

  const filterAm = (name: string) => {
    const ams = filters.ams.includes(name) ? filters.ams.filter((a) => a !== name) : [...filters.ams, name];
    setFilters({ ...filters, ams });
  };

  const exportCsv = () => {
    const csv = buildRegisterCsv(rows);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myra-quotes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!authChecked) {
    return <div className="min-h-screen" />;
  }
  if (!isAuthed) {
    return (
      <QuoteAdminAuthModal
        onSuccess={() => {
          setAdminAuthenticated();
          setIsAuthed(true);
        }}
      />
    );
  }

  const summary = `${inView.accounts} of ${totals.accounts} ${totals.accounts === 1 ? 'account' : 'accounts'}, ${inView.quotes} of ${totals.quotes} ${totals.quotes === 1 ? 'quote' : 'quotes'}`;

  return (
    <div className="min-h-screen">
      <RegisterHeader
        accounts={inView.accounts}
        quotes={inView.quotes}
        options={inView.options}
        totals={totals}
        filtered={filtered}
      />

      <main className="max-w-[1120px] mx-auto px-6 py-7 space-y-5">
        {/* Page title */}
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em] leading-tight">Quotes</h1>
          <p className="mt-1 text-[13.5px] font-normal text-[var(--fg-dim)]">
            Every quote the team has sent, grouped by account. Each price is one option. The client picks one.
          </p>
        </div>

        <FilterBar
          filters={filters}
          facets={data?.facets ?? { ams: [], terms: [], models: [], statuses: [] }}
          counts={counts}
          onChange={setFilters}
          onClear={clearFilters}
          summary={summary}
        />

        {/* Accounts */}
        <section className="mr-card overflow-hidden">
          <div className="px-4 h-12 flex items-center justify-between gap-3 border-b border-[var(--hairline)]">
            <div className="flex items-baseline gap-2 min-w-0">
              <h2 className="text-[14px] font-semibold">Accounts</h2>
              {!isPending && (
                <span className="text-[12px] font-normal text-[var(--fg-faint)] tabular-nums">
                  {inView.accounts} {inView.accounts === 1 ? 'result' : 'results'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <label className="sr-only" htmlFor="register-sort">
                Sort
              </label>
              <select
                id="register-sort"
                className="mr-select"
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value as RegisterSort })}
              >
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABEL[s]}
                  </option>
                ))}
              </select>
              {rows.length > 0 && (
                <>
                  <button type="button" onClick={toggleAll} className="mr-btn mr-btn-ghost mr-btn-sm">
                    {allExpanded ? 'Collapse all' : 'Expand all'}
                  </button>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="mr-btn mr-btn-outline mr-btn-sm"
                    title="Download what's in view as CSV, one line per option"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                </>
              )}
            </div>
          </div>

          {isPending ? (
            <div className="p-4 space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid grid-cols-[16px_1.1fr_1.6fr_auto] items-center gap-4">
                  <div className="mr-skbar w-3" />
                  <div className="space-y-2">
                    <div className="mr-skbar w-2/3 h-3" />
                    <div className="mr-skbar w-1/2" />
                  </div>
                  <div className="flex gap-2">
                    <div className="mr-skbar w-24 h-5" />
                    <div className="mr-skbar w-24 h-5" />
                  </div>
                  <div className="mr-skbar w-16 h-5" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <p className="text-[15px] font-semibold">Could not load the register.</p>
              <p className="mt-1.5 text-[12.5px] font-normal text-[var(--fg-faint)]">{(error as Error).message}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[15px] font-semibold">
                {filtered ? 'No quotes match these filters.' : 'No quotes yet.'}
              </p>
              {filtered ? (
                <button onClick={clearFilters} className="mr-btn mr-btn-outline mr-btn-sm mt-4">
                  Clear filters
                </button>
              ) : (
                <Link href="/quote/cost" className="mr-btn mr-btn-solid mr-btn-sm mt-4">
                  Create the first quote
                </Link>
              )}
            </div>
          ) : (
            <div>
              {rows.map((r, idx) => {
                const month = byDate ? monthLabel(r.visible[0].createdAt) : null;
                const prevMonth = byDate && idx > 0 ? monthLabel(rows[idx - 1].visible[0].createdAt) : null;
                return (
                  <React.Fragment key={r.account.key}>
                    {month && month !== prevMonth && (
                      <div className={`mr-month ${idx === 0 ? 'border-t-0' : ''}`}>{month}</div>
                    )}
                    <AccountRow
                      account={r.account}
                      visible={r.visible}
                      hidden={r.hidden}
                      expanded={expanded.has(r.account.key)}
                      highlight={filters.search}
                      onToggle={() => toggleExpanded(r.account.key)}
                      onOpenQuote={setDrawerId}
                      onFilterAm={filterAm}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </section>

        {!isPending && !error && rows.length > 0 && (
          <p className="text-[12px] font-normal text-[var(--fg-faint)] tabular-nums px-1">
            Showing {summary}.
            {filtered && (
              <button onClick={clearFilters} className="mr-link ml-2">
                Clear filters
              </button>
            )}
          </p>
        )}
      </main>

      <QuoteDetailDrawer id={drawerId} onClose={() => setDrawerId(null)} />
    </div>
  );
}
