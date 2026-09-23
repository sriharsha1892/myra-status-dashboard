'use client';

import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type {
  OptionCountBucket,
  PricingModel,
  QuoteStatus,
  RegisterDateRange,
  RegisterFacets,
  RegisterFilters,
  UsersBand,
} from '@/lib/quote/types';
import { QUOTE_STATUSES } from '@/lib/quote/types';
import { hasActiveFilters, MODEL_LABEL, STATUS_LABEL, type FacetCounts } from '@/lib/quote/register';
import { FacetChip, FacetGroup } from './FacetChip';
import { AmMultiSelect } from './AmMultiSelect';
import { ActivePills, buildPills } from './ActivePills';

interface FilterBarProps {
  filters: RegisterFilters;
  facets: RegisterFacets;
  counts: FacetCounts;
  onChange: (next: RegisterFilters) => void;
  onClear: () => void;
  summary: string;
}

const DATE_RANGES: Array<{ value: RegisterDateRange; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '12mo', label: '12mo' },
];

const USERS_BANDS: UsersBand[] = ['1', '2-5', '6-10', '10+'];
const OPTION_COUNTS: Array<{ value: OptionCountBucket; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'multi', label: 'Multiple' },
];

function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterBar({ filters, facets, counts, onChange, onClear, summary }: FilterBarProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses search; Esc inside search clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const active = hasActiveFilters(filters);
  const pills = buildPills(filters, onChange);
  const statusCount = new Map(facets.statuses.map((s) => [s.status, s.count]));

  // A chip with nothing behind it is muted unless it's already selected.
  const chip = <T extends string>(
    key: T,
    label: string,
    count: number,
    selected: T[],
    apply: (next: T[]) => void
  ) => (
    <FacetChip
      key={key}
      label={label}
      count={count}
      active={selected.includes(key)}
      disabled={count === 0 && !selected.includes(key)}
      onToggle={() => apply(toggleIn(selected, key))}
    />
  );

  return (
    <section className="mr-card p-4 space-y-3.5">
      {/* Row 1: search, AM, date range, clear */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="mr-search flex-1 min-w-[260px] max-w-md">
          <Search className="w-3.5 h-3.5 text-[var(--fg-faint)] shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && filters.search) {
                e.stopPropagation();
                onChange({ ...filters, search: '' });
              }
            }}
            placeholder="Search company, reference, contact or AM"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: '' })}
              aria-label="Clear search"
              className="p-0.5 rounded hover:bg-[var(--wash)]"
            >
              <X className="w-3.5 h-3.5 text-[var(--fg-faint)]" />
            </button>
          ) : (
            <span className="mr-kbd">/</span>
          )}
        </label>

        <AmMultiSelect
          options={facets.ams}
          selected={filters.ams}
          onChange={(ams) => onChange({ ...filters, ams })}
        />

        <div className="mr-seg">
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onChange({ ...filters, dateRange: r.value })}
              aria-pressed={filters.dateRange === r.value}
            >
              {r.label}
            </button>
          ))}
        </div>

        {active && (
          <button type="button" onClick={onClear} className="mr-btn mr-btn-ghost">
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* Row 2: facet chips, each with the number of quotes behind it */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
        <FacetGroup label="Term">
          {facets.terms.length === 0 && <span className="text-[12px] text-[var(--fg-faint)]">None yet</span>}
          {facets.terms.map((t) =>
            chip(t, t, counts.terms[t] ?? 0, filters.terms, (terms) => onChange({ ...filters, terms }))
          )}
        </FacetGroup>

        <FacetGroup label="Pricing">
          {(['per-seat', 'per-project'] as PricingModel[]).map((m) =>
            chip(m, MODEL_LABEL[m], counts.models[m] ?? 0, filters.models, (models) => onChange({ ...filters, models }))
          )}
        </FacetGroup>

        <FacetGroup label="Status">
          {QUOTE_STATUSES.map((s: QuoteStatus) =>
            chip(s, STATUS_LABEL[s], statusCount.get(s) ?? 0, filters.statuses, (statuses) => onChange({ ...filters, statuses }))
          )}
        </FacetGroup>

        <FacetGroup label="Options">
          {OPTION_COUNTS.map((o) =>
            chip(o.value, o.label, counts.optionCounts[o.value], filters.optionCounts, (optionCounts) =>
              onChange({ ...filters, optionCounts })
            )
          )}
        </FacetGroup>

        <FacetGroup label="Users">
          {USERS_BANDS.map((b) =>
            chip(b, b, counts.usersBands[b], filters.usersBands, (usersBands) => onChange({ ...filters, usersBands }))
          )}
        </FacetGroup>
      </div>

      {/* Row 3: active pills */}
      <ActivePills pills={pills} onClearAll={onClear} summary={summary} />
    </section>
  );
}
