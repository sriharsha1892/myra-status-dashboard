'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useUpdateDocStatus, type DocStatus } from '@/hooks/useUpdateDocStatus';

const STATUSES: DocStatus[] = ['draft', 'downloaded', 'sent', 'signed'];

const STATUS_DOT: Record<DocStatus, string> = {
  draft: 'bg-neutral-400',
  downloaded: 'bg-sky-500',
  sent: 'bg-amber-500',
  signed: 'bg-emerald-500',
};

interface StatusDropdownProps {
  id: string;
  type: 'Quote' | 'MSA';
  status: DocStatus;
}

export function StatusDropdown({ id, type, status }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mutation = useUpdateDocStatus();

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

  const handlePick = (next: DocStatus) => {
    if (next !== status) {
      mutation.mutate({ id, type, status: next });
    }
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={wrapRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-1.5 text-[11px] tracking-wide uppercase text-neutral-500 hover:text-neutral-900 px-1 py-0.5 rounded transition-colors disabled:opacity-50"
      >
        <span className={`w-[5px] h-[5px] rounded-full ${STATUS_DOT[status]}`} />
        <span>{status}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 min-w-[150px] bg-white border border-neutral-200 rounded-lg shadow-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handlePick(s)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`} />
              <span className="capitalize flex-1 text-left">{s}</span>
              {s === status && <Check className="w-3 h-3 text-neutral-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
