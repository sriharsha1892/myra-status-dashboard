import React from 'react';
import { clsx } from 'clsx';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, fullWidth = false, options, className, ...props }, ref) => {
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
        <select
          ref={ref}
          id={id}
          className={clsx(
            // Asana-inspired: clean, minimal, comfortable
            'h-10 px-3 text-sm text-neutral-900 bg-white border border-neutral-300 rounded-lg',
            // Focus state with accent color
            'focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20',
            // Transitions
            'transition-all duration-200',
            // Disabled state
            'disabled:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-500',
            // Custom select arrow
            'appearance-none bg-no-repeat bg-right pr-10',
            // Error state
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-neutral-300',
            className
          )}
          style={{
            // Updated arrow color to match neutral palette
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundSize: '1.5em 1.5em',
          }}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';
