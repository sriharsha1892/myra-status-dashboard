/**
 * Engagement & Support Validation Schemas
 *
 * Zod schemas for trial engagement logging, support queries, and trial extensions.
 * These schemas handle user activity tracking and support interactions.
 */

import { z } from 'zod';
import { nonEmptyString } from './common';

/**
 * Activity Type Options
 */
export const ACTIVITY_TYPES = [
  'user_logged_in',
  'usage_observed',
  'feedback_received',
  'learning_captured',
  'follow_up_note',
  'trial_access_provided',
  'trial_access_requested',
  'trial_extended',
] as const;

/**
 * Support Query Type Options
 */
export const QUERY_TYPES = [
  'general_support',
  'security_related',
  'functionality_related',
  'onboard_more_users',
  'technical_guidance',
  'other',
] as const;

/**
 * Add Engagement Log Schema
 *
 * For logging user activity and engagement during trials
 */
export const createEngagementLogSchema = z.object({
  activity_type: z.enum(ACTIVITY_TYPES, {
    required_error: 'Activity type is required',
    invalid_type_error: 'Invalid activity type',
  }),
  user_id: nonEmptyString('User selection is required'),
  description: nonEmptyString('Description is required'),
  observations: z.string().optional(),
});

/**
 * Log Activity Schema
 *
 * Similar to engagement log but with simpler structure
 */
export const logActivitySchema = z.object({
  activity_type: nonEmptyString('Activity type is required'),
  user_id: z.string().optional(), // Optional for org-level activities
  description: z.string().optional(),
  observations: z.string().optional(),
});

/**
 * Add Support Query Schema
 *
 * For tracking support questions and requests from trial users
 */
export const createSupportQuerySchema = z.object({
  query_type: z.enum(QUERY_TYPES, {
    required_error: 'Query type is required',
    invalid_type_error: 'Invalid query type',
  }),
  title: nonEmptyString('Query title is required'),
  description: z.string().optional(),
  is_user_level: z.boolean().default(false),
  user_id: z.string().optional(),
}).superRefine((data, ctx) => {
  // If user-level query, user_id is required
  if (data.is_user_level && (!data.user_id || data.user_id.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please select a user for user-level query',
      path: ['user_id'],
    });
  }
});

/**
 * Add Trial Extension Schema
 *
 * For extending trial periods with reason tracking
 */
export const createTrialExtensionSchema = z.object({
  extend_by_days: z.number()
    .int('Days must be a whole number')
    .positive('Days must be greater than 0')
    .max(365, 'Extension cannot exceed 365 days'),
  reason: z.string().optional(),
});

/**
 * Meeting Note Schema (for use with react-hook-form)
 *
 * Complex schema for comprehensive meeting tracking
 */
export const createMeetingNoteSchema = z.object({
  org_id: nonEmptyString('Organization is required'),
  meeting_type: nonEmptyString('Meeting type is required'),
  meeting_date: nonEmptyString('Date and time are required'),
  duration_minutes: z.number().int().positive().optional().nullable(),
  conducted_by: nonEmptyString('Conducted by is required'),
  attendees: z.string().optional(),
  meeting_summary: z.string().optional(),
  pain_points_discussed: z.string().optional(),
  objections_raised: z.string().optional(),
  positive_signals: z.string().optional(),
  next_meeting_date: z.string().optional().nullable(),
});

/**
 * Meeting Types
 */
export const MEETING_TYPES = [
  'demo',
  'follow_up_call',
  'check_in',
  'technical_review',
  'executive_briefing',
  'other',
] as const;
