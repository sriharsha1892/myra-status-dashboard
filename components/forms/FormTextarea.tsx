/**
 * Accessible Form Textarea Component
 *
 * Features:
 * - Built-in ARIA attributes
 * - WCAG AA compliant colors
 * - Character count (optional)
 * - Real-time validation feedback
 * - Auto-resize option
 * - Error announcements for screen readers
 */

import React, { forwardRef, useId, useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  showOptional?: boolean;
  showCharCount?: boolean;
  autoResize?: boolean;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      showOptional = true,
      showCharCount = false,
      maxLength,
      autoResize = false,
      className = '',
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const id = useId();
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const charCountId = `${id}-char-count`;
    const hasError = !!error;
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const [charCount, setCharCount] = useState(0);

    // Auto-resize functionality
    useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [value, autoResize, textareaRef]);

    // Character count
    useEffect(() => {
      if (showCharCount && typeof value === 'string') {
        setCharCount(value.length);
      }
    }, [value, showCharCount]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (showCharCount) {
        setCharCount(e.target.value.length);
      }
      if (onChange) {
        onChange(e);
      }
    };

    const describedBy = [
      hasError && error ? errorId : null,
      helperText ? helperId : null,
      showCharCount && maxLength ? charCountId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="w-full">
        {/* Label */}
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor={id}
            className="block text-sm font-medium text-neutral-700"
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

          {/* Character Count */}
          {showCharCount && maxLength && (
            <span
              id={charCountId}
              className={`text-sm ${
                charCount > maxLength
                  ? 'text-accent-600 font-medium'
                  : 'text-neutral-500'
              }`}
              aria-live="polite"
            >
              {charCount} / {maxLength}
            </span>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          id={id}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          className={`
            w-full px-3 py-2
            border rounded-lg
            text-base text-neutral-900
            placeholder:text-neutral-500
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-1
            disabled:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500
            ${autoResize ? 'resize-none overflow-hidden' : 'resize-y'}
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

FormTextarea.displayName = 'FormTextarea';
