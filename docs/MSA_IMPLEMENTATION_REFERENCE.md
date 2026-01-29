# MSA Implementation Reference

> **Purpose**: Reference document for restructuring the MSA (Master Service Agreement) generator.
> **Generated**: 2025-12-29

---

## Overview

The MSA system is a **client-side document generator** that creates legally-binding Master Service Agreements as PDF/Word documents. It shares authentication and some types with the Quote system.

---

## File Structure

```
app/
├── quote/
│   ├── msa/
│   │   └── page.tsx              # Main MSA wizard (1,377 lines) - 4-step form
│   └── page.tsx                  # Sales documents landing (includes MSA card)
├── api/
│   └── quote/
│       ├── save/route.ts         # Save quote endpoint (shared)
│       └── pipeline/stats/route.ts # Pipeline stats with MSA counts

components/
├── msa/
│   ├── MSAHistory.tsx            # History sidebar panel (128 lines)
│   └── MSAPreviewModal.tsx       # PDF preview modal (118 lines)
└── quote/
    └── QuoteAuthModal.tsx        # Shared auth modal

lib/
├── msa/
│   ├── types.ts                  # MSAFormData, OrderFormRow, MSAHistoryEntry
│   ├── constants.ts              # MSA_SECTIONS template (961 lines), countries, jurisdictions
│   ├── storage.ts                # localStorage persistence (189 lines)
│   ├── pdf-generator.ts          # PDF generation with pdf-lib
│   └── docx-generator.ts         # Word generation with docx package
└── quote/
    └── auth.ts                   # Shared auth utilities

supabase/migrations/
├── 20251217_sales_pipeline.sql   # MSA table definition
└── 20251216_quotes_table.sql     # Related quotes table
```

---

## Core Types (`lib/msa/types.ts`)

```typescript
interface MSAFormData {
  // Client Information
  clientLegalName: string;
  clientAddress: string;
  clientCountry: string;
  clientContactName: string;
  clientContactTitle?: string;
  clientContactEmail: string;
  clientContactPhone?: string;

  // Agreement Details
  agreementVersion: number;
  effectiveDate: string;           // ISO date
  jurisdiction: string;

  // Order Form
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
  orderFormRows: OrderFormRow[];
  selectedRowIndices: number[];    // Empty = all rows included
  showUsersColumn: boolean;
  consultingHoursIncluded: string;

  // Payment Terms
  paymentTerms: {
    frequency: 'annual' | 'semi_annual' | 'quarterly' | 'monthly';
    basis: 'immediate' | 'invoice' | 'msa';
    netTerms: 'net_0' | 'net_15' | 'net_30' | 'net_45' | 'net_60';
  };
  customPaymentText?: string;

  // Optional Sections
  includeConsultingServices: boolean;
  specialTerms: string;

  // Metadata
  preparedBy: string;
  preparedByEmail: string;
  sourceQuoteId?: string;
}

interface OrderFormRow {
  term: '1-Year' | '2-Year' | '3-Year' | '6-Month' | '3-Month';
  users: string;
  consultingHours: string;
  listPrice: string;               // Numeric string
  offerPrice: string;              // Numeric string
  additionalHourRate?: string;     // Per-row optional rate
}

interface MSAHistoryEntry {
  id: string;
  clientLegalName: string;
  agreementVersion: number;
  effectiveDate: string;
  totalValue: number;
  currency: string;
  formData: MSAFormData;
  createdAt: string;
}
```

---

## MSA Wizard Flow (`app/quote/msa/page.tsx`)

### Step 1: Client Details
- Client legal name (required)
- Address
- Country (autocomplete with 200+ countries)
- Contact: name, title, email, phone

### Step 2: Agreement Details
- Agreement version (auto-increment per client)
- Effective date
- Jurisdiction (auto-suggested from country)
- Include consulting services toggle

### Step 3: Order Form
- Multi-row pricing table
- Columns: Term, Users, Consulting Hours, List Price, Offer Price, Additional Hour Rate
- Currency selector (USD/EUR/GBP/INR)
- Payment terms: frequency, basis, net terms
- Row selection for "winning" rows

### Step 4: Review & Generate
- Special terms (free text)
- Live preview panel
- Download PDF / Download Word buttons

---

## MSA Document Template (`lib/msa/constants.ts`)

**26 Sections + Annexures:**

| # | Section | Key Content |
|---|---------|-------------|
| 1 | Definitions | Terms used throughout |
| 2 | Grant of License | 1.1-1.5: License scope, restrictions |
| 3 | Permitted Use | 2.1-2.2: Usage rights |
| 4 | Nature of License | 3.1-3.2: Non-exclusive, revocable |
| 5 | Consulting Services | 3.3-3.5: **Optional** - hours, rates, scheduling |
| 6 | Analyst Hours Indemnity | 3.4: Usage tracking |
| 7 | Termination of Consulting | 3.5: Hour expiration |
| 8-10 | AI Outputs & IP | 3.6-3.10: Ownership, disclaimers |
| 11 | Sublicensing | 4: Restrictions |
| 12 | License Term & Renewal | 5: Duration, auto-renewal |
| 13 | License Revocation | 6: Termination rights |
| 14 | Compliance & Audit | 7: Usage monitoring |
| 15 | Feedback | 8: IP ownership |
| 16 | Order Form & Fees | 9: Payment terms, taxes, late fees |
| 17 | Term & Termination | 10: Contract lifecycle |
| 18 | Service Levels | 11: SLA reference |
| 19 | Performance & Warranties | 12: Service guarantees |
| 20 | Customer Data | 13: Data ownership |
| 21 | Confidentiality | 14: NDA terms |
| 22 | Data Protection | 15: GDPR, DPDPA, CCPA |
| 23 | Ownership Summary | 16: Asset table |
| 24 | Warranties | 17: Representations |
| 25 | Indemnification | 18: Liability |
| 26 | AI Disclaimers | 19: AI-specific terms |
| 27 | Limitation of Liability | 20: Caps |
| 28 | Remedies | 21: Equitable relief |
| 29 | Subcontracting | 22: Assignment |
| 30 | Dispute Resolution | 23: Arbitration (Hyderabad) |
| 31 | Force Majeure | 24: Exceptions |
| 32 | Notices | 25: Communication |
| 33 | General Provisions | 26: Miscellaneous |
| A | SLA Annexure | 99.5% uptime, response times |
| B | Order Form Annexure | Pricing table |

**Key Constants:**
- `MORDOR_SIGNATORY`: Fixed CEO details (Bharadwaj Obula Reddy)
- `JURISDICTION_BY_COUNTRY`: 50+ country → jurisdiction mappings
- `COUNTRIES`: 200+ countries for autocomplete
- `DEFAULT_MSA_FORM`: Initial form values

---

## Storage Layer (`lib/msa/storage.ts`)

**localStorage Keys:**
- `myra_msa_draft` - Current draft (auto-saved every 500ms)
- `myra_msa_history_{emailHash}` - Per-email history (max 10 entries)

**Functions:**
```typescript
saveMSADraft(data: MSAFormData): void
loadMSADraft(): MSAFormData | null
clearMSADraft(): void
getMSAHistory(email: string): MSAHistoryEntry[]
saveToMSAHistory(email: string, data: MSAFormData): void
deleteFromMSAHistory(email: string, id: string): void
clearMSAHistory(email: string): void
```

---

## Document Generation

### PDF (`lib/msa/pdf-generator.ts`)
- **Library**: `pdf-lib`
- **Output**: `Uint8Array`
- **Filename**: `myRA_MSA_{ClientCode}_v{version}_{YYYYMMDD}.pdf`
- Client code = first 4 letters excluding legal suffixes (Inc, LLC, etc.)

### Word (`lib/msa/docx-generator.ts`)
- **Library**: `docx`
- **Output**: `Uint8Array`
- **Filename**: `myRA_MSA_{ClientCode}_v{version}_{YYYYMMDD}.docx`
- Editable format for client modifications

---

## Database Schema

```sql
CREATE TABLE msas (
  id UUID PRIMARY KEY,
  msa_reference TEXT NOT NULL,          -- "MSA-20251228-001"
  version INTEGER DEFAULT 1,

  -- Client
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_title TEXT,
  client_address TEXT,
  client_country TEXT,

  -- Agreement
  effective_date DATE NOT NULL,
  jurisdiction TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Financials
  total_value DECIMAL(12,2) NOT NULL,
  line_items JSONB NOT NULL,            -- OrderFormRow[]

  -- Consulting
  consulting_hours INTEGER,
  additional_hour_rate DECIMAL(8,2),
  include_consulting BOOLEAN DEFAULT true,

  -- Terms
  special_terms TEXT,

  -- Metadata
  prepared_by TEXT NOT NULL,
  prepared_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Relations
  pipeline_id UUID REFERENCES sales_pipeline(id)
);
```

---

## Integration Points

### With Quote System
- Shares `QuoteAuthModal` for authentication
- Shares types: `Currency`, `PaymentTerms`, `PaymentFrequency`, etc.
- Shares `ACCOUNT_MANAGERS` list
- Shares payment constants and `getBillingText()` utility

### With Sales Pipeline
- `sales_pipeline.stage` can be 'msa'
- `sales_pipeline.msa_id` references MSA record
- Pipeline stats endpoint counts MSA stage deals

---

## Current Limitations

| Limitation | Description |
|------------|-------------|
| Client-side only | PDFs generated in browser, not server |
| localStorage | Draft/history limited to ~5MB browser storage |
| No cloud storage | PDFs not archived, only downloaded |
| Email-keyed history | History tied to email hash, not user ID |
| Max 10 history | Per-email history capped at 10 entries |
| No versioning | No diff tracking between MSA versions |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           MSA CREATION FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

User opens /quote/msa
        │
        ▼
┌───────────────────┐     No      ┌─────────────────────┐
│ isAuthenticated?  │────────────▶│   QuoteAuthModal    │
└───────────────────┘             └─────────────────────┘
        │ Yes                              │
        ▼                                  ▼
┌───────────────────┐             ┌─────────────────────┐
│  loadMSADraft()   │             │  Verify password    │
│  from localStorage│             │  setAuthenticated() │
└───────────────────┘             └─────────────────────┘
        │                                  │
        ▼                                  │
┌───────────────────┐◀─────────────────────┘
│   MSA Wizard      │
│   4-Step Form     │
└───────────────────┘
        │
        │ Auto-save (debounced 500ms)
        ▼
┌───────────────────┐
│  saveMSADraft()   │
│  to localStorage  │
└───────────────────┘
        │
        │ User clicks Download
        ▼
┌───────────────────┐
│ generateMSAPDF()  │────────▶ myRA_MSA_ACME_v1_20251229.pdf
│     or            │
│ generateMSAWord() │────────▶ myRA_MSA_ACME_v1_20251229.docx
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ saveToMSAHistory()│
│  (max 10 entries) │
└───────────────────┘
```

---

## Questions for Restructuring

1. **Server-side generation?** Should PDFs be generated server-side for archival?
2. **Database persistence?** Should all MSAs be saved to Supabase by default?
3. **Version control?** Need diff tracking between MSA versions?
4. **Template management?** Should MSA sections be editable in admin?
5. **Workflow integration?** Tighter coupling with sales pipeline stages?
6. **E-signature?** Integration with DocuSign/HelloSign?
7. **Approval workflow?** Internal review before sending to client?

---

## Files to Read for Full Context

| Priority | File | Lines | Purpose |
|----------|------|-------|---------|
| 1 | `app/quote/msa/page.tsx` | 1,377 | Main wizard implementation |
| 2 | `lib/msa/constants.ts` | 961 | Full MSA template |
| 3 | `lib/msa/types.ts` | ~80 | Type definitions |
| 4 | `lib/msa/pdf-generator.ts` | ~400 | PDF rendering logic |
| 5 | `lib/msa/storage.ts` | 189 | Persistence layer |
