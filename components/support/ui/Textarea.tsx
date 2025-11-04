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
            className="text-sm font-medium text-gray-700"
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={clsx(
            // Enterprise design: matches Input styling, resizable vertically
            'px-3 py-2 min-h-[80px] text-sm rounded-md border bg-white transition-all duration-150 ease-out appearance-none',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500',
            'resize-y',
            error
              ? 'border-red-300 focus:border-error focus:ring-error'
              : 'border-gray-300',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={clsx(
              'text-xs leading-relaxed',
              error ? 'text-error' : 'text-gray-500'
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
