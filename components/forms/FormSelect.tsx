/**
 * Accessible Form Select Component
 *
 * Features:
 * - Built-in ARIA attributes
 * - WCAG AA compliant colors
 * - Real-time validation feedback
 * - Keyboard navigation support
 * - Error announcements for screen readers
 * - Support for placeholder option
 */

import React, { forwardRef, useId } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  required?: boolean;
  showOptional?: boolean;
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      required,
      showOptional = true,
      placeholder,
      className = '',
      ...props
    },
    ref
  ) => {
    const id = useId();
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const hasError = !!error;

    return (
      <div className="w-full">
        {/* Label */}
        <label
          htmlFor={id}
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {label}
          {required && (
            <span className="text-accent-600 ml-1" aria-label="required">
              *
            </span>
          )}
          {!required && showOptional && (
            <span className="text-neutral-500 ml-1 font-normal">
              (optional)
            </span>
          )}
        </label>

        {/* Select Container with Custom Chevron */}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-required={required}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? error
                  ? `${errorId} ${helperText ? helperId : ''}`
                  : helperText
                  ? helperId
                  : undefined
                : helperText
                ? helperId
                : undefined
            }
            className={`
              w-full px-3 py-2 pr-10
              border rounded-lg
              text-base text-neutral-900
              bg-white
              appearance-none
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-1
              disabled:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500
              ${
                hasError
                  ? 'border-accent-600 focus:border-accent-600 focus:ring-accent-500/30'
                  : 'border-neutral-300 focus:border-blue-600 focus:ring-blue-500/30'
              }
              ${className}
            `}
            {...props}
          >
            {/* Placeholder Option */}
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}

            {/* Options */}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom Chevron Icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown
              className={`w-4 h-4 ${
                hasError ? 'text-accent-600' : 'text-neutral-500'
              }`}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Helper Text */}
        {helperText && !hasError && (
          <p
            id={helperId}
            className="mt-1.5 text-sm text-neutral-600"
          >
            {helperText}
          </p>
        )}

        {/* Error Message */}
        {hasError && error && (
          <div
            id={errorId}
            role="alert"
            aria-live="polite"
            className="mt-1.5 flex items-start gap-1.5"
          >
            <AlertCircle className="w-4 h-4 text-accent-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-sm text-accent-700">
              {error}
            </span>
          </div>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';
