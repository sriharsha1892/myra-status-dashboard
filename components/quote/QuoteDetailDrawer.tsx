'use client';

import React, { useEffect } from 'react';
import { X, Mail } from 'lucide-react';
import { useQuoteDetail } from '@/hooks/useQuoteDetail';
import { currencySymbol, formatLongDate } from '@/lib/quote/format';
import { effectiveStatus, flattenOptions, normaliseStatus, valueRange } from '@/lib/quote/register';
import { OptionsTable } from '@/components/quote/admin/OptionsTable';
import { StatusBadge } from '@/components/quote/admin/StatusBadge';
import { AmAvatar } from '@/components/quote/admin/AmAvatar';

interface QuoteDetailDrawerProps {
  id: string | null;
  onClose: () => void;
}

function money(value: number | null, currency: string): string {
  if (value == null) return '—';
  return `${currencySymbol(currency)}${value.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`;
}

export function QuoteDetailDrawer({ id, onClose }: QuoteDetailDrawerProps) {
  const { data: doc, isPending, error } = useQuoteDetail(id);
  const open = !!id;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const options = doc ? flattenOptions(doc.pricing_options, doc.line_items) : [];
  const range = valueRange(options);
  const status = doc ? effectiveStatus(normaliseStatus(doc.status), doc.valid_until) : null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-[rgba(26,21,48,0.32)]" onClick={onClose} aria-hidden />
      <aside className="mr-drawer w-full max-w-[440px] flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--hairline)]">
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="text-[13px] font-semibold">Quote</span>
            <span className="mr-mono text-[12px] text-[var(--fg-faint)] truncate">{doc?.quote_reference || ''}</span>
            {doc?.version && doc.version > 1 && (
              <span className="mr-mono text-[11px] text-[var(--fg-faint)]">v{doc.version}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[9px] flex items-center justify-center hover:bg-[var(--wash)] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-[var(--fg-dim)]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isPending ? (
            <div className="p-5 space-y-3">
              <div className="mr-skbar w-2/3 h-4" />
              <div className="mr-skbar w-1/2" />
              <div className="mr-skbar h-28 mt-6" />
            </div>
          ) : error ? (
            <div className="p-5 text-[13px] text-[var(--danger-ink)]">Could not load this quote.</div>
          ) : doc ? (
            <div className="px-5 py-5 space-y-6">
              {/* Title */}
              <div>
                <h2 className="text-[18px] font-bold tracking-[-0.01em] leading-tight">{doc.company_name}</h2>
                <p className="mt-1.5 text-[13px] text-[var(--fg-dim)] tabular-nums">
                  {options.length === 0
                    ? 'No options recorded'
                    : options.length === 1
                      ? `One option, ${money(range.max, doc.currency)}`
                      : `${options.length} options, ${money(range.min, doc.currency)} to ${money(range.max, doc.currency)}`}
                </p>
                <div className="flex items-center gap-2.5 mt-3">
                  {status && <StatusBadge status={status} />}
                  <span className="text-[12px] font-normal text-[var(--fg-faint)]">{doc.currency}</span>
                  {(doc.download_count ?? 0) > 0 && (
                    <span className="text-[12px] font-normal text-[var(--fg-faint)] tabular-nums">
                      Downloaded {doc.download_count}×
                    </span>
                  )}
                </div>
              </div>

              <Section label="Options quoted">
                <OptionsTable options={options} currency={doc.currency} />
              </Section>

              <Section label="Contact">
                <div className="text-[13.5px] font-semibold">{doc.contact_name}</div>
                {doc.contact_title && (
                  <div className="text-[12.5px] font-normal text-[var(--fg-dim)]">{doc.contact_title}</div>
                )}
                {doc.contact_email && (
                  <a href={`mailto:${doc.contact_email}`} className="mr-link inline-block mt-1">
                    {doc.contact_email}
                  </a>
                )}
              </Section>

              <Section label="Prepared by">
                <div className="flex items-center gap-2">
                  <AmAvatar name={doc.prepared_by || '?'} size={24} />
                  <div>
                    <div className="text-[13.5px] font-semibold">{doc.prepared_by || 'Unassigned'}</div>
                    {doc.prepared_by_email && (
                      <a href={`mailto:${doc.prepared_by_email}`} className="mr-link">
                        {doc.prepared_by_email}
                      </a>
                    )}
                  </div>
                </div>
              </Section>

              <Section label="Dates">
                <Row k="Created" v={formatLongDate(doc.created_at)} />
                <Row k="Quote date" v={formatLongDate(doc.quote_date)} />
                <Row k="Valid until" v={formatLongDate(doc.valid_until)} />
                {doc.first_sent_at && <Row k="First sent" v={formatLongDate(doc.first_sent_at)} />}
              </Section>

              {doc.deal_context && Object.keys(doc.deal_context).length > 0 && (
                <Section label="Deal context">
                  {Object.entries(doc.deal_context)
                    .filter(([, v]) => v != null && v !== '')
                    .map(([k, v]) => (
                      <Row key={k} k={humanise(k)} v={String(v)} />
                    ))}
                </Section>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {doc && doc.contact_email && (
          <div className="px-5 h-14 border-t border-[var(--hairline)] flex items-center justify-between">
            <a
              href={`mailto:${doc.contact_email}?subject=${encodeURIComponent(`Quote ${doc.quote_reference} for ${doc.company_name}`)}`}
              className="mr-btn mr-btn-outline mr-btn-sm"
            >
              <Mail className="w-3.5 h-3.5" /> Email contact
            </a>
            <span className="text-[12px] font-normal text-[var(--fg-faint)]">Read only</span>
          </div>
        )}
      </aside>
    </div>
  );
}

function humanise(key: string): string {
  const spaced = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mr-eyebrow mb-2">{label}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px] py-0.5">
      <span className="font-normal text-[var(--fg-faint)]">{k}</span>
      <span className="text-[var(--fg)] text-right">{v}</span>
    </div>
  );
}
