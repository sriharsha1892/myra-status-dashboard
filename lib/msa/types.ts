// Reuse types from quote for consistency
export type { Currency } from '../quote/types';
export { CURRENCY_SYMBOLS } from '../quote/types';

// Import payment types from quote system for pricing flexibility alignment
export type { PaymentFrequency, PaymentBasis, NetTerms, PaymentTerms } from '../quote/types';

// Order form row (from quote data)
export interface OrderFormRow {
  term: string;           // e.g., "1-Year", "2-Year"
  users: string;          // e.g., "10"
  consultingHours: string; // e.g., "1,000/yr"
  listPrice: string;      // numeric string
  offerPrice: string;     // numeric string
  additionalHourRate?: string; // Per-row rate for additional hours (optional, can vary per row)
}

// Main MSA form data interface
export interface MSAFormData {
  // Client Information
  clientLegalName: string;        // Full legal entity name (required)
  clientAddress: string;          // Registered address (required)
  clientCountry: string;          // Country for jurisdiction auto-suggest (required)
  clientContactName: string;      // Signatory/Primary contact name (required)
  clientContactTitle: string;     // Signatory title (optional)
  clientContactEmail: string;     // Contact email (required)
  clientContactPhone?: string;    // Contact phone (optional)

  // Agreement Details
  agreementVersion: number;       // Per-client version: 1, 2, 3...
  effectiveDate: string;          // Manual entry (ISO date)
  jurisdiction: string;           // Auto-suggested based on country, editable

  // Order Form (from Quote)
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
  orderFormRows: OrderFormRow[];  // From quote (flexible row-based pricing)
  selectedRowIndices: number[];   // Winning row indices (empty = include all rows)
  showUsersColumn: boolean;       // Whether to show Users column in order form
  consultingHoursIncluded: string; // Summary of included hours
  // Note: additionalHourRate is now per-row in OrderFormRow

  // Payment Terms (aligned with quote system for full flexibility)
  paymentTerms: {                 // Required: matches quote PaymentTerms
    frequency: 'annual' | 'semi-annual' | 'quarterly' | 'monthly';
    basis: 'immediate' | 'invoice' | 'msa';
    netTerms?: 'net-30' | 'net-60' | 'net-90';
  };
  customPaymentText?: string;     // Optional override for payment terms display text

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
