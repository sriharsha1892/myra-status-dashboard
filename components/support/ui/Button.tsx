import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  // Asana-inspired base styles: clean, minimal, with proper transitions
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  // New design system variants - NO gradients, clean aesthetics
  const variantStyles = {
    // Warm coral primary (replaces blue-violet gradient)
    primary: 'bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white shadow-sm hover:shadow-md rounded-lg border border-accent-600',

    // Clean secondary with glassmorphism hint
    secondary: 'bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 hover:text-neutral-900 shadow-xs hover:shadow-sm rounded-lg',

    // Danger state - no gradients, clean red
    danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-sm hover:shadow-md rounded-lg border border-red-600',

    // Ghost button - minimal, contextual
    ghost: 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg',

    // Glassmorphism button - signature style
    glass: 'bg-white/70 backdrop-blur-md backdrop-saturate-180 border border-neutral-200/80 text-neutral-900 hover:bg-white/90 hover:border-neutral-300 shadow-glass hover:shadow-glass-lg rounded-lg',
  };

  // Asana-inspired sizing: comfortable, not cramped
  const sizeStyles = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-base',
  };

  // Hover lift effect for primary and glass variants
  const hoverLift = (variant === 'primary' || variant === 'glass' || variant === 'danger')
    ? 'hover:-translate-y-[1px]'
    : '';

  return (
    <button
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        hoverLift,
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
