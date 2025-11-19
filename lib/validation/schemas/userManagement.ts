/**
 * User Management Validation Schemas
 *
 * Zod schemas for user management forms including:
 * - Platform user creation (trial_users table)
 * - Trial user creation
 * - Password management and validation
 *
 * Matches database constraints and business rules
 */

import { z } from 'zod';
import {
  nonEmptyString,
  emailSchema,
  optionalPhoneSchema,
  uuidSchema,
  optionalUuidSchema,
  selectSchema,
  optionalNonEmptyString,
} from './common';

/**
 * User Journey Stages
 * Represents where a user is in their trial journey
 */
export const USER_JOURNEY_STAGES = [
  'invited',
  'onboarding',
  'exploring',
  'building',
  'testing',
  'integrating',
  'pilot',
  'evaluating',
  'production_ready',
  'blocked',
  'stalled',
  'inactive',
] as const;

export type UserJourneyStage = typeof USER_JOURNEY_STAGES[number];

/**
 * Password Mode Options
 * For password management modal
 */
export const PASSWORD_MODES = ['set', 'generate'] as const;

export type PasswordMode = typeof PASSWORD_MODES[number];

/**
 * Password Strength Validation Schema
 * Requirements match lib/auth/password.ts validatePasswordStrength():
 * - At least 8 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 number (0-9)
 * - At least 1 special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    'Password must contain at least one special character (!@#$%^&* etc)'
  );

/**
 * Set User Password Schema
 * Used in SetUserPasswordModal for setting/resetting passwords
 */
export const setUserPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    mode: z.enum(PASSWORD_MODES).default('set'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SetUserPasswordInput = z.infer<typeof setUserPasswordSchema>;

/**
 * Platform User Creation Schema
 * Used in AddPlatformUserModal
 * Creates users in trial_users table with full journey tracking
 */
export const createPlatformUserSchema = z.object({
  // Required fields
  name: nonEmptyString('Name')
    .max(255, 'Name must be less than 255 characters')
    .transform((val) => val.trim()),

  email: emailSchema,

  current_stage: selectSchema('current stage', USER_JOURNEY_STAGES),

  account_manager_id: uuidSchema.refine(
    (val) => val.length > 0,
    'Please select an account manager'
  ),

  // Optional fields
  role: z
    .string()
    .max(100, 'Role must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  phone: optionalPhoneSchema,

  salesforce_id: z
    .string()
    .max(100, 'Salesforce ID must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  sales_poc_id: optionalUuidSchema,
});

export type CreatePlatformUserInput = z.infer<typeof createPlatformUserSchema>;

/**
 * Trial User Creation Schema
 * Used in AddTrialUserModal
 * Simpler version for trial-specific users
 */
export const createTrialUserSchema = z.object({
  // Required fields
  full_name: nonEmptyString('Full name')
    .max(255, 'Full name must be less than 255 characters')
    .transform((val) => val.trim()),

  email: emailSchema,

  // Optional fields
  designation: z
    .string()
    .max(100, 'Designation must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  salesforce_id: z
    .string()
    .max(100, 'Salesforce ID must be less than 100 characters')
    .optional()
    .or(z.literal('')),
});

export type CreateTrialUserInput = z.infer<typeof createTrialUserSchema>;

/**
 * Update Platform User Schema
 * For editing existing platform users
 * All fields are optional (partial updates)
 */
export const updatePlatformUserSchema = createPlatformUserSchema.partial();

export type UpdatePlatformUserInput = z.infer<typeof updatePlatformUserSchema>;

/**
 * Update Trial User Schema
 * For editing existing trial users
 * All fields are optional (partial updates)
 */
export const updateTrialUserSchema = createTrialUserSchema.partial();

export type UpdateTrialUserInput = z.infer<typeof updateTrialUserSchema>;

/**
 * User Bulk Operations Schema
 * For bulk updating user stages or other properties
 */
export const bulkUserStageSchema = z.object({
  user_ids: z
    .array(uuidSchema)
    .min(1, 'Please select at least one user'),

  current_stage: selectSchema('current stage', USER_JOURNEY_STAGES),
});

export type BulkUserStageInput = z.infer<typeof bulkUserStageSchema>;

/**
 * User Search/Filter Schema
 * For validating search and filter inputs on user lists
 */
export const userFilterSchema = z.object({
  search_query: z.string().max(255, 'Search query too long').optional(),

  stage_filter: z
    .enum([...USER_JOURNEY_STAGES, 'all'])
    .default('all')
    .optional(),

  account_manager_filter: z.string().uuid().or(z.literal('all')).optional(),

  org_id: optionalUuidSchema,
});

export type UserFilterInput = z.infer<typeof userFilterSchema>;
