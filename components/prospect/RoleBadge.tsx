'use client';

import React from 'react';
import {
  Crown,
  Shield,
  AlertTriangle,
  Search,
  Users,
  User,
  CreditCard,
  Star,
} from 'lucide-react';
import { ContactRole, ROLE_CONFIG } from '@/lib/types/contact';

const ROLE_ICONS: Record<ContactRole, React.ElementType> = {
  champion: Crown,
  decision_maker: Shield,
  blocker: AlertTriangle,
  evaluator: Search,
  influencer: Users,
  user: User,
  billing: CreditCard,
  executive_sponsor: Star,
};

interface RoleBadgeProps {
  role: ContactRole;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function RoleBadge({
  role,
  size = 'sm',
  showLabel = false,
  showTooltip = true,
  className = '',
}: RoleBadgeProps) {
  const config = ROLE_CONFIG[role];
  const Icon = ROLE_ICONS[role];

  const sizeClasses = {
    sm: 'h-5 px-1.5 text-xs gap-1',
    md: 'h-6 px-2 text-sm gap-1.5',
    lg: 'h-7 px-2.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bgColor} ${config.color} ${config.borderColor} border
        ${sizeClasses[size]}
        ${className}
      `}
      title={showTooltip ? config.description : undefined}
    >
      <Icon size={iconSizes[size]} className="flex-shrink-0" />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

interface RoleBadgeStackProps {
  roles: ContactRole[];
  maxVisible?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function RoleBadgeStack({
  roles,
  maxVisible = 3,
  size = 'sm',
  className = '',
}: RoleBadgeStackProps) {
  const uniqueRoles = [...new Set(roles)];
  const visibleRoles = uniqueRoles.slice(0, maxVisible);
  const hiddenCount = uniqueRoles.length - maxVisible;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {visibleRoles.map((role) => (
        <RoleBadge key={role} role={role} size={size} />
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-gray-500 font-medium">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

// Role priority for sorting (higher priority = more important to show)
export const ROLE_PRIORITY: Record<ContactRole, number> = {
  champion: 10,
  decision_maker: 9,
  executive_sponsor: 8,
  blocker: 7,
  evaluator: 6,
  influencer: 5,
  billing: 3,
  user: 1,
};

export function sortRolesByPriority(roles: ContactRole[]): ContactRole[] {
  return [...roles].sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a]);
}
