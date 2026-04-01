'use client';

import React from 'react';
import { FileText, ArrowRight, DollarSign, Scale, Download, Clock } from 'lucide-react';
import Link from 'next/link';
import { useQuoteMsaStats, formatStatsCurrency } from '@/hooks/useQuoteMsaStats';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-neutral-100 text-neutral-600',
    downloaded: 'bg-blue-100 text-blue-700',
    sent: 'bg-amber-100 text-amber-700',
    signed: 'bg-green-100 text-green-700',
  };
  const label = status || 'downloaded';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[label] || colors.downloaded}`}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}

function RecentDocuments() {
  const { data, isLoading, error } = useQuoteMsaStats();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-neutral-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-neutral-500">Unable to load documents.</p>;
  }

  // Merge quotes and MSAs into a single sorted list
  const allDocs = [
    ...data.quotes.recent.map(q => ({ ...q, type: 'Quote' as const })),
    ...data.msas.recent.map(m => ({ ...m, type: 'MSA' as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (allDocs.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No documents created yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Quotes</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{data.quotes.unique}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{data.quotes.uniqueThisMonth} this month</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">MSAs</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{data.msas.unique}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{data.msas.uniqueThisMonth} this month</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Quote Value</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{formatStatsCurrency(data.quotes.uniqueTotalValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">MSA Value</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{formatStatsCurrency(data.msas.uniqueTotalValue)}</p>
        </div>
      </div>

      {/* Documents table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wide border-b border-neutral-200">
              <th className="pb-3 pr-4">Reference</th>
              <th className="pb-3 pr-4">Type</th>
              <th className="pb-3 pr-4">Company</th>
              <th className="pb-3 pr-4">Value</th>
              <th className="pb-3 pr-4">Prepared By</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Downloads</th>
              <th className="pb-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {allDocs.map((doc) => (
              <tr key={`${doc.type}-${doc.id}`} className="hover:bg-neutral-50 transition-colors">
                <td className="py-3 pr-4">
                  <span className="font-mono text-xs text-neutral-700">{doc.reference}</span>
                  {(doc.version ?? 0) > 1 && (
                    <span className="ml-1 text-xs text-neutral-400">v{doc.version}</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    doc.type === 'Quote' ? 'text-violet-600' : 'text-indigo-600'
                  }`}>
                    {doc.type === 'Quote' ? <DollarSign className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
                    {doc.type}
                  </span>
                </td>
                <td className="py-3 pr-4 font-medium text-neutral-800 max-w-[200px] truncate">{doc.companyName}</td>
                <td className="py-3 pr-4 text-neutral-700 tabular-nums">
                  {doc.currency === 'INR' ? '₹' : doc.currency === 'EUR' ? '€' : doc.currency === 'GBP' ? '£' : '$'}
                  {doc.totalValue.toLocaleString()}
                </td>
                <td className="py-3 pr-4 text-neutral-600">{doc.preparedBy || '—'}</td>
                <td className="py-3 pr-4"><StatusBadge status={doc.status} /></td>
                <td className="py-3 pr-4">
                  {(doc.downloadCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                      <Download className="w-3 h-3" />
                      {doc.downloadCount}
                    </span>
                  )}
                </td>
                <td className="py-3 text-neutral-500 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(doc.createdAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function QuoteLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900">Sales Documents</h1>
            <p className="mt-1 text-neutral-500">Generate quotes and agreements for clients</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Cost Quotation Card */}
          <Link
            href="/quote/cost"
            className="group bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 hover:shadow-lg hover:border-violet-300 transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-neutral-900 group-hover:text-violet-700 transition-colors">
                  Cost Quotation
                </h2>
                <p className="mt-2 text-neutral-600">
                  Generate a professional pricing proposal for myRA AI platform subscription.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                Multi-tier pricing options
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                Per-seat and project-based pricing
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                Payment terms customization
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                PDF + Word download
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-violet-600 font-medium group-hover:gap-3 transition-all">
              Create Quote
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* MSA Card */}
          <Link
            href="/quote/msa"
            className="group bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 hover:shadow-lg hover:border-violet-300 transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Scale className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-neutral-900 group-hover:text-indigo-700 transition-colors">
                  Master Services Agreement
                </h2>
                <p className="mt-2 text-neutral-600">
                  Generate a legally-binding MSA with embedded order form and SLA.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                26 legal sections + SLA annexure
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Auto-suggested jurisdiction
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Embedded subscription order form
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                18-page comprehensive document
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all">
              Create MSA
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Recent Documents */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">All Documents</h2>
          <RecentDocuments />
        </div>
      </main>
    </div>
  );
}
