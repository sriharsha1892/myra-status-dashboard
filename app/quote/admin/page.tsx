'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, Scale, ArrowRight, Download, Search, ChevronUp, ChevronDown, FileText, Plus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useQuoteMsaStats, formatStatsCurrency } from '@/hooks/useQuoteMsaStats';
import { isAdminAuthenticated, setAdminAuthenticated } from '@/lib/quote/admin-auth';
import { QuoteAdminAuthModal } from '@/components/quote/QuoteAdminAuthModal';
import { StatusDropdown } from '@/components/quote/StatusDropdown';
import { DocDetailDrawer } from '@/components/quote/DocDetailDrawer';
import type { DocStatus } from '@/hooks/useUpdateDocStatus';

// ============================================================================
// UTILS
// ============================================================================

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function currencySymbol(c: string): string {
  return c === 'INR' ? '₹' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : '$';
}

const STALE_DAYS = 14;

function isStale(doc: DocItem): boolean {
  if (doc.status !== 'downloaded') return false;
  const ageMs = Date.now() - new Date(doc.createdAt).getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

// ============================================================================
// TYPES
// ============================================================================

type SortField = 'date' | 'company' | 'value' | 'preparedBy' | 'type';
type SortDir = 'asc' | 'desc';
type DocFilter = 'all' | 'Quote' | 'MSA';
type DateRange = 'all' | '7d' | '30d' | '90d';

interface DocItem {
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SortHeader({
  label,
  field,
  activeField,
  activeDir,
  onSort,
  className = '',
}: {
  label: string;
  field: SortField;
  activeField: SortField;
  activeDir: SortDir;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const isActive = field === activeField;
  return (
    <th
      className={`pb-2.5 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none group ${className}`}
      onClick={() => onSort(field)}
    >
      <span className={`inline-flex items-center gap-1 ${isActive ? 'text-neutral-800' : 'text-neutral-400 group-hover:text-neutral-600'}`}>
        {label}
        {isActive && (activeDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </span>
    </th>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function QuoteLandingPage() {
  // Admin auth gate
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setIsAuthed(isAdminAuthenticated());
    setAuthChecked(true);
  }, []);

  const { data, isLoading } = useQuoteMsaStats();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DocFilter>('all');
  const [preparedByFilter, setPreparedByFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [drawerDoc, setDrawerDoc] = useState<{ id: string; type: 'Quote' | 'MSA' } | null>(null);

  // Merge documents
  const allDocs: DocItem[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.quotes.recent.map(q => ({ ...q, type: 'Quote' as const })),
      ...data.msas.recent.map(m => ({ ...m, type: 'MSA' as const })),
    ];
  }, [data]);

  // Unique AMs for filter dropdown
  const amOptions = useMemo(() => {
    const set = new Set<string>();
    allDocs.forEach(d => { if (d.preparedBy) set.add(d.preparedBy); });
    return Array.from(set).sort();
  }, [allDocs]);

  const filteredDocs = useMemo(() => {
    let docs = allDocs;

    if (filter !== 'all') docs = docs.filter(d => d.type === filter);
    if (preparedByFilter !== 'all') docs = docs.filter(d => d.preparedBy === preparedByFilter);

    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      docs = docs.filter(d => new Date(d.createdAt).getTime() >= cutoff);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter(d =>
        d.companyName.toLowerCase().includes(q) ||
        d.reference.toLowerCase().includes(q) ||
        (d.preparedBy || '').toLowerCase().includes(q)
      );
    }

    docs = [...docs].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'company': cmp = a.companyName.localeCompare(b.companyName); break;
        case 'value': cmp = a.totalValue - b.totalValue; break;
        case 'preparedBy': cmp = (a.preparedBy || '').localeCompare(b.preparedBy || ''); break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return docs;
  }, [allDocs, filter, preparedByFilter, dateRange, search, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
  };

  const totalValue = data ? data.quotes.uniqueTotalValue + data.msas.uniqueTotalValue : 0;
  const staleCount = useMemo(() => allDocs.filter(isStale).length, [allDocs]);
  const hasFilters = search || filter !== 'all' || preparedByFilter !== 'all' || dateRange !== 'all';

  // Auth render
  if (!authChecked) {
    return <div className="min-h-screen bg-[#fafafa]" />;
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
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Action bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight">Sales Documents</h1>
            {data && (
              <p className="text-sm text-neutral-400 mt-0.5">
                {data.quotes.unique} quotes · {data.msas.unique} MSAs · {formatStatsCurrency(totalValue)} total
                {staleCount > 0 && (
                  <>
                    {' · '}
                    <span className="text-amber-600">{staleCount} stale</span>
                  </>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/quote/cost"
              className="group flex items-center gap-2.5 px-4 py-2.5 bg-white border border-neutral-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-neutral-700 group-hover:text-violet-700 transition-colors">New Quote</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link
              href="/quote/msa"
              className="group flex items-center gap-2.5 px-4 py-2.5 bg-white border border-neutral-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
                <Scale className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-neutral-700 group-hover:text-indigo-700 transition-colors">New MSA</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative flex-1 max-w-sm min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, reference, or AM..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 placeholder:text-neutral-300"
            />
          </div>

          <div className="flex bg-white border border-neutral-200 rounded-lg p-0.5">
            {(['all', 'Quote', 'MSA'] as DocFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filter === f
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {f === 'all' ? 'All' : f === 'Quote' ? 'Quotes' : 'MSAs'}
              </button>
            ))}
          </div>

          <select
            value={preparedByFilter}
            onChange={(e) => setPreparedByFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-neutral-200 rounded-lg text-neutral-700 focus:outline-none focus:border-neutral-400 cursor-pointer"
          >
            <option value="all">All AMs</option>
            {amOptions.map(am => (
              <option key={am} value={am}>{am}</option>
            ))}
          </select>

          <div className="flex bg-white border border-neutral-200 rounded-lg p-0.5">
            {(['all', '7d', '30d', '90d'] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateRange === r
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {r === 'all' ? 'All time' : r}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setSearch('');
                setFilter('all');
                setPreparedByFilter('all');
                setDateRange('all');
              }}
              className="text-xs text-neutral-500 hover:text-neutral-700 underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Documents table */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="h-4 w-28 bg-neutral-100 rounded" />
                  <div className="h-4 w-12 bg-neutral-100 rounded" />
                  <div className="h-4 w-40 bg-neutral-100 rounded flex-1" />
                  <div className="h-4 w-20 bg-neutral-100 rounded" />
                  <div className="h-4 w-24 bg-neutral-100 rounded" />
                  <div className="h-4 w-16 bg-neutral-100 rounded" />
                </div>
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-10 h-10 mx-auto text-neutral-200 mb-3" />
              {hasFilters ? (
                <>
                  <p className="text-sm text-neutral-500">No documents match your filters</p>
                  <button onClick={() => { setSearch(''); setFilter('all'); setPreparedByFilter('all'); setDateRange('all'); }}
                    className="mt-2 text-xs text-violet-600 hover:text-violet-700 font-medium">
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-neutral-500 mb-3">No documents created yet</p>
                  <div className="flex items-center justify-center gap-3">
                    <Link href="/quote/cost" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors">
                      <Plus className="w-3 h-3" /> Create Quote
                    </Link>
                    <Link href="/quote/msa" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                      <Plus className="w-3 h-3" /> Create MSA
                    </Link>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="pb-2.5 pt-3.5 pl-4 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Ref</th>
                    <SortHeader label="Type" field="type" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Company" field="company" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Value" field="value" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Prepared By" field="preparedBy" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
                    <th className="pb-2.5 pt-3.5 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                    <th className="pb-2.5 pt-3.5 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">DL</th>
                    <SortHeader label="Date" field="date" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc, idx) => {
                    const stale = isStale(doc);
                    return (
                      <tr
                        key={`${doc.type}-${doc.id}`}
                        onClick={() => setDrawerDoc({ id: doc.id, type: doc.type })}
                        className={`border-b border-neutral-50 hover:bg-neutral-50/80 transition-colors cursor-pointer ${idx === filteredDocs.length - 1 ? 'border-b-0' : ''}`}
                      >
                        <td className="py-2.5 pl-4 pr-4">
                          <span className="font-mono text-[11px] text-neutral-500">{doc.reference}</span>
                          {(doc.version ?? 0) > 1 && (
                            <span className="ml-1 text-[10px] text-neutral-300">v{doc.version}</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            doc.type === 'Quote' ? 'text-violet-600' : 'text-indigo-600'
                          }`}>
                            {doc.type === 'Quote' ? <DollarSign className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
                            {doc.type}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 max-w-[240px]">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-800 truncate">{doc.companyName}</span>
                            {stale && (
                              <span
                                title={`Downloaded ${formatDate(doc.createdAt)}, never sent`}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 rounded border border-amber-100 flex-shrink-0"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Stale
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-neutral-700 tabular-nums text-xs">
                          {currencySymbol(doc.currency)}{doc.totalValue.toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-4 text-neutral-500 text-xs">{doc.preparedBy || '—'}</td>
                        <td className="py-2.5 pr-4">
                          <StatusDropdown id={doc.id} type={doc.type} status={(doc.status as DocStatus) || 'draft'} />
                        </td>
                        <td className="py-2.5 pr-4">
                          {(doc.downloadCount ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                              <Download className="w-3 h-3" />{doc.downloadCount}
                            </span>
                          ) : <span className="text-neutral-200 text-xs">—</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-neutral-400 whitespace-nowrap">{formatDate(doc.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredDocs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50/50">
              <p className="text-[11px] text-neutral-400">
                {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
                {hasFilters && ` (filtered from ${allDocs.length})`}
              </p>
            </div>
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
