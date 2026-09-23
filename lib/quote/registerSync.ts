/**
 * Pushes quotes that exist only in this browser's local history into the
 * register (the quotes table). Safe to run repeatedly: the save route hashes
 * quote content, so an already-registered quote just bumps download_count.
 */

import { getAllHistoryEntries } from './storage';
import { buildQuoteSavePayload, generateQuoteReference } from './savePayload';
import type { QuoteHistoryEntry } from './types';

export interface RegisterSyncResult {
  scanned: number;
  created: number;
  existing: number;
  failed: Array<{ companyName: string; reason: string }>;
}

async function registerEntry(entry: QuoteHistoryEntry): Promise<'created' | 'existing' | string> {
  const created = new Date(entry.createdAt || entry.date);
  const reference = generateQuoteReference(Number.isNaN(created.getTime()) ? new Date() : created);
  const payload = {
    ...buildQuoteSavePayload(entry.formData, reference),
    createdAt: Number.isNaN(created.getTime()) ? undefined : created.toISOString(),
    source: 'recovery' as const,
  };
  const res = await fetch('/api/quote/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    const issue = Array.isArray(body.issues) && body.issues[0]?.message;
    return issue || body.error || `HTTP ${res.status}`;
  }
  return body.isNew ? 'created' : 'existing';
}

export async function registerLocalHistory(
  onProgress?: (done: number, total: number) => void
): Promise<RegisterSyncResult> {
  const entries = getAllHistoryEntries();
  const result: RegisterSyncResult = { scanned: entries.length, created: 0, existing: 0, failed: [] };

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    try {
      const outcome = await registerEntry(entry);
      if (outcome === 'created') result.created += 1;
      else if (outcome === 'existing') result.existing += 1;
      else result.failed.push({ companyName: entry.companyName, reason: outcome });
    } catch (err) {
      result.failed.push({ companyName: entry.companyName, reason: err instanceof Error ? err.message : 'Network error' });
    }
    onProgress?.(i + 1, entries.length);
  }
  return result;
}
