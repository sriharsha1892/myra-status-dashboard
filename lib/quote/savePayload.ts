/**
 * Builds the POST /api/quote/save payload from the generator's form state.
 *
 * The generator has two modes:
 *  - single (flat `rows`, per-seat)
 *  - multi-option (`pricingOptions` groups, per-seat and/or per-project)
 *
 * Both are persisted as structured `pricingOptions`. `lineItems` is a flattened
 * legacy view kept for readers that still consume `quotes.line_items`.
 */

import type { QuoteFormData, QuoteRow, StoredPricingOption } from './types';
import type { QuoteSavePayload } from '@/lib/validation/schemas/quote';

function isMeaningfulRow(r: { term?: string; users?: string; consultingHours?: string; offerPrice?: string; projectsIncluded?: string }): boolean {
  return !!(r.term || r.users || r.consultingHours || r.offerPrice || r.projectsIncluded);
}

/** Per-seat rows → stored option group. */
function perSeatGroup(label: string, rows: QuoteRow[], scopeDefinition?: string): StoredPricingOption {
  return {
    label,
    pricingModel: 'per-seat',
    rows: rows.filter(isMeaningfulRow).map((r) => ({
      term: r.term,
      users: r.users,
      consultingHours: r.consultingHours,
      listPrice: r.listPrice,
      offerPrice: r.offerPrice,
      additionalHourRate: r.additionalHourRate,
    })),
    scopeDefinition,
  };
}

export function buildPricingOptions(formData: QuoteFormData): StoredPricingOption[] {
  if (formData.pricingOptions && formData.pricingOptions.length > 0) {
    return formData.pricingOptions
      .map((group): StoredPricingOption => {
        if (group.pricingModel === 'per-project') {
          return {
            label: group.label,
            pricingModel: 'per-project',
            rows: group.ppuRows.filter(isMeaningfulRow).map((r) => ({
              term: r.term,
              namedUsers: r.namedUsers,
              projectsIncluded: r.projectsIncluded,
              consultingHours: r.consultingHours,
              listPrice: r.listPrice,
              offerPrice: r.offerPrice,
              overageRate: r.overageRate,
            })),
            scopeDefinition: group.scopeDefinition,
          };
        }
        return perSeatGroup(group.label, group.rows, group.scopeDefinition);
      })
      .filter((g) => g.rows.length > 0);
  }
  return [perSeatGroup('Option A: User-Based', formData.rows)].filter((g) => g.rows.length > 0);
}

/** Flattened legacy line items across all groups. */
export function buildLegacyLineItems(groups: StoredPricingOption[]): QuoteSavePayload['lineItems'] {
  return groups.flatMap((g) =>
    g.rows.map((r) => ({
      term: r.term,
      users: g.pricingModel === 'per-project' ? (r.namedUsers ?? '') : (r.users ?? ''),
      consultingHours: r.consultingHours,
      investment: r.offerPrice,
    }))
  );
}

/** Quote reference: MQ-YYYYMMDD-XXXX. Date defaults to now. */
export function generateQuoteReference(date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MQ-${dateStr}-${random}`;
}

export function buildQuoteSavePayload(formData: QuoteFormData, quoteReference: string): QuoteSavePayload {
  const pricingOptions = buildPricingOptions(formData);
  return {
    quoteReference,
    companyName: formData.preparedFor,
    contactName: formData.contactName,
    contactEmail: formData.contactEmail,
    contactTitle: formData.contactTitle || undefined,
    quoteDate: formData.quoteDate,
    validUntil: formData.validUntil,
    currency: formData.currency,
    pricingOptions,
    lineItems: buildLegacyLineItems(pricingOptions),
    preparedBy: formData.preparedBy || 'Unknown AM',
    dealContext: {
      discountReason: formData.dealContext.discountReason || undefined,
      specialTerms: formData.dealContext.specialTerms || undefined,
      decisionDate: formData.dealContext.decisionDate || undefined,
      urgency: formData.dealContext.urgency || undefined,
    },
  };
}
