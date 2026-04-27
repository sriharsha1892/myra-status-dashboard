'use client';

import React from 'react';
import { X, ExternalLink, Mail, Calendar, User, Building2, FileText, DollarSign, Clock } from 'lucide-react';
import { useDocDetail } from '@/hooks/useDocDetail';

type DocType = 'Quote' | 'MSA';

interface DocDetailDrawerProps {
  type: DocType | null;
  id: string | null;
  onClose: () => void;
}

function currencySymbol(c: string): string {
  return c === 'INR' ? '₹' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : '$';
}

function formatDateLong(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
        className="flex-1 bg-neutral-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <aside className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                type === 'Quote' ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {type === 'Quote' ? <DollarSign className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {type} {doc?.version && doc.version > 1 ? `· v${doc.version}` : ''}
              </p>
              <p className="font-mono text-[13px] text-neutral-700 truncate">{reference || '—'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <div className="h-4 w-2/3 bg-neutral-100 animate-pulse rounded" />
              <div className="h-4 w-1/2 bg-neutral-100 animate-pulse rounded" />
              <div className="h-24 bg-neutral-100 animate-pulse rounded" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">Failed to load document.</div>
          ) : doc ? (
            <div className="p-6 space-y-6">
              {/* Company + amount */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 leading-tight">{doc.company_name}</h3>
                <p className="text-2xl font-semibold text-neutral-900 tabular-nums mt-2">
                  {currencySymbol(doc.currency)}
                  {doc.total_value.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {doc.currency} · {doc.status || 'draft'}
                  {(doc.download_count ?? 0) > 0 && ` · ${doc.download_count} download${(doc.download_count ?? 0) > 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Contact */}
              <Section icon={<User className="w-3.5 h-3.5" />} label="Contact">
                <div className="text-sm text-neutral-800">{doc.contact_name}</div>
                {doc.contact_title && <div className="text-xs text-neutral-500">{doc.contact_title}</div>}
                {doc.contact_email && (
                  <a
                    href={`mailto:${doc.contact_email}`}
                    className="text-xs text-violet-600 hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    <Mail className="w-3 h-3" />
                    {doc.contact_email}
                  </a>
                )}
              </Section>

              {/* Prepared by */}
              <Section icon={<Building2 className="w-3.5 h-3.5" />} label="Prepared by">
                <div className="text-sm text-neutral-800">{doc.prepared_by || '—'}</div>
                {doc.prepared_by_email && (
                  <a
                    href={`mailto:${doc.prepared_by_email}`}
                    className="text-xs text-violet-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" /> {doc.prepared_by_email}
                  </a>
                )}
              </Section>

              {/* Dates */}
              <Section icon={<Calendar className="w-3.5 h-3.5" />} label="Dates">
                <Row k="Created" v={formatDateLong(doc.created_at)} />
                <Row k={dateLabel} v={formatDateLong(dateValue)} />
                {type === 'Quote' && <Row k="Valid until" v={formatDateLong(validUntil)} />}
                {doc.first_sent_at && <Row k="First sent" v={formatDateLong(doc.first_sent_at)} />}
              </Section>

              {/* MSA-specific */}
              {type === 'MSA' && (
                <Section icon={<FileText className="w-3.5 h-3.5" />} label="Agreement">
                  {doc.jurisdiction && <Row k="Jurisdiction" v={doc.jurisdiction} />}
                  {doc.client_country && <Row k="Country" v={doc.client_country} />}
                  {doc.client_address && <Row k="Address" v={doc.client_address} />}
                  {doc.consulting_hours != null && <Row k="Consulting hours" v={String(doc.consulting_hours)} />}
                  {doc.additional_hour_rate != null && (
                    <Row k="Additional rate" v={`${currencySymbol(doc.currency)}${doc.additional_hour_rate}/hr`} />
                  )}
                </Section>
              )}

              {/* Line items */}
              {lineItems.length > 0 && (
                <Section icon={<DollarSign className="w-3.5 h-3.5" />} label="Line items">
                  <div className="border border-neutral-100 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-neutral-50 text-neutral-500">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Term</th>
                          <th className="text-left px-3 py-2 font-medium">Users</th>
                          <th className="text-left px-3 py-2 font-medium">Hours</th>
                          <th className="text-right px-3 py-2 font-medium">Investment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((it, i) => (
                          <tr key={i} className="border-t border-neutral-100">
                            <td className="px-3 py-2 text-neutral-700">{it.term || '—'}</td>
                            <td className="px-3 py-2 text-neutral-700">{it.users || '—'}</td>
                            <td className="px-3 py-2 text-neutral-700">{it.consultingHours || '—'}</td>
                            <td className="px-3 py-2 text-right text-neutral-800 tabular-nums">
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
                <Section icon={<Clock className="w-3.5 h-3.5" />} label="Deal context">
                  {Object.entries(doc.deal_context as Record<string, unknown>)
                    .filter(([, v]) => v != null && v !== '')
                    .map(([k, v]) => (
                      <Row key={k} k={k} v={String(v)} />
                    ))}
                </Section>
              )}

              {type === 'MSA' && doc.special_terms && (
                <Section icon={<Clock className="w-3.5 h-3.5" />} label="Special terms">
                  <p className="text-xs text-neutral-700 whitespace-pre-wrap">{doc.special_terms}</p>
                </Section>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {doc && doc.contact_email && (
          <div className="px-6 py-3 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between">
            <a
              href={`mailto:${doc.contact_email}?subject=${encodeURIComponent(`${type} ${reference} for ${doc.company_name}`)}`}
              className="text-xs text-violet-600 hover:underline inline-flex items-center gap-1"
            >
              <Mail className="w-3 h-3" /> Email contact
            </a>
            <span className="text-[11px] text-neutral-400 inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Read-only
            </span>
          </div>
        )}
      </aside>
    </div>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
        {icon}
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-neutral-400 capitalize">{k.replace(/_/g, ' ')}</span>
      <span className="text-neutral-700 text-right">{v}</span>
    </div>
  );
}
