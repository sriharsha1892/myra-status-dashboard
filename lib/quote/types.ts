export interface QuoteRow {
  term: string;           // e.g., "1-Year", "2-Year", "3-Year"
  users: string;          // e.g., "10"
  consultingHours: string; // e.g., "1,000/yr"
  listPrice: string;      // numeric, e.g., "150000" (kept for backward compat)
  offerPrice: string;     // numeric, e.g., "120000"
  additionalHourRate?: string; // Per-row rate for additional consulting hours (optional)
}

// Payment terms types
export type PaymentFrequency = 'annual' | 'semi-annual' | 'quarterly' | 'monthly';
export type PaymentBasis = 'immediate' | 'invoice' | 'msa';
export type NetTerms = 'net-30' | 'net-60' | 'net-90';

export interface PaymentTerms {
  frequency: PaymentFrequency;
  basis: PaymentBasis;
  netTerms?: NetTerms;  // Only applicable when basis is 'invoice' or 'msa'
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
  showUsersColumn: boolean;   // Show Users column in investment table
  showPromotionalPrice: boolean; // Show Promotional Price/Year and Discount columns
  dealContext: DealContext;   // Internal negotiation context (not shown in PDF)
  additionalHourRate: string; // Optional per-analyst-hour rate for additional hours
  paymentTerms: PaymentTerms; // Payment frequency and terms
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
