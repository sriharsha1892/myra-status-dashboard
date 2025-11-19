/**
 * Deal Management Validation Schemas
 *
 * Zod schemas for deal tracking and status updates in the trial management system.
 * These schemas handle complex conditional validation based on deal status.
 */

import { z } from 'zod';
import { nonEmptyString } from './common';

/**
 * Deal Status Options
 */
export const DEAL_STATUSES = ['prospect', 'negotiating', 'won', 'lost', 'deferred'] as const;

/**
 * Deal Currency Options
 */
export const DEAL_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD'] as const;

/**
 * Loss Reason Options
 */
export const LOSS_REASONS = [
  'Pricing too high',
  'Missing critical features',
  'Went with competitor',
  'Budget constraints',
  'Timing not right',
  'No executive buy-in',
  'Champion left organization',
  'Poor product-market fit',
  'Implementation too complex',
  'Security/compliance concerns',
  'Other',
] as const;

/**
 * Update Deal Status Schema
 *
 * Conditional validation rules:
 * - Won deals: require deal_value
 * - Lost deals: require loss_reason, and loss_reason_other if loss_reason is 'Other'
 * - Deferred deals: require deferred_reason and expected_followup_date
 */
export const updateDealStatusSchema = z.object({
  deal_status: z.enum(DEAL_STATUSES, {
    required_error: 'Deal status is required',
    invalid_type_error: 'Invalid deal status',
  }),
  opportunity_value: z.string()
    .optional()
    .refine(
      (val) => !val || !isNaN(parseFloat(val)),
      { message: 'Opportunity value must be a valid number' }
    ),
  deal_currency: z.enum(DEAL_CURRENCIES).default('USD'),
  deal_value: z.string().optional(),
  loss_reason: z.string().optional(),
  loss_reason_other: z.string().optional(),
  deferred_reason: z.string().optional(),
  expected_followup_date: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate Won deals
  if (data.deal_status === 'won') {
    if (!data.deal_value || data.deal_value.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Deal value is required for Won deals',
        path: ['deal_value'],
      });
    } else if (isNaN(parseFloat(data.deal_value))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Deal value must be a valid number',
        path: ['deal_value'],
      });
    }
  }

  // Validate Lost deals
  if (data.deal_status === 'lost') {
    if (!data.loss_reason || data.loss_reason.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Loss reason is required for Lost deals',
        path: ['loss_reason'],
      });
    } else if (data.loss_reason === 'Other' && (!data.loss_reason_other || data.loss_reason_other.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please specify the reason for "Other"',
        path: ['loss_reason_other'],
      });
    }
  }

  // Validate Deferred deals
  if (data.deal_status === 'deferred') {
    if (!data.deferred_reason || data.deferred_reason.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason is required for Deferred deals',
        path: ['deferred_reason'],
      });
    }
    if (!data.expected_followup_date || data.expected_followup_date.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected follow-up date is required for Deferred deals',
        path: ['expected_followup_date'],
      });
    }
  }
});
