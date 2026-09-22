'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { RegisterFilters } from '@/lib/quote/types';
import { MODEL_LABEL, STATUS_LABEL } from '@/lib/quote/register';

interface Pill {
  key: string;
  label: string;
  remove: () => void;
}

const RANGE_LABEL: Record<RegisterFilters['dateRange'], string> = {
  all: 'All time',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12mo': 'Last 12 months',
};

const USERS_LABEL: Record<string, string> = {
  '1': '1 user',
  '2-5': '2 to 5 users',
  '6-10': '6 to 10 users',
  '10+': '10+ users',
};

export function buildPills(f: RegisterFilters, set: (next: RegisterFilters) => void): Pill[] {
  const pills: Pill[] = [];
  const without = <K extends keyof RegisterFilters>(key: K, value: string) =>
    set({ ...f, [key]: (f[key] as string[]).filter((v) => v !== value) });

  if (f.search.trim()) {
    pills.push({ key: 'q', label: `“${f.search.trim()}”`, remove: () => set({ ...f, search: '' }) });
  }
  f.statuses.forEach((s) =>
    pills.push({ key: `status:${s}`, label: STATUS_LABEL[s], remove: () => without('statuses', s) })
  );
  f.terms.forEach((t) => pills.push({ key: `term:${t}`, label: t, remove: () => without('terms', t) }));
  f.models.forEach((m) =>
    pills.push({ key: `model:${m}`, label: MODEL_LABEL[m], remove: () => without('models', m) })
  );
  f.optionCounts.forEach((c) =>
    pills.push({
      key: `options:${c}`,
      label: c === 'single' ? 'Single option' : 'Multiple options',
      remove: () => without('optionCounts', c),
    })
  );
  f.usersBands.forEach((b) =>
    pills.push({ key: `users:${b}`, label: USERS_LABEL[b] ?? b, remove: () => without('usersBands', b) })
  );
  f.ams.forEach((a) => pills.push({ key: `am:${a}`, label: a, remove: () => without('ams', a) }));
  if (f.dateRange !== 'all') {
    pills.push({ key: 'range', label: RANGE_LABEL[f.dateRange], remove: () => set({ ...f, dateRange: 'all' }) });
  }
  return pills;
}

interface ActivePillsProps {
  pills: Pill[];
  onClearAll: () => void;
  summary: string;
}

export function ActivePills({ pills, onClearAll, summary }: ActivePillsProps) {
  if (pills.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-[var(--hairline)]">
      {pills.map((p) => (
        <button key={p.key} type="button" onClick={p.remove} title="Remove filter" className="mr-pill">
          <span>{p.label}</span>
          <X className="w-3 h-3 opacity-70" strokeWidth={2.5} />
        </button>
      ))}
      <button type="button" onClick={onClearAll} className="mr-link ml-1">
        Clear all
      </button>
      <span className="text-[12px] font-normal text-[var(--fg-faint)] tabular-nums ml-auto">{summary}</span>
    </div>
  );
}
