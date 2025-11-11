import React from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, fullWidth = false, className, ...props }, ref) => {
    const id = props.id || props.name;

    return (
      <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-neutral-900"
          >
            {label}
            {props.required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={clsx(
            // Asana-inspired: clean, minimal, comfortable
            'px-3 py-2 min-h-[80px] text-sm text-neutral-900 bg-white border border-neutral-300 rounded-lg',
            'placeholder:text-neutral-400',
            // Focus state with accent color
            'focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20',
            // Transitions
            'transition-all duration-200',
            // Disabled state
            'disabled:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-500',
            // Vertical resize only
            'resize-y',
            // Error state
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-neutral-300',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={clsx(
              'text-xs',
              error ? 'text-red-600' : 'text-neutral-500'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
