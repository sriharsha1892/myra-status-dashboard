import type { QuoteFormData, QuoteHistoryEntry } from './types';
import { DEFAULT_DEAL_CONTEXT, ACCOUNT_MANAGERS } from './constants';

// Helper to lookup AM email by name
function getAMEmail(name: string): string {
  const am = ACCOUNT_MANAGERS.find(a => a.name === name);
  return am?.email || '';
}

const DRAFT_KEY = 'myra_quote_draft';
const HISTORY_PREFIX = 'myra_quote_history_';
const MAX_HISTORY_ENTRIES = 10;

// Helper to calculate default validUntil (quoteDate + 30 days)
function getDefaultValidUntil(quoteDate: string): string {
  const date = new Date(quoteDate);
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

// Simple hash function for email-based storage keys
function hashEmail(email: string): string {
  let hash = 0;
  const normalizedEmail = email.toLowerCase().trim();
  for (let i = 0; i < normalizedEmail.length; i++) {
    const char = normalizedEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}

// Draft persistence
export function saveDraft(data: QuoteFormData): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save quote draft:', error);
  }
}

export function loadDraft(): QuoteFormData | null {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = JSON.parse(saved) as any;
      const quoteDate = parsed.quoteDate ?? new Date().toISOString().split('T')[0];

      // Ensure backward compatibility with old drafts missing new fields
      return {
        preparedFor: parsed.preparedFor ?? '',
        contactName: parsed.contactName ?? '',
        contactTitle: parsed.contactTitle ?? '',
        contactEmail: parsed.contactEmail ?? '',
        quoteDate,
        currency: parsed.currency ?? 'USD',
        rows: parsed.rows ?? [{ term: '1-Year', users: '', consultingHours: '', listPrice: '', offerPrice: '' }],
        // Migrate from old quoteValidity to validUntil
        validUntil: parsed.validUntil ?? getDefaultValidUntil(quoteDate),
        preparedBy: parsed.preparedBy ?? '',
        // Auto-populate email from AM list if missing (backward compatibility)
        preparedByEmail: parsed.preparedByEmail || getAMEmail(parsed.preparedBy ?? ''),
        showConfidential: parsed.showConfidential ?? true,
        // Add dealContext for old drafts
        dealContext: parsed.dealContext ?? { ...DEFAULT_DEAL_CONTEXT },
        // Add additionalHourRate for old drafts
        additionalHourRate: parsed.additionalHourRate ?? '',
      };
    }
  } catch (error) {
    console.warn('Failed to load quote draft:', error);
  }
  return null;
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.warn('Failed to clear quote draft:', error);
  }
}

// Quote history (per email)
function getHistoryKey(email: string): string {
  return `${HISTORY_PREFIX}${hashEmail(email)}`;
}

export function getHistory(email: string): QuoteHistoryEntry[] {
  if (!email) return [];

  try {
    const key = getHistoryKey(email);
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved) as QuoteHistoryEntry[];
    }
  } catch (error) {
    console.warn('Failed to load quote history:', error);
  }
  return [];
}

export function saveToHistory(email: string, data: QuoteFormData): void {
  if (!email) return;

  try {
    const key = getHistoryKey(email);
    const history = getHistory(email);

    // Calculate total value from offer prices
    const totalValue = data.rows.reduce((sum, row) => {
      const price = parseFloat(row.offerPrice.replace(/[^0-9.]/g, ''));
      return sum + (isNaN(price) ? 0 : price);
    }, 0);

    const entry: QuoteHistoryEntry = {
      id: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      companyName: data.preparedFor,
      contactEmail: email,
      date: data.quoteDate,
      totalValue,
      currency: data.currency,
      formData: data,
      createdAt: new Date().toISOString(),
    };

    // Add to beginning, limit to max entries
    const updatedHistory = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(key, JSON.stringify(updatedHistory));
  } catch (error) {
    console.warn('Failed to save to quote history:', error);
  }
}

export function deleteFromHistory(email: string, id: string): void {
  if (!email) return;

  try {
    const key = getHistoryKey(email);
    const history = getHistory(email);
    const updatedHistory = history.filter(entry => entry.id !== id);
    localStorage.setItem(key, JSON.stringify(updatedHistory));
  } catch (error) {
    console.warn('Failed to delete from quote history:', error);
  }
}

export function clearHistory(email: string): void {
  if (!email) return;

  try {
    const key = getHistoryKey(email);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear quote history:', error);
  }
}
