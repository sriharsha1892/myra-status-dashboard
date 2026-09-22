/**
 * Quote API validation schemas
 *
 * Used by /api/quote/save (POST) and /api/quote/[id] (PATCH).
 */

import { z } from 'zod';

export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'INR'], {
  message: 'Currency must be one of USD, EUR, GBP, INR',
});

export const quoteStatusSchema = z.enum(['draft', 'sent', 'accepted', 'declined'], {
  message: 'Status must be one of draft, sent, accepted, declined',
});

const optionalText = z.string().optional();

/** One row inside a pricing option group (per-seat or per-project). */
export const storedOptionRowSchema = z.object({
  term: z.string({ message: 'Term is required' }),
  users: optionalText,
  namedUsers: optionalText,
  projectsIncluded: optionalText,
  consultingHours: z.string().default(''),
  listPrice: z.string().default(''),
  offerPrice: z.string().default(''),
  additionalHourRate: optionalText,
  overageRate: optionalText,
});

export const storedPricingOptionSchema = z.object({
  label: z.string().default(''),
  pricingModel: z.enum(['per-seat', 'per-project'], {
    message: 'Pricing model must be per-seat or per-project',
  }),
  rows: z.array(storedOptionRowSchema).min(1, { message: 'Each option group needs at least one row' }),
  scopeDefinition: optionalText,
});

/** Legacy flat line item kept for readers that still consume line_items. */
export const legacyLineItemSchema = z.object({
  term: z.string().default(''),
  users: z.string().default(''),
  consultingHours: z.string().default(''),
  investment: z.string().default(''),
});

export const dealContextSchema = z
  .object({
    discountReason: optionalText,
    specialTerms: optionalText,
    decisionDate: optionalText,
    urgency: optionalText,
  })
  .optional();

export const quoteSavePayloadSchema = z.object({
  quoteReference: z.string().min(1, { message: 'Quote reference is required' }),
  companyName: z.string().min(1, { message: 'Company name is required' }),
  contactName: z.string().min(1, { message: 'Contact name is required' }),
  contactEmail: z.string().min(1, { message: 'Contact email is required' }),
  contactTitle: optionalText,
  quoteDate: z.string().min(1, { message: 'Quote date is required' }),
  validUntil: z.string().min(1, { message: 'Valid-until date is required' }),
  currency: currencySchema,
  pricingOptions: z
    .array(storedPricingOptionSchema)
    .min(1, { message: 'At least one pricing option group is required' }),
  lineItems: z.array(legacyLineItemSchema).default([]),
  preparedBy: z.string().min(1, { message: 'Prepared-by is required' }),
  dealContext: dealContextSchema,
});

export type QuoteSavePayload = z.infer<typeof quoteSavePayloadSchema>;

export const quoteStatusPatchSchema = z.object({
  status: quoteStatusSchema,
});
