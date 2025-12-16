export interface QuoteRow {
  term: string;           // e.g., "1-Year", "2-Year", "3-Year"
  users: string;          // e.g., "10"
  consultingHours: string; // e.g., "1,000/yr"
  listPrice: string;      // numeric, e.g., "150000" (kept for backward compat)
  offerPrice: string;     // numeric, e.g., "120000"
}

export type DiscountReason = 'volume' | 'strategic' | 'competitor_match' | 'renewal' | 'pilot' | 'other';
export type Urgency = 'standard' | 'urgent' | 'flexible';

export interface DealContext {
  discountReason: DiscountReason | '';
  specialTerms: string;
  decisionDate: string;   // ISO date
  urgency: Urgency | '';
}

export interface QuoteFormData {
  preparedFor: string;        // Company name (required)
  contactName: string;        // Contact full name (required)
  contactTitle: string;       // Title/designation (optional)
  contactEmail: string;       // Email (required)
  quoteDate: string;          // ISO date, defaults to today
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
  rows: QuoteRow[];
  validUntil: string;         // ISO date, defaults to quoteDate + 30 days
  preparedBy: string;         // Account Manager name (optional)
  preparedByEmail: string;    // Account Manager email (optional)
  showConfidential: boolean;  // Show CONFIDENTIAL watermark
  dealContext: DealContext;   // Internal negotiation context (not shown in PDF)
  additionalHourRate: string; // Optional per-analyst-hour rate for additional hours
}

export interface QuoteHistoryEntry {
  id: string;
  companyName: string;
  contactEmail: string;
  date: string;
  totalValue: number;
  currency: string;
  formData: QuoteFormData;
  createdAt: string;
}

export interface ValidationErrors {
  preparedFor?: string;
  contactName?: string;
  contactEmail?: string;
  rows?: { [index: number]: { listPrice?: string; offerPrice?: string } };
}

export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};
