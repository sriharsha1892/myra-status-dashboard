import { rgb } from 'pdf-lib';
import type { QuoteRow, DiscountReason, Urgency } from './types';

// Brand colors (RGB 0-1 for pdf-lib)
export const PDF_COLORS = {
  violet: rgb(0.486, 0.227, 0.929),      // #7C3AED
  slate900: rgb(0.059, 0.090, 0.165),    // #0F172A
  slate700: rgb(0.200, 0.255, 0.333),    // #334155
  slate600: rgb(0.278, 0.333, 0.412),    // #475569
  slate500: rgb(0.392, 0.455, 0.545),    // #64748B
  slate400: rgb(0.580, 0.639, 0.722),    // #94A3B8
  slate200: rgb(0.886, 0.910, 0.941),    // #E2E8F0
  slate50: rgb(0.973, 0.976, 0.984),     // #F8FAFC
  white: rgb(1, 1, 1),
};

// Page dimensions (A4)
export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN_LEFT = 56;
export const MARGIN_RIGHT = 56;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Static content
export const STATIC_CONTENT = {
  theProposal: `This quotation covers an annual subscription to myRA AI®, a research platform that combines multi-agent AI workflows with on-demand expert review from Mordor Intelligence's research network. Outputs are traceable to source, and domain experts are available to enrich findings with perspective and judgment.`,

  platformAccessBullets: [
    'Unlimited platform access for all licensed users',
    'Multi-format exports: PDF, Word, PowerPoint, Excel',
    'Proprietary datasets and Mordor Intelligence knowledge base surfaced contextually',
    'Collaboration features including project workspaces and internal file sharing',
    'Enterprise portal provisioning available for isolated environments',
    'Organization admins manage user access, roles, and permissions',
  ],

  howWeWorkBullets: [
    'Dedicated Account Manager overseeing your engagement',
    'Domain expert access for consulting hours and Expert Review',
    'Periodic reviews to assess usage and align priorities',
    'In-app support via Intercom built directly into the platform',
  ],

  accessAndSetup: `myRA is a self-service, browser-based platform. No IT involvement is required unless enterprise network policies require domain whitelisting. A configuration guide is provided if needed. All feature updates are pushed directly to the platform with no manual action required.`,

  securityBullets: [
    'Highly secure platform with zero data retention on LLM providers. Prompts and outputs are not stored or used for training.',
    'Encryption in transit (TLS 1.2+), role-based access control managed by organization admins',
    'Aligned with GDPR and global privacy frameworks',
    'Full Security & Compliance Overview available on request',
  ],

  commercialTerms: {
    billing: 'Annual, invoiced upfront',
    licensing: 'Named-user basis',
    provisioning: 'Within 2-3 business days of confirmation',
  },

  paymentNote: `Payment modes and terms can be discussed with your Account Manager.`,

  additionalHoursNote: (rate: string, currencySymbol: string) =>
    `Additional consulting hours available at ${currencySymbol}${rate}/hour beyond the included allocation.`,

  expertReview: `Expert Review is integrated into the platform workflow. Send claims, files, or full conversations for review by domain specialists. Turnaround is 24-48 hours; async communication with assigned experts is available in-platform. Consulting hours apply flexibly across strategy, product, procurement, or corporate development for benchmarking, methodology, scenario analysis, or primary research support. Hour consumption is communicated before work commences.`,

  nextSteps: (amName: string, amEmail: string) => {
    const contact = amName
      ? `${amName} (Designated Account Manager)${amEmail ? ` at ${amEmail}` : ''}`
      : 'your Account Manager';
    return `Upon confirmation, we provision your environment and schedule onboarding. A Master Services Agreement will be shared for execution. Contact ${contact} to proceed.`;
  },

  importantNotice: (amName: string, amEmail: string) => {
    const contact = amName
      ? `${amName} (Designated Account Manager)${amEmail ? ` at ${amEmail}` : ''}`
      : 'your Account Manager';
    return `Important Notice: This quotation is for planning purposes and does not constitute a binding agreement. Final terms are subject to the executed Master Services Agreement. Pricing valid for the period stated; extensions require written confirmation. Expert Review turnaround times are service targets. For details, contact ${contact}.`;
  },

  footerLine1: 'ISO 9001:2015 Certified · ESOMAR Corporate Member · MRSI Certified · Great Place to Work Certified',
  footerLine2: 'myRA AI® is a registered trademark.',
};

// Template presets
export interface TemplatePreset {
  name: string;
  description: string;
  rows: QuoteRow[];
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    name: '1-Year Standard',
    description: '10 users, 500 consulting hours',
    rows: [
      {
        term: '1-Year',
        users: '10',
        consultingHours: '500/yr',
        listPrice: '75000',
        offerPrice: '60000',
      },
    ],
  },
  {
    name: '2-Year Growth',
    description: '25 users, 1,000 consulting hours',
    rows: [
      {
        term: '2-Year',
        users: '25',
        consultingHours: '1,000/yr',
        listPrice: '250000',
        offerPrice: '200000',
      },
    ],
  },
  {
    name: '3-Year Enterprise',
    description: '50 users, 2,000 consulting hours',
    rows: [
      {
        term: '3-Year',
        users: '50',
        consultingHours: '2,000/yr',
        listPrice: '600000',
        offerPrice: '480000',
      },
    ],
  },
];

// Discount reason options for deal context
export const DISCOUNT_REASONS: { value: DiscountReason; label: string }[] = [
  { value: 'volume', label: 'Volume Commitment' },
  { value: 'strategic', label: 'Strategic Account' },
  { value: 'competitor_match', label: 'Competitor Match' },
  { value: 'renewal', label: 'Renewal Pricing' },
  { value: 'pilot', label: 'Pilot / POC' },
  { value: 'other', label: 'Other' },
];

// Urgency options for deal context
export const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'flexible', label: 'Flexible' },
];

// Term options for investment table dropdown
export const TERM_OPTIONS: { value: string; label: string }[] = [
  { value: '1-Year', label: '1-Year' },
  { value: '2-Year', label: '2-Year' },
  { value: '3-Year', label: '3-Year' },
  { value: '6-Month', label: '6-Month' },
  { value: '3-Month', label: '3-Month' },
  { value: 'custom', label: 'Custom...' },
];

// Currency exchange rates (approximate, for estimation only)
// Base: USD = 1
export const CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
};

// Account Managers list with email mapping
export const ACCOUNT_MANAGERS: { name: string; email: string }[] = [
  { name: 'Satish Boini', email: 'satish.boini@mordorintelligence.com' },
  { name: 'Satyananth P', email: 'satyananth@mordorintelligence.com' },
  { name: 'Sudeshana Jain', email: 'sudeshana@mordorintelligence.com' },
  { name: 'Kirandeep Kaur', email: 'kirandeep.kaur@mordorintelligence.com' },
  { name: 'Kartheek Puttaparthini', email: 'kartheek@mordorintelligence.com' },
  { name: 'Krati Agarwal', email: 'krati@mordorintelligence.com' },
  { name: 'Nikita Manmode', email: 'nikita@mordorintelligence.com' },
];

// Default deal context
export const DEFAULT_DEAL_CONTEXT = {
  discountReason: '' as const,
  specialTerms: '',
  decisionDate: '',
  urgency: '' as const,
};

// Default form values
export const DEFAULT_QUOTE_FORM: Omit<import('./types').QuoteFormData, 'quoteDate' | 'validUntil'> = {
  preparedFor: '',
  contactName: '',
  contactTitle: '',
  contactEmail: '',
  currency: 'USD',
  rows: [
    {
      term: '1-Year',
      users: '',
      consultingHours: '',
      listPrice: '',
      offerPrice: '',
    },
  ],
  preparedBy: '',
  preparedByEmail: '',
  showConfidential: true,
  dealContext: DEFAULT_DEAL_CONTEXT,
  additionalHourRate: '',
};

// Common company suffixes to exclude from client code generation
// Per spec: Ltd, Limited, Inc, Private, Corporation, Group, LLC, Pvt
export const COMPANY_SUFFIXES = [
  'Ltd',
  'Limited',
  'Inc',
  'Incorporated',
  'Private',
  'Corporation',
  'Corp',
  'Group',
  'LLC',
  'Pvt',
  'PLC',
  'Co',
  'LLP',
];
