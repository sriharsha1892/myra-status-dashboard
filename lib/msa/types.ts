// Reuse Currency type from quote
export type { Currency } from '../quote/types';
export { CURRENCY_SYMBOLS } from '../quote/types';

// Order form row (from quote data)
export interface OrderFormRow {
  term: string;           // e.g., "1-Year", "2-Year"
  users: string;          // e.g., "10"
  consultingHours: string; // e.g., "1,000/yr"
  listPrice: string;      // numeric string
  offerPrice: string;     // numeric string
}

// Main MSA form data interface
export interface MSAFormData {
  // Client Information
  clientLegalName: string;        // Full legal entity name (required)
  clientAddress: string;          // Registered address (required)
  clientCountry: string;          // Country for jurisdiction auto-suggest (required)
  clientContactName: string;      // Signatory name (required)
  clientContactTitle: string;     // Signatory title (optional)
  clientContactEmail: string;     // Contact email (required)

  // Agreement Details
  agreementVersion: number;       // Per-client version: 1, 2, 3...
  effectiveDate: string;          // Manual entry (ISO date)
  jurisdiction: string;           // Auto-suggested based on country, editable

  // Order Form (from Quote)
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
  orderFormRows: OrderFormRow[];  // From quote
  selectedRowIndex: number;       // Winning row index (-1 = include all rows)
  showUsersColumn: boolean;       // Whether to show Users column in order form
  consultingHoursIncluded: string; // Summary of included hours
  additionalHourRate: string;     // Optional per-hour rate for additional hours

  // Optional Sections
  includeConsultingServices: boolean;  // Include Section 5
  specialTerms: string;                // Additional terms (included if non-empty)

  // Prepared By
  preparedBy: string;             // Account Manager name
  preparedByEmail: string;        // Account Manager email
  sourceQuoteId?: string;         // If generated from existing quote
}

// MSA history entry for localStorage
export interface MSAHistoryEntry {
  id: string;
  clientLegalName: string;
  agreementVersion: number;
  effectiveDate: string;
  totalValue: number;
  currency: string;
  formData: MSAFormData;
  createdAt: string;
}

// Validation errors interface
export interface MSAValidationErrors {
  clientLegalName?: string;
  clientAddress?: string;
  clientCountry?: string;
  clientContactName?: string;
  clientContactEmail?: string;
  effectiveDate?: string;
  orderFormRows?: { [index: number]: { offerPrice?: string } };
}
