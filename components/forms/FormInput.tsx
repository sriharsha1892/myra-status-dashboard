/**
 * Accessible Form Input Component
 *
 * Features:
 * - Built-in ARIA attributes
 * - WCAG AA compliant colors
 * - Real-time validation feedback
 * - Focus management
 * - Error announcements for screen readers
 */

import React, { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  showOptional?: boolean;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, required, showOptional = true, className = '', ...props }, ref) => {
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
            <span className="text-neutral-600 ml-1 font-normal">
              (optional)
            </span>
          )}
        </label>

        {/* Input */}
        <input
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
            w-full px-3 py-2
            border rounded-lg
            text-base text-neutral-900
            placeholder:text-neutral-600
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-1
            disabled:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-600
            ${
              hasError
                ? 'border-accent-600 focus:border-accent-600 focus:ring-accent-500/30'
                : 'border-neutral-300 focus:border-blue-600 focus:ring-blue-500/30'
            }
            ${className}
          `}
          {...props}
        />

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

FormInput.displayName = 'FormInput';
