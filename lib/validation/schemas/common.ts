/**
 * Common Validation Schemas
 *
 * Reusable Zod schemas for common field types used across the application.
 * These schemas match the database constraints defined in the migrations.
 */

import { z } from 'zod';

/**
 * Email Validation
 * Matches database constraint: ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .regex(
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    'Email format is invalid'
  )
  .transform((email) => email.toLowerCase().trim());

/**
 * Optional Email Validation
 */
export const optionalEmailSchema = z
  .string()
  .email('Please enter a valid email address')
  .regex(
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    'Email format is invalid'
  )
  .transform((email) => email.toLowerCase().trim())
  .optional()
  .or(z.literal(''));

/**
 * Phone Number Validation
 * Supports various phone formats: (123) 456-7890, 123-456-7890, 1234567890, +1234567890
 */
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(
    /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
    'Please enter a valid phone number'
  )
  .transform((phone) => phone.trim());

/**
 * Optional Phone Number
 */
export const optionalPhoneSchema = z
  .string()
  .regex(
    /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
    'Please enter a valid phone number'
  )
  .transform((phone) => phone.trim())
  .optional()
  .or(z.literal(''));

/**
 * URL Validation
 * Validates http:// and https:// URLs
 */
export const urlSchema = z
  .string()
  .min(1, 'URL is required')
  .url('Please enter a valid URL (must start with http:// or https://)')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'URL must start with http:// or https://'
  );

/**
 * Optional URL
 */
export const optionalUrlSchema = z
  .string()
  .url('Please enter a valid URL (must start with http:// or https://)')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'URL must start with http:// or https://'
  )
  .optional()
  .or(z.literal(''));

/**
 * Non-empty String
 * Validates that string is not empty or just whitespace
 */
export const nonEmptyString = (fieldName: string) =>
  z
    .string()
    .min(1, `${fieldName} is required`)
    .refine((val) => val.trim().length > 0, `${fieldName} cannot be empty`);

/**
 * Optional Non-empty String
 * Either a non-empty string or undefined
 */
export const optionalNonEmptyString = (fieldName: string) =>
  z
    .string()
    .refine((val) => val.trim().length > 0, `${fieldName} cannot be empty`)
    .optional()
    .or(z.literal(''));

/**
 * String with Length Limits
 */
export const boundedString = (fieldName: string, min: number, max: number) =>
  z
    .string()
    .min(min, `${fieldName} must be at least ${min} characters`)
    .max(max, `${fieldName} must be at most ${max} characters`)
    .refine((val) => val.trim().length >= min, `${fieldName} cannot be just whitespace`);

/**
 * Date String Validation
 * Validates ISO date strings (YYYY-MM-DD)
 */
export const dateStringSchema = z
  .string()
  .min(1, 'Date is required')
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must be in YYYY-MM-DD format'
  )
  .refine(
    (date) => !isNaN(Date.parse(date)),
    'Please enter a valid date'
  );

/**
 * Optional Date String
 */
export const optionalDateStringSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must be in YYYY-MM-DD format'
  )
  .refine(
    (date) => !isNaN(Date.parse(date)),
    'Please enter a valid date'
  )
  .optional()
  .or(z.literal(''));

/**
 * Date Range Validation
 * Validates that end date is after start date
 */
export const dateRangeSchema = z
  .object({
    start_date: dateStringSchema,
    end_date: dateStringSchema,
  })
  .refine(
    (data) => new Date(data.end_date) >= new Date(data.start_date),
    {
      message: 'End date must be on or after start date',
      path: ['end_date'],
    }
  );

/**
 * Positive Number Validation
 */
export const positiveNumber = (fieldName: string) =>
  z
    .number({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a number`,
    })
    .positive(`${fieldName} must be greater than 0`);

/**
 * Non-negative Number Validation
 */
export const nonNegativeNumber = (fieldName: string) =>
  z
    .number({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a number`,
    })
    .nonnegative(`${fieldName} must be 0 or greater`);

/**
 * UUID Validation
 */
export const uuidSchema = z
  .string()
  .uuid('Please provide a valid UUID');

/**
 * Optional UUID
 */
export const optionalUuidSchema = z
  .string()
  .uuid('Please provide a valid UUID')
  .optional();

/**
 * Select/Dropdown Validation
 * For enum-like fields with predefined options
 */
export const selectSchema = (fieldName: string, options: readonly string[]) =>
  z
    .string()
    .min(1, `Please select a ${fieldName}`)
    .refine(
      (val) => options.includes(val),
      `Invalid ${fieldName} selection`
    );

/**
 * Optional Select
 */
export const optionalSelectSchema = (fieldName: string, options: readonly string[]) =>
  z
    .string()
    .refine(
      (val) => options.includes(val),
      `Invalid ${fieldName} selection`
    )
    .optional()
    .or(z.literal(''));
