import type { MSAFormData, MSAHistoryEntry } from './types';
import { DEFAULT_MSA_FORM } from './constants';
import { ACCOUNT_MANAGERS } from '../quote/constants';

// Helper to lookup AM email by name
function getAMEmail(name: string): string {
  const am = ACCOUNT_MANAGERS.find(a => a.name === name);
  return am?.email || '';
}

const MSA_DRAFT_KEY = 'myra_msa_draft';
const MSA_HISTORY_PREFIX = 'myra_msa_history_';
const MAX_HISTORY_ENTRIES = 10;

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
export function saveMSADraft(data: MSAFormData): void {
  try {
    localStorage.setItem(MSA_DRAFT_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save MSA draft:', error);
  }
}

export function loadMSADraft(): MSAFormData | null {
  try {
    const saved = localStorage.getItem(MSA_DRAFT_KEY);
    if (saved) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = JSON.parse(saved) as any;
      const effectiveDate = parsed.effectiveDate ?? new Date().toISOString().split('T')[0];

      // Ensure backward compatibility with drafts missing new fields
      return {
        clientLegalName: parsed.clientLegalName ?? '',
        clientAddress: parsed.clientAddress ?? '',
        clientCountry: parsed.clientCountry ?? '',
        clientContactName: parsed.clientContactName ?? '',
        clientContactTitle: parsed.clientContactTitle ?? '',
        clientContactEmail: parsed.clientContactEmail ?? '',
        agreementVersion: parsed.agreementVersion ?? 1,
        effectiveDate,
        jurisdiction: parsed.jurisdiction ?? '',
        currency: parsed.currency ?? 'USD',
        orderFormRows: parsed.orderFormRows ?? DEFAULT_MSA_FORM.orderFormRows,
        selectedRowIndex: parsed.selectedRowIndex ?? -1,
        showUsersColumn: parsed.showUsersColumn ?? true,
        consultingHoursIncluded: parsed.consultingHoursIncluded ?? '',
        additionalHourRate: parsed.additionalHourRate ?? '',
        includeConsultingServices: parsed.includeConsultingServices ?? true,
        specialTerms: parsed.specialTerms ?? '',
        preparedBy: parsed.preparedBy ?? '',
        preparedByEmail: parsed.preparedByEmail || getAMEmail(parsed.preparedBy ?? ''),
        sourceQuoteId: parsed.sourceQuoteId,
      };
    }
  } catch (error) {
    console.warn('Failed to load MSA draft:', error);
  }
  return null;
}

export function clearMSADraft(): void {
  try {
    localStorage.removeItem(MSA_DRAFT_KEY);
  } catch (error) {
    console.warn('Failed to clear MSA draft:', error);
  }
}

// MSA history (per email)
function getHistoryKey(email: string): string {
  return `${MSA_HISTORY_PREFIX}${hashEmail(email)}`;
}

export function getMSAHistory(email: string): MSAHistoryEntry[] {
  if (!email) return [];

  try {
    const key = getHistoryKey(email);
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved) as MSAHistoryEntry[];
    }
  } catch (error) {
    console.warn('Failed to load MSA history:', error);
  }
  return [];
}

export function saveToMSAHistory(email: string, data: MSAFormData): void {
  if (!email) return;

  try {
    const key = getHistoryKey(email);
    const history = getMSAHistory(email);

    // Calculate total value from order form rows
    const rowsToSum = data.selectedRowIndex >= 0
      ? [data.orderFormRows[data.selectedRowIndex]]
      : data.orderFormRows;

    const totalValue = rowsToSum.reduce((sum, row) => {
      if (!row) return sum;
      const price = parseFloat(row.offerPrice.replace(/[^0-9.]/g, ''));
      return sum + (isNaN(price) ? 0 : price);
    }, 0);

    const entry: MSAHistoryEntry = {
      id: `msa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      clientLegalName: data.clientLegalName,
      agreementVersion: data.agreementVersion,
      effectiveDate: data.effectiveDate,
      totalValue,
      currency: data.currency,
      formData: data,
      createdAt: new Date().toISOString(),
    };

    // Add to beginning, limit to max entries
    const updatedHistory = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(key, JSON.stringify(updatedHistory));
  } catch (error) {
    console.warn('Failed to save to MSA history:', error);
  }
}

export function deleteFromMSAHistory(email: string, id: string): void {
  if (!email) return;

  try {
    const key = getHistoryKey(email);
    const history = getMSAHistory(email);
    const updatedHistory = history.filter(entry => entry.id !== id);
    localStorage.setItem(key, JSON.stringify(updatedHistory));
  } catch (error) {
    console.warn('Failed to delete from MSA history:', error);
  }
}

export function clearMSAHistory(email: string): void {
  if (!email) return;

  try {
    const key = getHistoryKey(email);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear MSA history:', error);
  }
}
