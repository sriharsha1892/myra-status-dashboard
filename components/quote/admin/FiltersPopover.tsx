'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

export type DocFilter = 'all' | 'Quote' | 'MSA';
export type DateRange = 'all' | '7d' | '30d' | '90d';

interface FiltersPopoverProps {
  type: DocFilter;
  preparedBy: string;
  dateRange: DateRange;
  amOptions: string[];
  onChange: (next: { type?: DocFilter; preparedBy?: string; dateRange?: DateRange }) => void;
  onClear: () => void;
}

export function FiltersPopover({
  type,
  preparedBy,
  dateRange,
  amOptions,
  onChange,
  onClear,
}: FiltersPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const activeCount =
    (type !== 'all' ? 1 : 0) + (preparedBy !== 'all' ? 1 : 0) + (dateRange !== 'all' ? 1 : 0);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
          activeCount > 0
            ? 'bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800'
            : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="text-[11px] tabular-nums opacity-80">· {activeCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 w-[320px] bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Filters
            </span>
            {activeCount > 0 && (
              <button
                onClick={onClear}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1"
              >
                Clear all <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Type */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 mb-2">
                Type
              </label>
              <div className="flex bg-neutral-100 rounded-lg p-0.5">
                {(['all', 'Quote', 'MSA'] as DocFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => onChange({ type: f })}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      type === f
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'Quote' ? 'Quotes' : 'MSAs'}
                  </button>
                ))}
              </div>
            </div>

            {/* Prepared by */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 mb-2">
                Prepared by
              </label>
              <select
                value={preparedBy}
                onChange={(e) => onChange({ preparedBy: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 cursor-pointer"
              >
                <option value="all">All AMs</option>
                {amOptions.map((am) => (
                  <option key={am} value={am}>
                    {am}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 mb-2">
                Date range
              </label>
              <div className="flex bg-neutral-100 rounded-lg p-0.5">
                {(['all', '7d', '30d', '90d'] as DateRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => onChange({ dateRange: r })}
                    className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                      dateRange === r
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {r === 'all' ? 'All time' : r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
