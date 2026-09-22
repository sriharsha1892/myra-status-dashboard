'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { AmAvatar } from './AmAvatar';

interface AmMultiSelectProps {
  options: Array<{ name: string; count: number }>;
  selected: string[];
  onChange: (next: string[]) => void;
}

export function AmMultiSelect({ options, selected, onChange }: AmMultiSelectProps) {
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

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter((s) => s !== name) : [...selected, name]);
  };

  const summary =
    selected.length === 0 ? 'All account managers' : selected.length === 1 ? selected[0] : `${selected.length} account managers`;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-on={selected.length > 0 ? 'true' : 'false'}
        className="mr-btn mr-btn-outline"
      >
        <span className="max-w-[180px] truncate">{summary}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>

      {open && (
        <div role="listbox" aria-multiselectable className="mr-popover absolute left-0 top-full mt-2 z-30 w-[272px] overflow-hidden">
          <div className="px-3 h-10 flex items-center justify-between border-b border-[var(--hairline)]">
            <span className="text-[13px] font-semibold">Prepared by</span>
            {selected.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="mr-link">
                Clear
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto py-1.5">
            {options.length === 0 && (
              <div className="px-3 py-2 text-[12.5px] text-[var(--fg-faint)]">No account managers yet.</div>
            )}
            {options.map((o) => {
              const on = selected.includes(o.name);
              return (
                <button
                  key={o.name}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(o.name)}
                  className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] font-medium hover:bg-[var(--wash)] transition-colors"
                >
                  <span
                    className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      background: on ? 'var(--primary)' : 'var(--card)',
                      border: on ? '1.5px solid var(--primary)' : '1.5px solid rgba(15,11,31,0.22)',
                    }}
                  >
                    {on && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </span>
                  <AmAvatar name={o.name} size={20} />
                  <span className="flex-1 text-left truncate">{o.name}</span>
                  <span className="text-[11px] tabular-nums text-[var(--fg-faint)] font-normal">{o.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
