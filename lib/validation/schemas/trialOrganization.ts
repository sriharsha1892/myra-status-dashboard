/**
 * Trial Organization Validation Schemas
 *
 * Zod schemas for trial organization forms including:
 * - Create organization form
 * - Bulk operations (account manager, trial dates, stage)
 *
 * Matches database constraints in trial_organizations table
 */

import { z } from 'zod';
import {
  nonEmptyString,
  optionalUrlSchema,
  uuidSchema,
  optionalUuidSchema,
  selectSchema,
  dateStringSchema,
  optionalDateStringSchema,
} from './common';

/**
 * Domain Options
 * TMT = Technology, Media & Telecommunications
 * NEO = New & Emerging Opportunities
 * AF&B = Aerospace, Food & Beverage
 * E&C = Energy & Construction
 * HC = Healthcare
 * AAD = Automotive & Advanced Materials
 */
export const TRIAL_DOMAINS = [
  'TMT',
  'NEO',
  'AF&B',
  'E&C',
  'HC',
  'AAD',
  'Unassigned',
] as const;

/**
 * Parent Company Options
 */
export const PARENT_COMPANIES = ['Mordor Intelligence', 'GMI'] as const;

/**
 * Trial Organization Lifecycle Stages
 */
export const ORG_LIFECYCLE_STAGES = [
  'prospect',
  'qualified',
  'active_trial',
  'closed_won',
  'closed_lost',
  'nurturing',
] as const;

/**
 * Trial Status Options
 */
export const TRIAL_STATUSES = [
  'requested',
  'approved',
  'active',
  'extended',
  'expired',
  'converted',
  'cancelled',
] as const;

/**
 * Create Trial Organization Schema
 * Used in CreateOrganizationModal
 */
export const createTrialOrganizationSchema = z.object({
  // Required fields
  org_name: nonEmptyString('Organization name')
    .max(255, 'Organization name must be less than 255 characters'),

  sales_poc_id: uuidSchema.refine(
    (val) => val.length > 0,
    'Please select a Sales POC'
  ),

  org_domain: selectSchema('domain', TRIAL_DOMAINS),

  parent_company: selectSchema('parent company', PARENT_COMPANIES),

  // Optional fields
  org_url: optionalUrlSchema,

  logo_url: optionalUrlSchema,

  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional()
    .or(z.literal('')),

  // Auto-assigned but validated
  account_manager_id: optionalUuidSchema,
});

export type CreateTrialOrganizationInput = z.infer<
  typeof createTrialOrganizationSchema
>;

/**
 * Update Trial Organization Schema
 * Used in edit organization modals
 * Similar to create but allows partial updates
 */
export const updateTrialOrganizationSchema = createTrialOrganizationSchema.partial();

export type UpdateTrialOrganizationInput = z.infer<
  typeof updateTrialOrganizationSchema
>;

/**
 * Bulk Account Manager Update Schema
 * For bulk assigning account managers to multiple organizations
 */
export const bulkAccountManagerSchema = z.object({
  organization_ids: z
    .array(uuidSchema)
    .min(1, 'Please select at least one organization'),

  account_manager_id: uuidSchema.refine(
    (val) => val.length > 0,
    'Please select an account manager'
  ),

  // Optional: for custom "Other" account manager entry
  account_manager_other: z
    .string()
    .max(255, 'Name must be less than 255 characters')
    .optional()
    .or(z.literal('')),
});

export type BulkAccountManagerInput = z.infer<typeof bulkAccountManagerSchema>;

/**
 * Bulk Trial Dates Update Schema
 * For bulk updating trial start/end dates
 */
export const bulkTrialDatesSchema = z
  .object({
    organization_ids: z
      .array(uuidSchema)
      .min(1, 'Please select at least one organization'),

    trial_start_date: optionalDateStringSchema,

    trial_end_date: optionalDateStringSchema,

    only_update_missing_dates: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // If both dates are provided, end must be after start
      if (data.trial_start_date && data.trial_end_date) {
        return new Date(data.trial_end_date) >= new Date(data.trial_start_date);
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['trial_end_date'],
    }
  )
  .refine(
    (data) => {
      // At least one date must be provided
      return data.trial_start_date || data.trial_end_date;
    },
    {
      message: 'Please provide at least one date (start or end)',
      path: ['trial_start_date'],
    }
  );

export type BulkTrialDatesInput = z.infer<typeof bulkTrialDatesSchema>;

/**
 * Bulk Stage Update Schema
 * For bulk updating organization lifecycle stage
 */
export const bulkStageUpdateSchema = z.object({
  organization_ids: z
    .array(uuidSchema)
    .min(1, 'Please select at least one organization'),

  org_lifecycle_stage: selectSchema('lifecycle stage', ORG_LIFECYCLE_STAGES),
});

export type BulkStageUpdateInput = z.infer<typeof bulkStageUpdateSchema>;

/**
 * Bulk Trial Status Update Schema
 * For bulk updating trial status
 */
export const bulkTrialStatusSchema = z.object({
  organization_ids: z
    .array(uuidSchema)
    .min(1, 'Please select at least one organization'),

  trial_status: selectSchema('trial status', TRIAL_STATUSES),
});

export type BulkTrialStatusInput = z.infer<typeof bulkTrialStatusSchema>;

/**
 * Organization Search/Filter Schema
 * For validating search and filter inputs
 */
export const trialOrganizationFilterSchema = z.object({
  search_query: z.string().max(255, 'Search query too long').optional(),

  domain_filter: z
    .enum([...TRIAL_DOMAINS, 'all'])
    .default('all')
    .optional(),

  stage_filter: z
    .enum([...ORG_LIFECYCLE_STAGES, 'all'])
    .default('all')
    .optional(),

  status_filter: z
    .enum([...TRIAL_STATUSES, 'all'])
    .default('all')
    .optional(),

  account_manager_filter: z.string().uuid().or(z.literal('all')).optional(),
});

export type TrialOrganizationFilterInput = z.infer<
  typeof trialOrganizationFilterSchema
>;
