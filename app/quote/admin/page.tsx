'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { useQuoteMsaStats } from '@/hooks/useQuoteMsaStats';
import { isAdminAuthenticated, setAdminAuthenticated } from '@/lib/quote/admin-auth';
import { QuoteAdminAuthModal } from '@/components/quote/QuoteAdminAuthModal';
import { DocDetailDrawer } from '@/components/quote/DocDetailDrawer';
import { HeroHeader } from '@/components/quote/admin/HeroHeader';
import { FiltersPopover, type DocFilter, type DateRange } from '@/components/quote/admin/FiltersPopover';
import { SectionHeader } from '@/components/quote/admin/SectionHeader';
import { DocRow, type DocRowItem } from '@/components/quote/admin/DocRow';
import { daysSince } from '@/lib/quote/format';

const STALE_DAYS = 14;
const DRAFT_NEEDS_ATTENTION_DAYS = 7;

interface AttentionEntry {
  doc: DocRowItem;
  label: string;
  severity: number; // higher = older / worse
}

function attentionEntry(doc: DocRowItem): AttentionEntry | null {
  const age = daysSince(doc.createdAt);
  if (doc.status === 'downloaded' && age > STALE_DAYS) {
    return { doc, label: `Stale ${age}d`, severity: age };
  }
  if ((doc.status === 'draft' || !doc.status) && age > DRAFT_NEEDS_ATTENTION_DAYS) {
    return { doc, label: `Draft ${age}d`, severity: age };
  }
  return null;
}

export default function QuoteAdminPage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setIsAuthed(isAdminAuthenticated());
    setAuthChecked(true);
  }, []);

  const { data, isLoading } = useQuoteMsaStats();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DocFilter>('all');
  const [preparedByFilter, setPreparedByFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [drawerDoc, setDrawerDoc] = useState<{ id: string; type: 'Quote' | 'MSA' } | null>(null);

  const allDocs: DocRowItem[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.quotes.recent.map((q) => ({ ...q, type: 'Quote' as const })),
      ...data.msas.recent.map((m) => ({ ...m, type: 'MSA' as const })),
    ];
  }, [data]);

  const amOptions = useMemo(() => {
    const set = new Set<string>();
    allDocs.forEach((d) => {
      if (d.preparedBy) set.add(d.preparedBy);
    });
    return Array.from(set).sort();
  }, [allDocs]);

  const baseFiltered = useMemo(() => {
    let docs = allDocs;
    if (filterType !== 'all') docs = docs.filter((d) => d.type === filterType);
    if (preparedByFilter !== 'all') docs = docs.filter((d) => d.preparedBy === preparedByFilter);
    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      docs = docs.filter((d) => new Date(d.createdAt).getTime() >= cutoff);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.companyName.toLowerCase().includes(q) ||
          d.reference.toLowerCase().includes(q) ||
          (d.preparedBy || '').toLowerCase().includes(q)
      );
    }
    return docs;
  }, [allDocs, filterType, preparedByFilter, dateRange, search]);

  const { needsAttention, restDocs } = useMemo(() => {
    const attention: AttentionEntry[] = [];
    const rest: DocRowItem[] = [];
    baseFiltered.forEach((d) => {
      const entry = attentionEntry(d);
      if (entry) attention.push(entry);
      else rest.push(d);
    });
    attention.sort((a, b) => b.severity - a.severity);
    rest.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { needsAttention: attention, restDocs: rest };
  }, [baseFiltered]);

  const totalAttentionAcrossAll = useMemo(
    () => allDocs.filter((d) => attentionEntry(d) !== null).length,
    [allDocs]
  );

  const totalValue = data ? data.quotes.uniqueTotalValue + data.msas.uniqueTotalValue : 0;
  const hasFilters =
    !!search || filterType !== 'all' || preparedByFilter !== 'all' || dateRange !== 'all';

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setPreparedByFilter('all');
    setDateRange('all');
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-[#fafaf7]" />;
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

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <HeroHeader
          totalValue={totalValue}
          quotesCount={data?.quotes.unique ?? 0}
          msasCount={data?.msas.unique ?? 0}
          staleCount={totalAttentionAcrossAll}
        />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, reference, or AM"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 placeholder:text-neutral-400"
            />
          </div>

          <FiltersPopover
            type={filterType}
            preparedBy={preparedByFilter}
            dateRange={dateRange}
            amOptions={amOptions}
            onChange={(next) => {
              if (next.type !== undefined) setFilterType(next.type);
              if (next.preparedBy !== undefined) setPreparedByFilter(next.preparedBy);
              if (next.dateRange !== undefined) setDateRange(next.dateRange);
            }}
            onClear={clearFilters}
          />

          <div className="flex-1" />

          <Link
            href="/quote/cost"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New quote
          </Link>
          <Link
            href="/quote/msa"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New MSA
          </Link>
        </div>

        {/* Content */}
        <div className="mt-2">
          {isLoading ? (
            <div className="mt-8 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-16 bg-white border border-neutral-100 rounded animate-pulse" />
              ))}
            </div>
          ) : baseFiltered.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-serif italic text-2xl text-neutral-400">
                {hasFilters ? 'No documents match these filters.' : 'Nothing here yet.'}
              </p>
              {hasFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm text-neutral-700 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-700"
                >
                  Clear filters
                </button>
              ) : (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <Link
                    href="/quote/cost"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:border-neutral-400"
                  >
                    <Plus className="w-3 h-3" /> Create quote
                  </Link>
                  <Link
                    href="/quote/msa"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
                  >
                    <Plus className="w-3 h-3" /> Create MSA
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              {needsAttention.length > 0 && (
                <section>
                  <SectionHeader
                    label="Needs attention"
                    count={needsAttention.length}
                    countLabel={needsAttention.length === 1 ? 'doc' : 'docs'}
                    tone="warning"
                  />
                  <div>
                    {needsAttention.map((entry, idx) => (
                      <DocRow
                        key={`${entry.doc.type}-${entry.doc.id}`}
                        doc={entry.doc}
                        index={idx}
                        attentionLabel={entry.label}
                        onClick={() => setDrawerDoc({ id: entry.doc.id, type: entry.doc.type })}
                      />
                    ))}
                  </div>
                </section>
              )}

              {restDocs.length > 0 && (
                <section>
                  <SectionHeader
                    label="All documents"
                    count={restDocs.length}
                    countLabel={restDocs.length === 1 ? 'result' : 'results'}
                  />
                  <div>
                    {restDocs.map((doc, idx) => (
                      <DocRow
                        key={`${doc.type}-${doc.id}`}
                        doc={doc}
                        index={idx}
                        onClick={() => setDrawerDoc({ id: doc.id, type: doc.type })}
                      />
                    ))}
                  </div>
                </section>
              )}

              <div className="mt-8 pt-4 border-t border-neutral-200 text-[11px] text-neutral-400 tabular-nums">
                Showing {baseFiltered.length} of {allDocs.length}
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="ml-3 underline underline-offset-2 hover:text-neutral-700"
                  >
                    clear
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <DocDetailDrawer
        type={drawerDoc?.type ?? null}
        id={drawerDoc?.id ?? null}
        onClose={() => setDrawerDoc(null)}
      />
    </div>
  );
}
