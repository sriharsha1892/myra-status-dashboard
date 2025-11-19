/**
 * Trial Management Validation Schemas
 *
 * Zod schemas for trial management forms including:
 * - Feature request submission
 * - Follow-up scheduling
 * - Topic/use case tracking
 * - Trial handoff between account managers
 *
 * Matches database constraints and business rules
 */

import { z } from 'zod';
import {
  nonEmptyString,
  emailSchema,
  optionalNonEmptyString,
} from './common';

/**
 * Feature Request Priority Levels
 * Indicates urgency and importance of the request
 */
export const FEATURE_REQUEST_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export type FeatureRequestPriority = typeof FEATURE_REQUEST_PRIORITIES[number];

/**
 * Follow-up Status Options
 * Tracks the state of scheduled follow-ups
 */
export const FOLLOWUP_STATUSES = ['scheduled', 'pending', 'completed', 'cancelled'] as const;

export type FollowupStatus = typeof FOLLOWUP_STATUSES[number];

/**
 * Topic/Use Case Status Options
 * Tracks progress on specific features or use cases
 */
export const TOPIC_STATUSES = [
  'exploring',
  'implementing',
  'implemented',
  'blocked',
  'abandoned',
] as const;

export type TopicStatus = typeof TOPIC_STATUSES[number];

/**
 * Topic Priority Levels
 * Indicates importance of the topic to the customer
 */
export const TOPIC_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

export type TopicPriority = typeof TOPIC_PRIORITIES[number];

/**
 * Feature Request Schema
 * For customer feature requests and product feedback
 */
export const createFeatureRequestSchema = z.object({
  title: nonEmptyString('Title is required'),
  description: nonEmptyString('Description is required'),
  use_case: z.string().optional(),
  priority: z.enum(FEATURE_REQUEST_PRIORITIES, {
    required_error: 'Priority is required',
    invalid_type_error: 'Invalid priority level',
  }),
});

export type CreateFeatureRequest = z.infer<typeof createFeatureRequestSchema>;

/**
 * Follow-up Schema
 * For scheduling and tracking customer follow-ups
 */
export const createFollowupSchema = z.object({
  title: nonEmptyString('Title is required'),
  description: z.string().optional(),
  followup_date: z.string().min(1, 'Follow-up date is required').refine(
    (date) => {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      return dateRegex.test(date);
    },
    {
      message: 'Invalid date format. Expected YYYY-MM-DD',
    }
  ),
  followup_time: z.string().optional().refine(
    (time) => {
      if (!time) return true;
      // Validate time format (HH:MM)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      return timeRegex.test(time);
    },
    {
      message: 'Invalid time format. Expected HH:MM',
    }
  ),
  followup_type: z.string().optional(),
  assigned_to: z.string().optional(),
  status: z.enum(FOLLOWUP_STATUSES, {
    required_error: 'Status is required',
    invalid_type_error: 'Invalid status',
  }),
});

export type CreateFollowup = z.infer<typeof createFollowupSchema>;

/**
 * Topic/Use Case Schema
 * For tracking specific features or use cases being explored
 */
export const createTopicSchema = z.object({
  topic_name: nonEmptyString('Topic name is required'),
  description: z.string().optional(),
  status: z.enum(TOPIC_STATUSES, {
    required_error: 'Status is required',
    invalid_type_error: 'Invalid status',
  }),
  priority: z.enum(TOPIC_PRIORITIES, {
    required_error: 'Priority is required',
    invalid_type_error: 'Invalid priority level',
  }),
});

export type CreateTopic = z.infer<typeof createTopicSchema>;

/**
 * Trial Handoff Schema
 * For transferring trial ownership between account managers
 */
export const trialHandoffSchema = z.object({
  new_account_manager: emailSchema,
  handoff_reason: nonEmptyString('Handoff reason is required'),
  context_notes: z.string().optional(),
});

export type TrialHandoff = z.infer<typeof trialHandoffSchema>;

/**
 * Field-specific validation messages
 * Provides helpful feedback for form validation errors
 */
export const VALIDATION_MESSAGES = {
  featureRequest: {
    title: {
      required: 'Please provide a title for your feature request',
      minLength: 'Title must be at least 3 characters',
    },
    description: {
      required: 'Please describe the feature you would like to see',
      minLength: 'Description must be at least 10 characters',
    },
    useCase: {
      placeholder: 'How would this feature help your organization?',
    },
    priority: {
      required: 'Please select a priority level',
    },
  },
  followup: {
    title: {
      required: 'Please provide a title for the follow-up',
    },
    followupDate: {
      required: 'Please select a follow-up date',
      invalid: 'Invalid date format',
    },
    followupTime: {
      invalid: 'Invalid time format (use HH:MM)',
    },
  },
  topic: {
    topicName: {
      required: 'Please provide a name for the topic',
    },
    status: {
      required: 'Please select a status',
    },
    priority: {
      required: 'Please select a priority',
    },
  },
  handoff: {
    newAccountManager: {
      required: 'Please select the new account manager',
      invalid: 'Please provide a valid email address',
    },
    handoffReason: {
      required: 'Please explain why you are handing off this trial',
    },
  },
};
