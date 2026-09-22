'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CloudUpload } from 'lucide-react';
import { getAllHistoryEntries } from '@/lib/quote/storage';
import { registerLocalHistory, type RegisterSyncResult } from '@/lib/quote/registerSync';

interface RegisterSyncCardProps {
  refreshTrigger?: number;
}

const AUTO_SYNC_FLAG = 'myra_quote_register_autosynced';

/**
 * Quotes downloaded before the register existed, or while a save failed,
 * live only in this browser. On first open per session this pushes all of
 * them to the register automatically; the card stays as a manual re-run.
 */
export function RegisterSyncCard({ refreshTrigger }: RegisterSyncCardProps) {
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [result, setResult] = useState<RegisterSyncResult | null>(null);

  useEffect(() => {
    setCount(getAllHistoryEntries().length);
  }, [refreshTrigger]);

  const run = async (silent: boolean) => {
    setRunning(true);
    setResult(null);
    try {
      const r = await registerLocalHistory((done, total) => setProgress([done, total]));
      setResult(r);
      if (silent) {
        if (r.created > 0) {
          toast.success(`Added ${r.created} quote${r.created === 1 ? '' : 's'} from this browser to the register`, { duration: 6000 });
        }
        if (r.failed.length > 0) {
          toast.error(`${r.failed.length} local quote${r.failed.length === 1 ? '' : 's'} could not be registered. See the sidebar.`, { duration: 8000 });
        }
      }
      return r;
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  // Automatic recovery: once per browser session, register everything local.
  // The flag is set when the run starts, so a cleared timer (StrictMode) reschedules cleanly.
  useEffect(() => {
    if (getAllHistoryEntries().length === 0) return;
    try {
      if (sessionStorage.getItem(AUTO_SYNC_FLAG) === 'true') return;
    } catch {
      return;
    }
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(AUTO_SYNC_FLAG, 'true');
      } catch {
        return;
      }
      void run(true);
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (count === 0) return null;

  return (
    <div className="border border-neutral-200 rounded-lg bg-white p-4">
      <div className="flex items-start gap-3">
        <CloudUpload className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-800">Register local quotes</p>
          <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
            {count} quote{count === 1 ? '' : 's'} in this browser&apos;s history. These are synced to the admin
            register automatically when you open this page. Run it again if something is still missing.
          </p>

          <button
            type="button"
            onClick={() => void run(false)}
            disabled={running}
            className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running && progress ? `Registering ${progress[0]} of ${progress[1]}…` : 'Sync now'}
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
