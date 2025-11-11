import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  // Asana-inspired: subtle, refined badges with proper contrast
  const baseStyles = 'inline-flex items-center font-medium transition-colors duration-200';

  // New design system colors - sophisticated, not garish
  const variantStyles = {
    // Neutral gray for default states
    default: 'bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-md',

    // Soft teal for success (not bright green)
    success: 'bg-success-50 text-success-700 border border-success-200 rounded-md',

    // Muted amber for warnings
    warning: 'bg-warning-50 text-yellow-800 border border-yellow-200 rounded-md',

    // Clean red for danger
    danger: 'bg-red-50 text-red-700 border border-red-200 rounded-md',

    // Minimal blue for info (not primary)
    info: 'bg-blue-50 text-blue-700 border border-blue-200 rounded-md',

    // Warm coral accent
    accent: 'bg-accent-50 text-accent-700 border border-accent-200 rounded-md',
  };

  // Comfortable sizing - not cramped
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs leading-4',
    md: 'px-2.5 py-1 text-sm leading-5',
  };

  return (
    <span className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}>
      {children}
    </span>
  );
}

// Utility function to get badge variant based on ticket status
export function getStatusBadgeVariant(status: string): BadgeProps['variant'] {
  switch (status) {
    case 'Resolved':
    case 'Closed':
      return 'success';
    case 'In Progress':
      return 'info';
    case 'Waiting on User':
      return 'warning';
    case 'New':
    default:
      return 'default';
  }
}

// Utility function to get badge variant based on priority
export function getPriorityBadgeVariant(priority: string): BadgeProps['variant'] {
  switch (priority) {
    case 'Critical':
      return 'danger';
    case 'High':
      return 'accent'; // Use warm coral for high priority
    case 'Medium':
      return 'info';
    case 'Low':
    default:
      return 'default';
  }
}
