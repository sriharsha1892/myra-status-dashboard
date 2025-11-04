import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-md';

  const variantStyles = {
    default: 'bg-gray-50 text-gray-700 border border-gray-200',
    success: 'bg-green-50 text-green-800 border border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
    danger: 'bg-red-50 text-red-800 border border-red-200',
    info: 'bg-blue-50 text-blue-800 border border-blue-200',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
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
      return 'warning';
    case 'Medium':
      return 'info';
    case 'Low':
    default:
      return 'default';
  }
}
