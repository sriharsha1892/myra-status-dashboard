import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, fullWidth = false, className, ...props }, ref) => {
    const id = props.id || props.name;

    return (
      <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-gray-900"
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            'h-12 px-4 text-base text-gray-900 bg-white border-2 border-gray-300 rounded-xl transition-all',
            'placeholder:text-gray-400',
            'focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10',
            'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500',
            error
              ? 'border-red-300 focus:border-error focus:ring-error/20'
              : 'border-gray-300',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={clsx(
              'text-xs',
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

Input.displayName = 'Input';
