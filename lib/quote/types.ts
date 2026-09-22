export interface QuoteRow {
  term: string;           // e.g., "1-Year", "2-Year", "3-Year"
  users: string;          // e.g., "10"
  consultingHours: string; // e.g., "1,000/yr"
  listPrice: string;      // numeric, e.g., "150000" (kept for backward compat)
  offerPrice: string;     // numeric, e.g., "120000"
  additionalHourRate?: string; // Per-row rate for additional consulting hours (optional)
}

// Pay-Per-Use / Project-Based pricing row
export interface PPUQuoteRow {
  term: string;               // e.g., "1-Year"
  namedUsers: string;          // Default "Unlimited", AM can set a number
  projectsIncluded: string;    // e.g., "25", "50", "100"
  consultingHours: string;     // e.g., "25/year"
  listPrice: string;
  offerPrice: string;
  overageRate?: string;        // Per-project overage rate (optional)
}

export type PricingModel = 'per-seat' | 'per-project';

export interface PricingOptionGroup {
  id: string;                  // UUID for keying
  label: string;               // e.g., "Option A: User-Based"
  pricingModel: PricingModel;
  rows: QuoteRow[];            // Used when pricingModel === 'per-seat'
  ppuRows: PPUQuoteRow[];      // Used when pricingModel === 'per-project'
  showUsersColumn: boolean;
  showPromotionalPrice: boolean;
  showProjectsColumn: boolean;
  showOverageRate: boolean;
  additionalHourRate: string;
  scopeDefinition?: string;    // "What counts as a Research Project?" paragraph
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
  rows: QuoteRow[];           // Per-seat rows (used when pricingOptions is absent)
  validUntil: string;         // ISO date, defaults to quoteDate + 30 days
  preparedBy: string;         // Account Manager name (optional)
  preparedByEmail: string;    // Account Manager email (optional)
  showConfidential: boolean;  // Show CONFIDENTIAL watermark
  showUsersColumn: boolean;   // Show Users column in investment table
  showPromotionalPrice: boolean; // Show Promotional Price/Year and Discount columns
  dealContext: DealContext;   // Internal negotiation context (not shown in PDF)
  additionalHourRate: string; // Optional per-analyst-hour rate for additional hours
  paymentTerms: PaymentTerms; // Payment frequency and terms
  pricingOptions?: PricingOptionGroup[]; // Multiple option groups (per-seat + PPU). When absent, uses `rows`.
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

// ============================================================
// Quote register (admin) — persisted + derived shapes
// ============================================================

/** Lifecycle status stored on `quotes.status`. */
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined';
export const QUOTE_STATUSES: readonly QuoteStatus[] = ['draft', 'sent', 'accepted', 'declined'] as const;

/** One row inside a stored pricing option group. Per-seat and per-project rows share this shape. */
export interface StoredOptionRow {
  term: string;
  users?: string;            // per-seat
  namedUsers?: string;       // per-project
  projectsIncluded?: string; // per-project
  consultingHours: string;
  listPrice: string;
  offerPrice: string;
  additionalHourRate?: string;
  overageRate?: string;
}

/** A pricing option group as persisted in `quotes.pricing_options` (UI-only flags stripped). */
export interface StoredPricingOption {
  label: string;
  pricingModel: PricingModel;
  rows: StoredOptionRow[];
  scopeDefinition?: string;
}

/** Legacy flat `quotes.line_items` row (pre pricing_options). */
export interface LegacyLineItem {
  term?: string;
  users?: string;
  consultingHours?: string;
  investment?: string | number;
}

/** One selectable option, normalised for display and filtering. An option is a single row. */
export interface QuoteOption {
  groupLabel: string;
  model: PricingModel;
  term: string;
  users: string | null;     // per-seat seats, or per-project named users
  projects: string | null;  // per-project only
  hours: string;
  price: number | null;
}

export type UsersBand = '1' | '2-5' | '6-10' | '10+';
export type OptionCountBucket = 'single' | 'multi';
export type RegisterDateRange = 'all' | '30d' | '90d' | '12mo';

/** A quote as served by /api/quote/list. All versions are served, newest first. */
export interface RegisterQuote {
  id: string;
  reference: string;
  version: number;
  companyName: string;
  contactName: string;
  contactEmail: string;
  preparedBy: string;
  currency: Currency;
  status: QuoteStatus;
  createdAt: string;
  quoteDate: string;
  validUntil: string | null;
  downloadCount: number;
  optionCount: number;
  valueMin: number | null;
  valueMax: number | null;
  options: QuoteOption[];
}

/** Quotes grouped by account (company). */
export interface Account {
  key: string;
  companyName: string;
  ams: string[];
  contacts: string[];
  quotes: RegisterQuote[]; // newest first
  latest: RegisterQuote;
}

export interface RegisterFilters {
  search: string;
  ams: string[];
  statuses: QuoteStatus[];
  terms: string[];
  models: PricingModel[];
  optionCounts: OptionCountBucket[];
  usersBands: UsersBand[];
  dateRange: RegisterDateRange;
}

export interface RegisterFacets {
  ams: Array<{ name: string; count: number }>;
  terms: string[];
  models: PricingModel[];
  statuses: Array<{ status: QuoteStatus; count: number }>;
}

export interface QuoteRegisterResponse {
  accounts: Account[];
  facets: RegisterFacets;
  totals: { accounts: number; quotes: number; options: number };
}
