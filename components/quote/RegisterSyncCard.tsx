'use client';

import React, { useEffect, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { getAllHistoryEntries } from '@/lib/quote/storage';
import { registerLocalHistory, type RegisterSyncResult } from '@/lib/quote/registerSync';

interface RegisterSyncCardProps {
  refreshTrigger?: number;
}

/**
 * Quotes downloaded before the register existed, or while a save failed,
 * live only in this browser. This card pushes all of them to the register.
 */
export function RegisterSyncCard({ refreshTrigger }: RegisterSyncCardProps) {
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [result, setResult] = useState<RegisterSyncResult | null>(null);

  useEffect(() => {
    setCount(getAllHistoryEntries().length);
  }, [refreshTrigger]);

  if (count === 0) return null;

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const r = await registerLocalHistory((done, total) => setProgress([done, total]));
      setResult(r);
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  return (
    <div className="border border-neutral-200 rounded-lg bg-white p-4">
      <div className="flex items-start gap-3">
        <CloudUpload className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-800">Register local quotes</p>
          <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
            {count} quote{count === 1 ? '' : 's'} in this browser&apos;s history. Quotes already in the
            register are skipped. Use this if the admin register is missing quotes you downloaded here.
          </p>

          <button
            type="button"
            onClick={run}
            disabled={running}
            className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running && progress ? `Registering ${progress[0]} of ${progress[1]}…` : 'Register all in admin'}
          </button>

          {result && (
            <div className="mt-3 text-xs text-neutral-600 space-y-1">
              <p>
                <span className="font-medium text-neutral-800">{result.created}</span> added,{' '}
                <span className="font-medium text-neutral-800">{result.existing}</span> already registered
                {result.failed.length > 0 && (
                  <>
                    , <span className="font-medium text-red-700">{result.failed.length}</span> failed
                  </>
                )}
                .
              </p>
              {result.failed.slice(0, 5).map((f, i) => (
                <p key={i} className="text-red-700">
                  {f.companyName}: {f.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
