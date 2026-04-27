'use client';

import React from 'react';
import { X, Mail } from 'lucide-react';
import { useDocDetail } from '@/hooks/useDocDetail';
import { currencySymbol, formatLongDate } from '@/lib/quote/format';

type DocType = 'Quote' | 'MSA';

interface DocDetailDrawerProps {
  type: DocType | null;
  id: string | null;
  onClose: () => void;
}

interface LineItem {
  term?: string;
  users?: string;
  consultingHours?: string;
  investment?: string | number;
}

export function DocDetailDrawer({ type, id, onClose }: DocDetailDrawerProps) {
  const { data: doc, isLoading, error } = useDocDetail(type, id);
  const open = !!type && !!id;

  if (!open) return null;

  const reference = doc?.quote_reference || doc?.msa_reference || '';
  const dateLabel = type === 'Quote' ? 'Quote date' : 'Effective date';
  const dateValue = doc?.quote_date || doc?.effective_date;
  const validUntil = doc?.valid_until;
  const lineItems: LineItem[] = Array.isArray(doc?.line_items) ? (doc?.line_items as LineItem[]) : [];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="flex-1 bg-neutral-900/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside className="w-full max-w-md bg-[#fafaf7] shadow-2xl flex flex-col h-full overflow-hidden border-l border-neutral-200">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-neutral-200">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-1">
              {type}
              {doc?.version && doc.version > 1 && ` · v${doc.version}`}
            </p>
            <p className="font-mono text-[11px] text-neutral-500 truncate">{reference || '—'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 rounded-lg hover:bg-neutral-200/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <div className="h-8 w-2/3 bg-neutral-200/60 animate-pulse rounded" />
              <div className="h-12 w-1/2 bg-neutral-200/60 animate-pulse rounded" />
              <div className="h-32 bg-neutral-200/60 animate-pulse rounded mt-6" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-[#dc2626]">Failed to load document.</div>
          ) : doc ? (
            <div className="px-6 py-6 space-y-7">
              {/* Hero */}
              <div>
                <h2 className="font-serif text-3xl leading-tight text-neutral-900">
                  {doc.company_name}
                </h2>
                <p className="font-serif text-4xl tabular-nums text-neutral-900 mt-3 leading-none">
                  {currencySymbol(doc.currency)}
                  {doc.total_value.toLocaleString()}
                </p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 mt-2">
                  {doc.currency}
                  <span className="mx-1.5 text-neutral-300">·</span>
                  {doc.status || 'draft'}
                  {(doc.download_count ?? 0) > 0 && (
                    <>
                      <span className="mx-1.5 text-neutral-300">·</span>
                      {doc.download_count} dl
                    </>
                  )}
                </p>
              </div>

              {/* Contact */}
              <Section label="Contact">
                <div className="text-sm text-neutral-800">{doc.contact_name}</div>
                {doc.contact_title && (
                  <div className="text-xs text-neutral-500">{doc.contact_title}</div>
                )}
                {doc.contact_email && (
                  <a
                    href={`mailto:${doc.contact_email}`}
                    className="text-xs text-neutral-700 hover:text-neutral-900 inline-flex items-center gap-1 mt-1 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-600"
                  >
                    {doc.contact_email}
                  </a>
                )}
              </Section>

              {/* Prepared by */}
              <Section label="Prepared by">
                <div className="text-sm text-neutral-800">{doc.prepared_by || '—'}</div>
                {doc.prepared_by_email && (
                  <a
                    href={`mailto:${doc.prepared_by_email}`}
                    className="text-xs text-neutral-500 hover:text-neutral-700 underline underline-offset-4 decoration-neutral-300"
                  >
                    {doc.prepared_by_email}
                  </a>
                )}
              </Section>

              {/* Dates */}
              <Section label="Dates">
                <Row k="Created" v={formatLongDate(doc.created_at)} />
                <Row k={dateLabel} v={formatLongDate(dateValue)} />
                {type === 'Quote' && <Row k="Valid until" v={formatLongDate(validUntil)} />}
                {doc.first_sent_at && <Row k="First sent" v={formatLongDate(doc.first_sent_at)} />}
              </Section>

              {/* MSA-specific */}
              {type === 'MSA' && (
                <Section label="Agreement">
                  {doc.jurisdiction && <Row k="Jurisdiction" v={doc.jurisdiction} />}
                  {doc.client_country && <Row k="Country" v={doc.client_country} />}
                  {doc.client_address && <Row k="Address" v={doc.client_address} />}
                  {doc.consulting_hours != null && (
                    <Row k="Consulting hours" v={String(doc.consulting_hours)} />
                  )}
                  {doc.additional_hour_rate != null && (
                    <Row
                      k="Additional rate"
                      v={`${currencySymbol(doc.currency)}${doc.additional_hour_rate}/hr`}
                    />
                  )}
                </Section>
              )}

              {/* Line items */}
              {lineItems.length > 0 && (
                <Section label="Line items">
                  <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-neutral-500 border-b border-neutral-100">
                          <th className="text-left px-3 py-2 font-medium tracking-wide uppercase text-[10px]">
                            Term
                          </th>
                          <th className="text-left px-3 py-2 font-medium tracking-wide uppercase text-[10px]">
                            Users
                          </th>
                          <th className="text-left px-3 py-2 font-medium tracking-wide uppercase text-[10px]">
                            Hours
                          </th>
                          <th className="text-right px-3 py-2 font-medium tracking-wide uppercase text-[10px]">
                            Investment
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((it, i) => (
                          <tr key={i} className="border-t border-neutral-100">
                            <td className="px-3 py-2 text-neutral-700">{it.term || '—'}</td>
                            <td className="px-3 py-2 text-neutral-700">{it.users || '—'}</td>
                            <td className="px-3 py-2 text-neutral-700">{it.consultingHours || '—'}</td>
                            <td className="px-3 py-2 text-right text-neutral-800 tabular-nums font-medium">
                              {it.investment != null && it.investment !== ''
                                ? `${currencySymbol(doc.currency)}${Number(it.investment).toLocaleString()}`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {/* Deal context */}
              {type === 'Quote' && doc.deal_context && Object.keys(doc.deal_context).length > 0 && (
                <Section label="Deal context">
                  {Object.entries(doc.deal_context as Record<string, unknown>)
                    .filter(([, v]) => v != null && v !== '')
                    .map(([k, v]) => (
                      <Row key={k} k={k} v={String(v)} />
                    ))}
                </Section>
              )}

              {type === 'MSA' && doc.special_terms && (
                <Section label="Special terms">
                  <p className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed">
                    {doc.special_terms}
                  </p>
                </Section>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {doc && doc.contact_email && (
          <div className="px-6 py-3 border-t border-neutral-200 flex items-center justify-between">
            <a
              href={`mailto:${doc.contact_email}?subject=${encodeURIComponent(`${type} ${reference} for ${doc.company_name}`)}`}
              className="text-xs text-neutral-700 hover:text-neutral-900 inline-flex items-center gap-1.5"
            >
              <Mail className="w-3 h-3" /> Email contact
            </a>
            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">
              Read-only
            </span>
          </div>
        )}
      </aside>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-2">
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs py-0.5">
      <span className="text-neutral-400 capitalize">{k.replace(/_/g, ' ')}</span>
      <span className="text-neutral-700 text-right">{v}</span>
    </div>
  );
}
